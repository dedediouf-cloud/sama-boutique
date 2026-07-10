import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const ownerId = user.ownerId || user.id;

  try {
    const product = await prisma.product.findFirst({
      where: { id, userId: ownerId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    const entries = await prisma.stockEntry.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}
