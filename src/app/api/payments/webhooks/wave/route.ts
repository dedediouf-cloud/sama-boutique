import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { getMerchantCredentials } from "@/lib/payments/credentials";

/**
 * ============================================================================
 *  WEBHOOK WAVE — SÉCURISÉ
 * ============================================================================
 *  Même principe que pour Orange Money : le contenu du webhook n'est qu'un
 *  INDICE. Seule la réponse de l'API Wave (interrogée avec les identifiants
 *  marchands de la boutique) fait autorité.
 *
 *  AVANT : la signature X-Wave-Signature était reçue… puis ignorée
 *          (« vérification à implémenter plus tard »). N'importe qui pouvait
 *          donc marquer une vente comme payée.
 *
 *  MAINTENANT :
 *    1. Signature HMAC vérifiée si WAVE_WEBHOOK_SECRET est configuré
 *    2. Statut re-confirmé auprès de Wave via checkStatus()
 *    3. Sans confirmation → aucune modification
 * ============================================================================
 */

export const maxDuration = 30;

function signatureValide(corpsBrut: string, enTete: string | null) {
  const secret = process.env.WAVE_WEBHOOK_SECRET;
  if (!secret) return null; // pas de secret configuré
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
    const enTete =
      request.headers.get("x-wave-signature") ||
      request.headers.get("X-Wave-Signature");

    const verif = signatureValide(corpsBrut, enTete);
    if (verif === false) {
      console.warn("[Wave Webhook] ⛔ Signature invalide — requête ignorée");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = JSON.parse(corpsBrut);
    } catch {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* Wave utilise plusieurs noms de champs selon la version de son API */
    const reference =
      body.id ||
      body.transaction_id ||
      body.client_reference ||
      body.reference ||
      body.checkout_id;

    console.log("[Wave Webhook] Reçu :", {
      reference,
      type: body.type,
      status_annonce: body.payment_status || body.status,
      signature_verifiee: verif === true ? "oui" : "non configurée",
    });

    if (!reference) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* ── 2. Retrouver la transaction ────────────────────────────────────── */
    const tx = await prisma.paymentTransaction.findFirst({
      where: { OR: [{ reference }, { id: reference }] },
      include: { sale: true },
    });

    let venteConcernee = tx?.sale ?? null;
    const transactionId = tx?.id ?? null;

    if (!venteConcernee) {
      const sale = await prisma.sale.findFirst({ where: { paymentRef: reference } });
      if (sale) venteConcernee = sale;
    }

    if (!venteConcernee) {
      console.warn("[Wave Webhook] Aucune transaction pour", reference);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* ── 3. VÉRIFICATION AUPRÈS DE WAVE ─────────────────────────────────── */
    let statutConfirme: string | null = null;
    try {
      const credentials = await getMerchantCredentials(venteConcernee.userId);
      const provider = getPaymentProvider("wave" as any, credentials || undefined);

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
        const resultat = await provider.checkStatus(reference);
        statutConfirme = (resultat as any)?.status ?? null;
      }
    } catch (e: any) {
      console.warn("[Wave Webhook] Vérification auprès de Wave impossible :", e?.message || e);
    }

    /* ── 4. Sans confirmation → rien n'est modifié ──────────────────────── */
    if (!statutConfirme) {
      console.warn(
        "[Wave Webhook] ⚠️  Statut NON confirmé par Wave — vente",
        venteConcernee.id,
        "laissée en",
        venteConcernee.paymentStatus
      );
      return NextResponse.json(
        { received: true, verified: false, message: "Statut non confirmé : aucune modification" },
        { status: 200 }
      );
    }

    /* ── 5. Enregistrement ──────────────────────────────────────────────── */
    await prisma.$transaction(async (prismaTx) => {
      if (transactionId) {
        await prismaTx.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: statutConfirme!, updatedAt: new Date() },
        });
      }
      await prismaTx.sale.update({
        where: { id: venteConcernee!.id },
        data: { paymentStatus: statutConfirme! },
      });
    });

    console.log(`[Wave Webhook] ✅ Vente ${venteConcernee.id} → ${statutConfirme} (confirmé par Wave)`);

    return NextResponse.json({ success: true, verified: true, status: statutConfirme });
  } catch (error: any) {
    console.error("[Wave Webhook] Erreur :", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
