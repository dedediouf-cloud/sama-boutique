import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isSuperAdmin } from "@/lib/roles";
import { getNextDueDate } from "@/lib/subscription";

function generateReferralCode(base: string) {
  const clean = base
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${clean}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const boutiques = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      shopName: true,
      shopSlug: true,
      phone: true,
      isBlocked: true,
      subscriptionAmount: true,
      subscriptionStatus: true,
      subscriptionDueDate: true,
      lastPaidAt: true,
      billingInterval: true,
      referralCode: true,
      referredById: true,
      createdAt: true,
      _count: {
        select: {
          products: true,
          customers: true,
          sales: true,
          referralsMade: true,
          referralRewards: true,
        },
      },
    },
  });

  return NextResponse.json(boutiques);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, shopName, shopSlug, phone, subscriptionAmount, billingInterval } = body;

    if (!email || !password || !shopName || !shopSlug) {
      return NextResponse.json(
        { error: "Email, mot de passe, nom de boutique et slug sont obligatoires" },
        { status: 400 }
      );
    }

    if (shopSlug.toLowerCase() === "superadmin") {
      return NextResponse.json(
        { error: "Ce slug est réservé" },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    const existingSlug = await prisma.user.findUnique({ where: { shopSlug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const interval: "monthly" | "annual" = billingInterval === "annual" ? "annual" : "monthly";
    const dueDate = getNextDueDate(new Date(), interval);

    let referralCode = generateReferralCode(shopSlug);
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode(shopSlug);
    }

    const user = await prisma.user.create({
      data: {
        name: name || shopName,
        email,
        password: hashedPassword,
        shopName,
        shopSlug: shopSlug.toLowerCase().replace(/\s+/g, "-"),
        phone,
        subscriptionAmount: parseFloat(subscriptionAmount) || 0,
        subscriptionStatus: "pending",
        subscriptionDueDate: dueDate,
        billingInterval: interval,
        referralCode,
      },
    });

    return NextResponse.json({
      message: "Boutique créée",
      boutique: {
        id: user.id,
        email: user.email,
        shopSlug: user.shopSlug,
        subscriptionAmount: user.subscriptionAmount,
        subscriptionDueDate: user.subscriptionDueDate,
        billingInterval: user.billingInterval,
        referralCode: user.referralCode,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
