import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const orders = await prisma.supplierOrder.findMany({
    where: { userId: ownerId },
    include: {
      supplier: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ownerId = user.ownerId || user.id;

  try {
    const { supplierId, items, notes } = await request.json();

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: "Fournisseur et articles obligatoires" }, { status: 400 });
    }

    const total = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);

    const order = await prisma.supplierOrder.create({
      data: {
        supplierId,
        userId: ownerId,
        total,
        notes,
        items: {
          create: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productId: item.productId || null,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la création" }, { status: 500 });
  }
}
