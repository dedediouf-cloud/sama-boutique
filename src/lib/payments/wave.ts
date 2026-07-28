import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  MerchantCredentials,
} from "./types";

export class WaveProvider implements PaymentProviderInterface {
  name = "Wave";
  private credentials?: MerchantCredentials;

  constructor(credentials?: MerchantCredentials) {
    this.credentials = credentials;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: Remplacer par l'appel API réel de Wave
    // https://www.wave.com/business/

    const merchantId = this.credentials?.waveMerchantId || "MOCK";
    console.log(`[Wave] Initier paiement de ${request.amount} FCFA vers ${request.phone} (merchant: ${merchantId})`);

    // Pour l'instant on reste en mode simulation (Phase 1 terminée)
    // Les vrais appels API seront ajoutés en Phase 2
    const success = true;
    const transactionId = `WV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      success,
      transactionId,
      status: "pending",
      message: success
        ? `Paiement Wave initié. Ouvrez l'application Wave sur ${request.phone} pour valider.`
        : "Échec de l'initiation du paiement Wave.",
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // TODO: Remplacer par l'appel API réel de vérification

    console.log(`[Wave] Vérifier statut de ${transactionId}`);

    return {
      success: true,
      status: "paid",
      message: "Paiement Wave confirmé.",
    };
  }
}
