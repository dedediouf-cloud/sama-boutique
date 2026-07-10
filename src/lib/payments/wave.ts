import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from "./types";

export class WaveProvider implements PaymentProviderInterface {
  name = "Wave";

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: Remplacer par l'appel API réel de Wave
    // https://www.wave.com/business/

    console.log(`[Wave MOCK] Initier paiement de ${request.amount} FCFA vers ${request.phone}`);

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

    console.log(`[Wave MOCK] Vérifier statut de ${transactionId}`);

    return {
      success: true,
      status: "paid",
      message: "Paiement Wave confirmé.",
    };
  }
}
