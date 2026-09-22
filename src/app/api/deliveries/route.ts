import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertWritable } from "@/lib/access";

/**
 * GET /api/deliveries
 *   (sans paramètre)  → 200 livraisons les plus récentes
 *   ?limit=all        → tout l'historique
 *
 * ⚡ `select` ciblé : on ne renvoie que les champs affichés (payload ÷ 10).
 */
export async function GET(request?: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  let take: number | undefined = 200;
  if (request) {
    const brutal = new URL(request.url).searchParams.get("limit");
    if (brutal === "all") take = undefined;
    else if (brutal) {
      const n = parseInt(brutal, 10);
      if (Number.isFinite(n) && n > 0) take = Math.min(n, 2000);
    }
  }

  const deliveries = await prisma.delivery.findMany({
    where: { userId: ownerId },
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      address: true,
      phone: true,
      notes: true,
      deliveryDate: true,
      createdAt: true,
      updatedAt: true,
      saleId: true,
      userId: true,
      sale: {
        select: {
          id: true,
          total: true,
          finalTotal: true,
          createdAt: true,
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(deliveries);
}

export async function POST(request: Request) {
  // Verrou essai/abonnement : modifie les données uniquement si la boutique
  // n'est pas en lecture seule (essai gratuit terminé).
  const __locked = await assertWritable();
  if (__locked) return __locked;

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
