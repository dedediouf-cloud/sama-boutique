import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook Orange Money Web Payment
 * 
 * Orange Money envoie généralement :
 * - notif_token
 * - status (SUCCESS / FAILED / EXPIRED)
 * - order_id
 * - amount
 * 
 * Endpoint configuré dans le dashboard OM: /api/payments/webhooks/orange-money
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[OM Webhook] Reçu:", {
      order_id: body.order_id,
      status: body.status,
      pay_token: body.pay_token || body.token,
    });

    const payToken = body.pay_token || body.token || body.transaction_id;
    const orderId = body.order_id || body.reference;
    const status = (body.status || "").toUpperCase();

    let newStatus: "pending" | "paid" | "failed" | "cancelled" = "pending";

    if (["SUCCESS", "COMPLETED", "PAID", "CONFIRMED"].includes(status)) {
      newStatus = "paid";
    } else if (["FAILED", "ERROR", "REJECTED"].includes(status)) {
      newStatus = "failed";
    } else if (["EXPIRED", "CANCELLED"].includes(status)) {
      newStatus = "cancelled";
    }

    // Trouver la transaction par pay_token ou order_id
    let tx = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { reference: payToken },
          { reference: orderId },
        ],
      },
      include: { sale: true },
    });

    // Fallback via paymentRef de la vente
    if (!tx && orderId) {
      const sale = await prisma.sale.findFirst({
        where: { paymentRef: orderId },
      });

      if (sale) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { paymentStatus: newStatus },
        });

        console.log(`[OM Webhook] Vente ${sale.id} mise à jour → ${newStatus}`);
        return NextResponse.json({ success: true });
      }
    }

    if (!tx) {
      console.warn("[OM Webhook] Aucune transaction trouvée pour", payToken || orderId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    await prisma.$transaction(async (prismaTx) => {
      await prismaTx.paymentTransaction.update({
        where: { id: tx!.id },
        data: { 
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      await prismaTx.sale.update({
        where: { id: tx!.saleId },
        data: { paymentStatus: newStatus },
      });
    });

    console.log(`[OM Webhook] Transaction ${tx.id} mise à jour → ${newStatus}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OM Webhook] Erreur:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
