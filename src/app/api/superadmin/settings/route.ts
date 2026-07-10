import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({ data: { id: "default" } });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { annualSubscriptionDiscount, referralRewardMonths, defaultMonthlyAmount } = body;

    const settings = await prisma.globalSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        annualSubscriptionDiscount: parseFloat(annualSubscriptionDiscount) || 0,
        referralRewardMonths: parseInt(referralRewardMonths) || 1,
        defaultMonthlyAmount: parseFloat(defaultMonthlyAmount) || 10000,
      },
      update: {
        annualSubscriptionDiscount: parseFloat(annualSubscriptionDiscount) || 0,
        referralRewardMonths: parseInt(referralRewardMonths) || 1,
        defaultMonthlyAmount: parseFloat(defaultMonthlyAmount) || 10000,
      },
    });

    return NextResponse.json({ message: "Paramètres mis à jour", settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
