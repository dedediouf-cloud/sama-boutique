export type PaymentProvider = "orange_money" | "wave";

export interface PaymentRequest {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  message: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: "pending" | "paid" | "failed" | "cancelled";
  message: string;
}

export interface PaymentProviderInterface {
  name: string;
  /**
   * Le marchand a-t-il renseigné ses identifiants ?
   * ⚠️  Si false, AUCUN paiement réel n'est possible : le fournisseur ne doit
   *     ni initier de paiement, ni confirmer un statut. Sans ce contrôle, un
   *     webhook falsifié pouvait marquer une vente comme payée.
   */
  isConfigured(): boolean;
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkStatus(transactionId: string): Promise<PaymentStatusResponse>;
}

/**
 * Configuration des identifiants marchands par boutique
 * (chargée depuis BoutiqueSettings)
 */
export interface MerchantCredentials {
  // Wave
  waveMerchantId?: string | null;
  waveApiKey?: string | null;
  waveSecret?: string | null;

  // Orange Money
  omMerchantCode?: string | null;
  omApiKey?: string | null;
  omClientSecret?: string | null;

  // Optionnel
  merchantPhone?: string | null;
}
