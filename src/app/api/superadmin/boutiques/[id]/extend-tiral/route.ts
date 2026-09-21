import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { invalidateAccess } from "@/lib/access";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/superadmin/boutiques/[id]/extend-trial
 * Prolonge l'essai gratuit d'une boutique : { days: 15 }
 * Les rappels email sont réarmés pour que les relances repartent.
 */
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
    const days = parseInt(body?.days, 10);

    if (!days || days <= 0 || days > 365) {
      return NextResponse.json(
        { error: "Nombre de jours invalide (entre 1 et 365)" },
        { status: 400 }
      );
    }

    const boutique = await prisma.user.findUnique({ where: { id } });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique non trouvée" }, { status: 404 });
    }

    if (boutique.subscriptionStatus === "paid") {
      return NextResponse.json(
        {
          error:
            "Cette boutique a un abonnement payé : utilisez « Payer » pour prolonger sa période.",
        },
        { status: 400 }
      );
    }

    // On ajoute les jours à partir de la fin d'essai actuelle si elle est
    // encore dans le futur, sinon à partir de maintenant.
    const now = Date.now();
    const currentEnd = boutique.trialEndsAt
      ? new Date(boutique.trialEndsAt).getTime()
      : 0;
    const base = currentEnd > now ? currentEnd : now;

    const trialEndsAt = new Date(base + days * DAY_MS);
    trialEndsAt.setUTCHours(23, 59, 59, 999);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        trialEndsAt,
        trialUsed: true,
        subscriptionStatus: boutique.subscriptionStatus === "paid" ? "paid" : "trial",
        subscriptionDueDate: trialEndsAt,
      },
    });

    // Les rappels J-5 / J-1 / J-0 pourront repartir pour ce nouvel essai
    await prisma.trialReminder.deleteMany({ where: { userId: id } });

    // Vide le cache d'accès (60 s) pour que l'effet soit immédiat
    invalidateAccess(id);

    return NextResponse.json({
      message: `Essai prolongé de ${days} jours — « ${boutique.shopName} » jusqu'au ${trialEndsAt.toLocaleDateString(
        "fr-FR"
      )}`,
      boutique: {
        id: updated.id,
        trialEndsAt: updated.trialEndsAt,
        subscriptionDueDate: updated.subscriptionDueDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
