import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const promotions = await prisma.promotion.findMany({
    where: { userId: ownerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(promotions);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const ownerId = user.ownerId || user.id;

    const promotion = await prisma.promotion.create({
      data: {
        ...body,
        userId: ownerId,
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la création" }, { status: 500 });
  }
}
