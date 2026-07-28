import { prisma } from "@/lib/prisma";
import { MerchantCredentials } from "./types";

/**
 * Charge les identifiants marchands pour une boutique (userId)
 */
export async function getMerchantCredentials(userId: string): Promise<MerchantCredentials | null> {
  const settings = await prisma.boutiqueSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    return null;
  }

  return {
    waveMerchantId: settings.waveMerchantId,
    waveApiKey: settings.waveApiKey,
    waveSecret: settings.waveSecret,
    omMerchantCode: settings.omMerchantCode,
    omApiKey: settings.omApiKey,
    omClientSecret: settings.omClientSecret,
    merchantPhone: settings.merchantPhone,
  };
}

/**
 * Retourne le provider avec les identifiants de la boutique
 */
export async function getPaymentProviderForUser(
  userId: string,
  provider: "orange_money" | "wave"
) {
  const { getPaymentProvider } = await import("./index");
  const credentials = await getMerchantCredentials(userId);
  return getPaymentProvider(provider, credentials || undefined);
}

/**
 * Vérifie si les paiements mobiles sont activés
 */
export async function arePaymentsEnabled(userId: string): Promise<boolean> {
  const settings = await prisma.boutiqueSettings.findUnique({
    where: { userId },
    select: { paymentsEnabled: true },
  });
  return settings?.paymentsEnabled ?? false;
}
