import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { inventoryCounts: true },
      },
    },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  try {
    const body = await req.json();
    const { productId, countedQty, note } = body;

    if (!productId || countedQty === undefined || countedQty < 0) {
      return NextResponse.json(
        { error: "Produit et quantité comptée obligatoires" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: ownerId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    const systemQty = product.quantity;
    const difference = countedQty - systemQty;

    await prisma.$transaction([
      prisma.inventoryCount.create({
        data: {
          productId,
          userId: ownerId,
          countedQty,
          systemQty,
          difference,
          note: note || null,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { quantity: countedQty },
      }),
    ]);

    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    return NextResponse.json({
      message: "Inventaire enregistré",
      product: updatedProduct,
      count: {
        systemQty,
        countedQty,
        difference,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
