import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Webhook Wave Business
 * 
 * Wave envoie un POST avec:
 * - body: { id, status, amount, client_reference, ... }
 * - Header: X-Wave-Signature (HMAC)
 * 
 * Documentation: https://business.wave.com/developers
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-wave-signature") || 
                      request.headers.get("X-Wave-Signature");

    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    console.log("[Wave Webhook] Reçu:", {
      id: payload.id,
      status: payload.status,
      reference: payload.client_reference,
    });

    // Si une signature est présente, on peut vérifier (recommandé en prod)
    // Pour l'instant on log juste
    if (signature) {
      // Exemple de vérification HMAC (à activer plus tard)
      // const secret = process.env.WAVE_WEBHOOK_SECRET;
      // const computed = crypto.createHmac("sha256", secret!).update(rawBody).digest("hex");
      console.log("[Wave Webhook] Signature reçue (vérification à implémenter en prod)");
    }

    const transactionId = payload.id || payload.checkout_session_id;
    const status = (payload.status || "").toLowerCase();
    const reference = payload.client_reference || payload.reference;

    if (!transactionId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Mettre à jour la transaction et la vente
    const tx = await prisma.paymentTransaction.findFirst({
      where: { reference: transactionId },
      include: { sale: true },
    });

    if (!tx) {
      // Essayons via paymentRef de la vente
      const saleByRef = await prisma.sale.findFirst({
        where: { paymentRef: transactionId },
      });
      
      if (saleByRef) {
        const newStatus = status === "paid" || status === "completed" ? "paid" : 
                         status.includes("fail") ? "failed" : "pending";

        await prisma.sale.update({
          where: { id: saleByRef.id },
          data: { paymentStatus: newStatus },
        });

        console.log(`[Wave Webhook] Vente ${saleByRef.id} mise à jour → ${newStatus}`);
      }
      return NextResponse.json({ received: true });
    }

    let newStatus: "pending" | "paid" | "failed" | "cancelled" = "pending";

    if (status === "paid" || status === "completed" || status === "success") {
      newStatus = "paid";
    } else if (status === "failed" || status === "error") {
      newStatus = "failed";
    } else if (status === "cancelled" || status === "canceled") {
      newStatus = "cancelled";
    }

    await prisma.$transaction(async (prismaTx) => {
      await prismaTx.paymentTransaction.update({
        where: { id: tx.id },
        data: { 
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      await prismaTx.sale.update({
        where: { id: tx.saleId },
        data: { paymentStatus: newStatus },
      });
    });

    console.log(`[Wave Webhook] Transaction ${tx.id} mise à jour → ${newStatus}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Wave Webhook] Erreur:", error);
    // Toujours retourner 200 pour Wave (ils réessaient sinon)
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
