import { OrangeMoneyProvider } from "./orange-money";
import { WaveProvider } from "./wave";
import { PaymentProvider, PaymentProviderInterface } from "./types";

export * from "./types";

export function getPaymentProvider(provider: PaymentProvider): PaymentProviderInterface {
  switch (provider) {
    case "orange_money":
      return new OrangeMoneyProvider();
    case "wave":
      return new WaveProvider();
    default:
      throw new Error(`Provider de paiement inconnu : ${provider}`);
  }
}
