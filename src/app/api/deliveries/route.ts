import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const deliveries = await prisma.delivery.findMany({
    where: { userId: ownerId },
    include: {
      sale: {
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deliveries);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  try {
    const { saleId, address, phone, notes } = await request.json();

    if (!saleId || !address) {
      return NextResponse.json({ error: "Vente et adresse obligatoires" }, { status: 400 });
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, userId: ownerId },
    });

    if (!sale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 });
    }

    const delivery = await prisma.delivery.create({
      data: {
        saleId,
        address,
        phone,
        notes,
        userId: ownerId,
      },
      include: {
        sale: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
      },
    });

    await prisma.sale.update({
      where: { id: saleId },
      data: { deliveryType: "delivery" },
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la création" }, { status: 500 });
  }
}
