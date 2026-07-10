import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getNextDueDate, addMonths } from "@/lib/subscription";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateReferralCode(base: string) {
  return `${slugify(base)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

export async function POST(request: Request) {
  try {
    const { name, email, password, shopName, phone, referralCode, billingInterval } = await request.json();

    if (!email || !password || !shopName) {
      return NextResponse.json(
        { error: "Email, mot de passe et nom de boutique obligatoires" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
    }

    let shopSlug = slugify(shopName);
    if (shopSlug === "superadmin") {
      return NextResponse.json({ error: "Ce nom de boutique est réservé" }, { status: 400 });
    }
    const existingSlug = await prisma.user.findUnique({ where: { shopSlug } });
    if (existingSlug) {
      shopSlug = `${shopSlug}-${Date.now()}`;
    }

    // Paramètres globaux
    let settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: { id: "default" },
      });
    }

    const interval: "monthly" | "annual" = billingInterval === "annual" ? "annual" : "monthly";
    const now = new Date();
    const dueDate = getNextDueDate(now, interval);

    const hashedPassword = await bcrypt.hash(password, 10);

    let referralCodeStr = generateReferralCode(shopSlug);
    // S'assurer que le code est unique
    while (await prisma.user.findUnique({ where: { referralCode: referralCodeStr } })) {
      referralCodeStr = generateReferralCode(shopSlug);
    }

    let referrerId: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        shopName,
        shopSlug,
        phone,
        subscriptionAmount: settings.defaultMonthlyAmount,
        subscriptionStatus: "pending",
        subscriptionDueDate: dueDate,
        billingInterval: interval,
        referralCode: referralCodeStr,
        referredById: referrerId || null,
      },
    });

    // Si abonnement annuel avec parrainage, offrir 1 mois gratuit au parrain
    if (interval === "annual" && referrerId) {
      const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
      if (referrer) {
        const currentDue = referrer.subscriptionDueDate || new Date();
        const newDue = addMonths(currentDue, settings.referralRewardMonths);
        await prisma.user.update({
          where: { id: referrerId },
          data: { subscriptionDueDate: newDue },
        });
        await prisma.referralReward.create({
          data: {
            referrerId,
            referredId: user.id,
            monthsGranted: settings.referralRewardMonths,
          },
        });
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        shopName: user.shopName,
        shopSlug: user.shopSlug,
        referralCode: user.referralCode,
        billingInterval: user.billingInterval,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
