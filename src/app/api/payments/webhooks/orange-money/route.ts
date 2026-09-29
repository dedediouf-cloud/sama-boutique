import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { getMerchantCredentials } from "@/lib/payments/credentials";

/**
 * ============================================================================
 *  WEBHOOK ORANGE MONEY — SÉCURISÉ
 * ============================================================================
 *  ⚠️  PRINCIPE ABSOLU : on ne fait JAMAIS confiance au contenu du webhook.
 *
 *  AVANT (faille critique) :
 *    Le webhook lisait { order_id, status } dans le corps de la requête et
 *    mettait à jour la vente directement. N'importe qui pouvait donc envoyer :
 *
 *        POST /api/payments/webhooks/orange-money
 *        { "order_id": "REF-CONNUE", "status": "SUCCESS" }
 *
 *    …et marquer une vente comme PAYÉE sans verser un franc. Le client reçoit
 *    sa référence de paiement dans la réponse de /pay : l'exploit était trivial.
 *
 *  MAINTENANT :
 *    1. Signature vérifiée si OM_WEBHOOK_SECRET est configuré (recommandé)
 *    2. Le statut du webhook ne sert QUE d'indice
 *    3. On INTERROGE Orange Money avec les identifiants marchands de la
 *       boutique : seule SA réponse fait foi
 *    4. Si la vérification échoue → on ne touche à RIEN
 * ============================================================================
 */

export const maxDuration = 30;

/** Vérifie la signature HMAC du corps brut (si un secret est configuré) */
function signatureValide(corpsBrut: string, enTete: string | null) {
  const secret = process.env.OM_WEBHOOK_SECRET;
  if (!secret) return null; // pas de secret configuré → on ne peut pas vérifier
  if (!enTete) return false;

  const attendu = crypto.createHmac("sha256", secret).update(corpsBrut).digest("hex");
  const recu = enTete.replace(/^sha256=/, "").trim();

  try {
    return crypto.timingSafeEqual(Buffer.from(attendu, "hex"), Buffer.from(recu, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    /* ── 1. Signature (si configurée) ───────────────────────────────────── */
    const corpsBrut = await request.text();
    const enTeteSignature =
      request.headers.get("x-om-signature") ||
      request.headers.get("x-orange-signature") ||
      request.headers.get("x-signature");

    const verif = signatureValide(corpsBrut, enTeteSignature);
    if (verif === false) {
      console.warn("[OM Webhook] ⛔ Signature invalide — requête ignorée");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = JSON.parse(corpsBrut);
    } catch {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payToken = body.pay_token || body.token || body.transaction_id;
    const orderId = body.order_id || body.reference;

    console.log("[OM Webhook] Reçu :", {
      order_id: orderId,
      status_annonce: body.status,
      signature_verifiee: verif === true ? "oui" : "non configurée",
    });

    if (!payToken && !orderId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* ── 2. Retrouver la transaction ────────────────────────────────────── */
    const tx = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [{ reference: payToken }, { reference: orderId }],
      },
      include: { sale: true },
    });

    /* Fallback : par la référence de la vente */
    let venteConcernee = tx?.sale ?? null;
    let transactionId = tx?.id ?? null;
    let reference = tx?.reference ?? orderId;

    if (!venteConcernee && orderId) {
      const sale = await prisma.sale.findFirst({ where: { paymentRef: orderId } });
      if (sale) {
        venteConcernee = sale;
        reference = orderId;
      }
    }

    if (!venteConcernee) {
      console.warn("[OM Webhook] Aucune transaction pour", payToken || orderId);
      // On répond 200 pour éviter les réessais inutiles d'Orange
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* ── 3. VÉRIFICATION AUPRÈS D'ORANGE (le point essentiel) ───────────── */
    const ownerId = venteConcernee.userId;
    let statutConfirme: string | null = null;
    let methodeVerification = "aucune";

    try {
      const credentials = await getMerchantCredentials(ownerId);
      const provider = getPaymentProvider("orange_money" as any, credentials || undefined);

      // ⚠️  Sans identifiants, le fournisseur ne peut RIEN confirmer :
      //     on refuse de mettre à jour plutôt que de faire confiance au webhook.
      if (provider && typeof provider.isConfigured === "function" && !provider.isConfigured()) {
        console.warn(
          `[Webhook] ⛔ ${provider.name || "fournisseur"} non configuré pour cette boutique — aucune modification`
        );
        return NextResponse.json(
          {
            received: true,
            verified: false,
            message: "Fournisseur de paiement non configuré : aucune modification effectuée",
          },
          { status: 200 }
        );
      }

      if (provider && typeof provider.checkStatus === "function") {
        const resultat = await provider.checkStatus(reference || transactionId || "");
        statutConfirme = (resultat as any)?.status ?? null;
        methodeVerification = "api_orange";
      }
    } catch (e: any) {
      console.warn("[OM Webhook] Vérification auprès d'Orange impossible :", e?.message || e);
    }

    /* ── 4. Aucun statut confirmé → on ne modifie RIEN ──────────────────── */
    if (!statutConfirme) {
      console.warn(
        "[OM Webhook] ⚠️  Statut NON confirmé par Orange Money — vente",
        venteConcernee.id,
        "laissée en",
        venteConcernee.paymentStatus
      );
      return NextResponse.json(
        { received: true, verified: false, message: "Statut non confirmé : aucune modification" },
        { status: 200 }
      );
    }

    /* ── 5. Enregistrement du statut CONFIRMÉ par le fournisseur ────────── */
    const nouveauxStatuts: Record<string, string> = {
      paid: "paid",
      failed: "failed",
      cancelled: "cancelled",
      pending: "pending",
    };
    const nouveauStatut = nouveauxStatuts[statutConfirme] || statutConfirme;

    await prisma.$transaction(async (prismaTx) => {
      if (transactionId) {
        await prismaTx.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: nouveauStatut, updatedAt: new Date() },
        });
      }
      await prismaTx.sale.update({
        where: { id: venteConcernee!.id },
        data: { paymentStatus: nouveauStatut },
      });
    });

    console.log(
      `[OM Webhook] ✅ Vente ${venteConcernee.id} → ${nouveauStatut} (confirmé par ${methodeVerification})`
    );

    return NextResponse.json({ success: true, verified: true, status: nouveauStatut });
  } catch (error: any) {
    console.error("[OM Webhook] Erreur :", error);
    // Toujours 200 : sinon Orange réessaie en boucle
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
