import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { getNextDueDate, addMonths, getAnnualAmount } from "@/lib/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { promotionId } = body;

    const boutique = await prisma.user.findUnique({ where: { id } });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique non trouvée" }, { status: 404 });
    }

    let settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({ data: { id: "default" } });
    }

    let promotion = null;
    if (promotionId) {
      promotion = await prisma.subscriptionPromotion.findFirst({
        where: { id: promotionId, active: true },
      });
    }

    const interval = boutique.billingInterval === "annual" ? "annual" : "monthly";
    const now = new Date();

    // Montant de base selon l'intervalle
    let baseAmount = boutique.subscriptionAmount || 0;
    if (interval === "annual") {
      baseAmount = getAnnualAmount(baseAmount, settings.annualSubscriptionDiscount);
    }

    // Remise promotionnelle
    let discount = 0;
    let extraMonths = 0;
    if (promotion) {
      if (promotion.discountPercent) {
        discount = (baseAmount * promotion.discountPercent) / 100;
      } else if (promotion.discountAmount) {
        discount = Math.min(baseAmount, promotion.discountAmount);
      }
      extraMonths = promotion.monthsFree || 0;
    }

    const finalAmount = Math.max(0, baseAmount - discount);

    // Calcul de la prochaine échéance
    const reference = boutique.subscriptionDueDate && new Date(boutique.subscriptionDueDate) > now
      ? new Date(boutique.subscriptionDueDate)
      : now;
    let nextDueDate = getNextDueDate(reference, interval);
    for (let i = 0; i < extraMonths; i++) {
      nextDueDate = addMonths(nextDueDate, 1);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        subscriptionStatus: "paid",
        subscriptionDueDate: nextDueDate,
        lastPaidAt: now,
        isBlocked: false,
      },
    });

    await prisma.subscriptionPayment.create({
      data: {
        userId: id,
        amount: baseAmount,
        discount,
        finalAmount,
        promotionId: promotion?.id || null,
        promotionName: promotion?.name || null,
        periodStart: now,
        periodEnd: nextDueDate,
      },
    });

    // Récompense de parrainage si abonnement annuel et non encore récompensé
    if (interval === "annual" && boutique.referredById) {
      const existingReward = await prisma.referralReward.findFirst({
        where: { referredId: id },
      });
      if (!existingReward) {
        const referrer = await prisma.user.findUnique({ where: { id: boutique.referredById } });
        if (referrer) {
          const currentDue = referrer.subscriptionDueDate || new Date();
          const newDue = addMonths(currentDue, settings.referralRewardMonths);
          await prisma.user.update({
            where: { id: referrer.id },
            data: { subscriptionDueDate: newDue },
          });
          await prisma.referralReward.create({
            data: {
              referrerId: referrer.id,
              referredId: id,
              monthsGranted: settings.referralRewardMonths,
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `Abonnement ${interval === "annual" ? "annuel" : "mensuel"} payé : ${finalAmount.toLocaleString("fr-FR")} FCFA jusqu'au ${nextDueDate.toLocaleDateString("fr-FR")}`,
      boutique: {
        id: updated.id,
        subscriptionStatus: updated.subscriptionStatus,
        subscriptionDueDate: updated.subscriptionDueDate,
        lastPaidAt: updated.lastPaidAt,
        isBlocked: updated.isBlocked,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
