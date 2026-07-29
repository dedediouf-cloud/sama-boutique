import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  MerchantCredentials,
} from "./types";

const WAVE_API_BASE = "https://api.wave.com/v1";

export class WaveProvider implements PaymentProviderInterface {
  name = "Wave";
  private credentials?: MerchantCredentials;

  constructor(credentials?: MerchantCredentials) {
    this.credentials = credentials;
  }

  private getApiKey(): string | undefined {
    // Wave Business utilise généralement le "Secret" comme Bearer token
    return this.credentials?.waveSecret || this.credentials?.waveApiKey || undefined;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn("[Wave] Aucun clé API fournie → mode simulation");
      const transactionId = `WV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        success: true,
        transactionId,
        status: "pending",
        message: `Paiement Wave initié (simulation - ajoutez vos clés Wave Business). Ouvrez Wave sur ${request.phone}.`,
      };
    }

    try {
      const merchantId = this.credentials?.waveMerchantId || undefined;

      const payload: any = {
        amount: Math.round(request.amount), // Wave attend un entier
        currency: "XOF",
        client_reference: request.reference || `SALE-${Date.now()}`,
      };

      // Ajout optionnel du merchant ID si présent
      if (merchantId) {
        payload.merchant_id = merchantId;
      }

      // On peut ajouter des URLs de retour (optionnel pour maintenant)
      // payload.success_url = `${process.env.NEXTAUTH_URL}/dashboard?payment=success`;
      // payload.cancel_url = `${process.env.NEXTAUTH_URL}/dashboard?payment=cancelled`;

      console.log("[Wave] Appel API réel → création checkout session", {
        amount: payload.amount,
        reference: payload.client_reference,
      });

      const response = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "SamaBoutique/1.0",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[Wave] Erreur API:", response.status, data);
        throw new Error(data?.message || data?.error || `Wave API error: ${response.status}`);
      }

      // Wave retourne généralement { id, payment_url, status, ... }
      const transactionId = data.id || data.checkout_session_id || `WV-${Date.now()}`;
      const paymentUrl = data.payment_url || data.url || data.redirect_url;

      console.log("[Wave] ✅ Session créée avec succès:", transactionId);

      return {
        success: true,
        transactionId,
        status: data.status || "pending",
        message: paymentUrl
          ? `Paiement Wave initié. Cliquez ici pour payer : ${paymentUrl} ou ouvrez l'app Wave sur ${request.phone}.`
          : `Paiement Wave initié. Ouvrez l'application Wave sur ${request.phone} pour valider.`,
        // On peut retourner l'URL pour le frontend si besoin
      };
    } catch (error: any) {
      console.error("[Wave] Erreur initiatePayment:", error);
      return {
        success: false,
        status: "failed",
        message: `Erreur Wave: ${error.message || "Impossible d'initier le paiement"}. Vérifiez vos identifiants Wave Business.`,
      };
    }
  }

  async checkStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn("[Wave] checkStatus → simulation");
      return {
        success: true,
        status: "paid",
        message: "Paiement Wave confirmé (simulation).",
      };
    }

    try {
      console.log(`[Wave] Vérification statut réel pour ${transactionId}`);

      const response = await fetch(`${WAVE_API_BASE}/checkout/sessions/${transactionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "SamaBoutique/1.0",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[Wave] Erreur check status:", response.status, data);
        // Fallback vers "pending" au lieu d'échouer brutalement
        return {
          success: true,
          status: "pending",
          message: "Vérification en cours...",
        };
      }

      const status = (data.status || "pending").toLowerCase();

      // Mapping des statuts Wave possibles
      let mappedStatus: "pending" | "paid" | "failed" | "cancelled" = "pending";
      if (status === "paid" || status === "completed" || status === "success") {
        mappedStatus = "paid";
      } else if (status === "failed" || status === "error") {
        mappedStatus = "failed";
      } else if (status === "cancelled" || status === "canceled") {
        mappedStatus = "cancelled";
      }

      return {
        success: mappedStatus === "paid",
        status: mappedStatus,
        message:
          mappedStatus === "paid"
            ? "Paiement Wave confirmé !"
            : mappedStatus === "failed"
            ? "Le paiement Wave a échoué."
            : "Paiement Wave en attente de validation.",
      };
    } catch (error: any) {
      console.error("[Wave] Erreur checkStatus:", error);
      return {
        success: true,
        status: "pending",
        message: "Impossible de vérifier le statut pour le moment. Réessayez plus tard.",
      };
    }
  }
}
