import { OrangeMoneyProvider } from "./orange-money";
import { WaveProvider } from "./wave";
import { PaymentProvider, PaymentProviderInterface, MerchantCredentials } from "./types";

export * from "./types";

/**
 * Retourne le provider avec les identifiants marchands de la boutique
 */
export function getPaymentProvider(
  provider: PaymentProvider, 
  credentials?: MerchantCredentials
): PaymentProviderInterface {
  switch (provider) {
    case "orange_money":
      return new OrangeMoneyProvider(credentials);
    case "wave":
      return new WaveProvider(credentials);
    default:
      throw new Error(`Provider de paiement inconnu : ${provider}`);
  }
}
