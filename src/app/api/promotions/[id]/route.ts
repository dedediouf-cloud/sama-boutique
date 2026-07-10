import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const ownerId = user.ownerId || user.id;

  try {
    await prisma.promotion.deleteMany({
      where: { id, userId: ownerId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la suppression" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const ownerId = user.ownerId || user.id;

  try {
    const body = await request.json();

    const promotion = await prisma.promotion.updateMany({
      where: { id, userId: ownerId },
      data: body,
    });

    return NextResponse.json(promotion);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
