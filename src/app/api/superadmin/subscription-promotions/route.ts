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

  const promotions = await prisma.subscriptionPromotion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, code, discountPercent, discountAmount, monthsFree } = body;

    if (!name) {
      return NextResponse.json({ error: "Nom de la promotion requis" }, { status: 400 });
    }

    const promotion = await prisma.subscriptionPromotion.create({
      data: {
        name,
        code: code || null,
        discountPercent: discountPercent ? parseInt(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        monthsFree: parseInt(monthsFree || "0") || 0,
      },
    });

    return NextResponse.json({ message: "Promotion créée", promotion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
