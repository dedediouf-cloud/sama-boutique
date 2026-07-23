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

    let total = 0;
    const saleItems: { productId: string; quantity: number; price: number }[] = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, userId: ownerId },
      });
      if (!product) throw new Error("Produit introuvable");
      if (product.quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }

      total += product.price * item.quantity;
      saleItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    let discount = 0;
    let promotionIdToSet: string | null = null;

    if (promotionId) {
      const promotion = await prisma.promotion.findFirst({
        where: { id: promotionId, userId: ownerId, active: true },
      });

      if (promotion) {
        const now = new Date();
        const startDate = promotion.startDate ? new Date(promotion.startDate) : null;
        const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

        const isValid =
          (!startDate || now >= startDate) &&
          (!endDate || now <= endDate) &&
          (!promotion.minAmount || total >= promotion.minAmount);

        if (isValid) {
          promotionIdToSet = promotion.id;
          if (promotion.type === "percentage") {
            discount = total * (promotion.value / 100);
          } else if (promotion.type === "fixed_amount") {
            discount = promotion.value;
          }
          discount = Math.min(discount, total);
        }
      }
    }

    const finalTotal = total - discount;
    const earnedFidelityPoints = Math.floor(finalTotal / 1000);

    let paymentStatus = method === "cash" ? "paid" : "pending";
    let paymentRef = null;

    if (method === "orange_money" || method === "wave") {
      if (!paymentPhone) {
        throw new Error("Numéro de téléphone requis pour le paiement mobile");
      }

      const provider = getPaymentProvider(method);
      const paymentResult = await provider.initiatePayment({
        amount: finalTotal,
        phone: paymentPhone,
        reference: `SALE-${Date.now()}`,
        description: `Paiement boutique ${user.shopName}`,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.message);
      }

      paymentRef = paymentResult.transactionId || null;
    }

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          userId: ownerId,
          customerId: customerId || null,
          employeeId: user.role !== "admin" ? user.id : null,
          total,
          discount,
          finalTotal,
          paymentMethod: method,
          paymentStatus,
          paymentRef,
          promotionId: promotionIdToSet,
          earnedFidelityPoints,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          transactions: true,
          promotion: true,
        },
      });

      if (paymentRef && (method === "orange_money" || method === "wave")) {
        await tx.paymentTransaction.create({
          data: {
            provider: method,
            amount: finalTotal,
            reference: paymentRef,
            status: "pending",
            phone: paymentPhone,
            saleId: createdSale.id,
          },
        });
      }

      if (customerId && earnedFidelityPoints > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { fidelityPoints: { increment: earnedFidelityPoints } },
        });
      }

      for (const item of saleItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return createdSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error("=== ERREUR API /api/sales POST ===");
    console.error(error);

    // Always return proper JSON so the client never crashes on .json()
    return NextResponse.json(
      {
        error: error.message || "Erreur lors de la création de la vente",
        details: error.stack ? error.stack.split("\n")[0] : undefined,
      },
      { status: 500 }
    );
  }
}
