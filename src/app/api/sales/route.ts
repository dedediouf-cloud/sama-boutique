import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getPaymentProvider } from "@/lib/payments";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const sales = await prisma.sale.findMany({
    where: { userId: ownerId },
    include: {
      items: { include: { product: true } },
      customer: true,
      transactions: true,
      delivery: true,
      promotion: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sales);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "seller") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const { items, customerId, paymentMethod, paymentPhone, promotionId } = await request.json();
    const ownerId = user.ownerId || user.id;
    const method = paymentMethod || "cash";

    // ... (tout le code POST que tu as déjà, sans aucune fonction DELETE)
    // (je te donne la version propre ci-dessous si besoin)

    // [Colle ici ton code POST actuel - il ne doit pas y avoir de "export async function DELETE" dans ce fichier]
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la création de la vente" }, { status: 500 });
  }
}