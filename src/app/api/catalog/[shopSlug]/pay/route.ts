import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { shopSlug },
    });

    if (!user) {
      return NextResponse.json({ error: "Boutique non trouvée" }, { status: 404 });
    }

    const { productId, quantity, customerName, customerPhone, paymentMethod, deliveryType, deliveryAddress } = await request.json();

    if (!productId || !quantity || !customerName || !customerPhone || !paymentMethod) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (deliveryType === "delivery" && !deliveryAddress) {
      return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
    }

    if (paymentMethod !== "orange_money" && paymentMethod !== "wave") {
      return NextResponse.json({ error: "Mode de paiement non supporté" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: user.id },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ error: "Stock insuffisant" }, { status: 400 });
    }

    const total = product.price * quantity;

    let customer = await prisma.customer.findFirst({
      where: { phone: customerPhone, userId: user.id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
          userId: user.id,
        },
      });
    }

    const provider = getPaymentProvider(paymentMethod);
    const paymentResult = await provider.initiatePayment({
      amount: total,
      phone: customerPhone,
      reference: `CATALOG-${Date.now()}`,
      description: `Achat ${product.name} - ${user.shopName}`,
    });

    if (!paymentResult.success) {
      return NextResponse.json({ error: paymentResult.message }, { status: 500 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          userId: user.id,
          customerId: customer.id,
          total,
          finalTotal: total,
          paymentMethod,
          paymentStatus: "pending",
          paymentRef: paymentResult.transactionId,
          deliveryType: deliveryType || "pickup",
          items: {
            create: [
              {
                productId: product.id,
                quantity,
                price: product.price,
              },
            ],
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          provider: paymentMethod,
          amount: total,
          reference: paymentResult.transactionId || "",
          status: "pending",
          phone: customerPhone,
          saleId: createdSale.id,
        },
      });

      if (deliveryType === "delivery" && deliveryAddress) {
        await tx.delivery.create({
          data: {
            saleId: createdSale.id,
            address: deliveryAddress,
            phone: customerPhone,
            userId: user.id,
          },
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: quantity } },
      });

      return createdSale;
    });

    return NextResponse.json({
      success: true,
      sale,
      message: paymentResult.message,
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du paiement" },
      { status: 500 }
    );
  }
}
