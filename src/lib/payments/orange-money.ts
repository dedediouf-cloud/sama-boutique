import {
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from "./types";

export class OrangeMoneyProvider implements PaymentProviderInterface {
  name = "Orange Money";

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: Remplacer par l'appel API réel d'Orange Money
    // Documentation: https://developer.orange.com/apis/money-webdev/

    console.log(`[Orange Money MOCK] Initier paiement de ${request.amount} FCFA vers ${request.phone}`);

    // Simulation : succès aléatoire pour démonstration
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

    console.log(`[Orange Money MOCK] Vérifier statut de ${transactionId}`);

    // Simulation : après vérification, on considère que c'est payé
    return {
      success: true,
      status: "paid",
      message: "Paiement Orange Money confirmé.",
    };
  }
}
