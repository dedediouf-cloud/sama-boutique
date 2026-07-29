import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  MerchantCredentials,
} from "./types";

const OM_API_BASE = "https://api.orange.com";
const OM_WEBPAY_PATH = "/orange-money-webpay/dev/v1/webpayment"; // Sandbox + prod often share structure

export class OrangeMoneyProvider implements PaymentProviderInterface {
  name = "Orange Money";
  private credentials?: MerchantCredentials;

  constructor(credentials?: MerchantCredentials) {
    this.credentials = credentials;
  }

  private getMerchantCode(): string | undefined {
    return this.credentials?.omMerchantCode || undefined;
  }

  private getAccessToken(): string | undefined {
    // omApiKey ou omClientSecret peuvent servir de token selon l'intégration
    return this.credentials?.omApiKey || this.credentials?.omClientSecret || undefined;
  }

  /**
   * Génère un access token Orange Money si nécessaire.
   * Pour beaucoup d'intégrations OM, on utilise directement le token fourni dans le dashboard.
   */
  private async getBearerToken(): Promise<string | null> {
    const token = this.getAccessToken();
    if (token) return token;

    // Si on avait un clientSecret + merchantCode, on pourrait faire un appel OAuth
    // Pour l'instant on considère que les credentials contiennent déjà le token
    return null;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const merchantCode = this.getMerchantCode();
    const authToken = await this.getBearerToken();

    if (!merchantCode || !authToken) {
      console.warn("[Orange Money] Aucun identifiant marchand → simulation");
      const transactionId = `OM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        success: true,
        transactionId,
        status: "pending",
        message: `Paiement Orange Money initié (simulation - ajoutez votre Code Marchand + clé API). Validez sur votre téléphone ${request.phone}.`,
      };
    }

    try {
      const payload = {
        merchant_key: merchantCode,
        currency: "XOF",
        order_id: request.reference || `CAT-${Date.now()}`,
        amount: Math.round(request.amount),
        return_url: `${process.env.NEXTAUTH_URL || "https://votre-boutique.com"}/dashboard?payment=om-success`,
        cancel_url: `${process.env.NEXTAUTH_URL || "https://votre-boutique.com"}/dashboard?payment=om-cancel`,
        notif_url: `${process.env.NEXTAUTH_URL || "https://votre-boutique.com"}/api/payments/om-webhook`,
        lang: "fr",
        // Optionnel : référence client
        reference: request.reference,
      };

      console.log("[Orange Money] Appel API réel → webpayment", {
        amount: payload.amount,
        order_id: payload.order_id,
        merchant: merchantCode.substring(0, 6) + "...",
      });

      const response = await fetch(`${OM_API_BASE}${OM_WEBPAY_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-AUTH-TOKEN": authToken, // Certains endpoints l'exigent
          "User-Agent": "SamaBoutique/1.0",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("[Orange Money] Erreur API:", response.status, data);
        throw new Error(data?.message || data?.error || `Orange Money API error: ${response.status}`);
      }

      // Structure typique Orange Money WebPay :
      // { status: "201", message: "OK", pay_token: "...", payment_url: "...", notif_token: "..." }
      const payToken = data.pay_token || data.token || data.id;
      const paymentUrl = data.payment_url || data.url || data.redirect_url;

      const transactionId = payToken || `OM-${Date.now()}`;

      console.log("[Orange Money] ✅ Paiement initié:", transactionId);

      return {
        success: true,
        transactionId,
        status: "pending",
        message: paymentUrl
          ? `Paiement Orange Money initié. Ouvrez ce lien : ${paymentUrl} ou validez sur votre téléphone ${request.phone}.`
          : `Paiement Orange Money initié. Veuillez valider la demande sur votre téléphone ${request.phone}.`,
      };
    } catch (error: any) {
      console.error("[Orange Money] Erreur initiatePayment:", error);
      return {
        success: false,
        status: "failed",
        message: `Erreur Orange Money: ${error.message || "Impossible d'initier le paiement"}. Vérifiez votre Code Marchand et clé API.`,
      };
    }
  }

  async checkStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const authToken = await this.getBearerToken();
    const merchantCode = this.getMerchantCode();

    if (!authToken || !merchantCode) {
      console.warn("[Orange Money] checkStatus → simulation");
      return {
        success: true,
        status: "paid",
        message: "Paiement Orange Money confirmé (simulation).",
      };
    }

    try {
      console.log(`[Orange Money] Vérification statut réel pour ${transactionId}`);

      // Orange Money n'a pas toujours une route GET directe publique.
      // La meilleure pratique est d'utiliser le webhook + notif_token.
      // Ici on essaie une route de vérification courante ou on utilise la transaction.

      const response = await fetch(
        `${OM_API_BASE}/orange-money-webpay/dev/v1/transactions/${transactionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-AUTH-TOKEN": authToken,
            "User-Agent": "SamaBoutique/1.0",
          },
        }
      );

      if (!response.ok) {
        // Fallback : on considère que si on n'a pas d'erreur, on peut marquer comme pending
        // (le webhook mettra à jour le statut en réalité)
        console.log("[Orange Money] Pas de statut direct → pending (normal pour OM)");
        return {
          success: true,
          status: "pending",
          message: "Paiement en attente de validation par le client (webhook recommandé).",
        };
      }

      const data = await response.json().catch(() => ({}));
      const status = (data.status || data.transaction_status || "pending").toLowerCase();

      let mappedStatus: "pending" | "paid" | "failed" | "cancelled" = "pending";

      if (["paid", "success", "completed", "confirmed"].includes(status)) {
        mappedStatus = "paid";
      } else if (["failed", "error", "rejected"].includes(status)) {
        mappedStatus = "failed";
      } else if (["cancelled", "canceled"].includes(status)) {
        mappedStatus = "cancelled";
      }

      return {
        success: mappedStatus === "paid",
        status: mappedStatus,
        message:
          mappedStatus === "paid"
            ? "Paiement Orange Money confirmé !"
            : mappedStatus === "failed"
            ? "Le paiement Orange Money a échoué."
            : "Paiement Orange Money en attente de validation client.",
      };
    } catch (error: any) {
      console.error("[Orange Money] Erreur checkStatus:", error);
      return {
        success: true,
        status: "pending",
        message: "Vérification Orange Money en cours. Le statut sera mis à jour via webhook ou re-vérification.",
      };
    }
  }
}
