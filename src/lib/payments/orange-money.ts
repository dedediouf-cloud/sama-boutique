import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  MerchantCredentials,
} from "./types";

export class OrangeMoneyProvider implements PaymentProviderInterface {
  name = "Orange Money";
  private credentials?: MerchantCredentials;

  constructor(credentials?: MerchantCredentials) {
    this.credentials = credentials;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: Remplacer par l'appel API réel d'Orange Money
    // Documentation: https://developer.orange.com/apis/money-webdev/

    const merchantCode = this.credentials?.omMerchantCode || "MOCK";
    console.log(`[Orange Money] Initier paiement de ${request.amount} FCFA vers ${request.phone} (merchant: ${merchantCode})`);

    // Pour l'instant on reste en mode simulation (Phase 1 terminée)
    // Les vrais appels API seront ajoutés en Phase 2
    const success = true;
    const transactionId = `OM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      success,
      transactionId,
      status: "pending",
      message: success
        ? `Paiement Orange Money initié. Validez sur votre téléphone ${request.phone}.`
        : "Échec de l'initiation du paiement Orange Money.",
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // TODO: Remplacer par l'appel API réel de vérification

    console.log(`[Orange Money] Vérifier statut de ${transactionId}`);

    // Simulation : après vérification, on considère que c'est payé
    return {
      success: true,
      status: "paid",
      message: "Paiement Orange Money confirmé.",
    };
  }
}
