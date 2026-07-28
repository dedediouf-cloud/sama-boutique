import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET: Récupérer les paramètres de paiement de la boutique connectée
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const ownerId = user.ownerId || user.id;

  const settings = await prisma.boutiqueSettings.findUnique({
    where: { userId: ownerId },
    select: {
      paymentsEnabled: true,
      defaultPaymentMethod: true,
      merchantPhone: true,
      waveMerchantId: true,
      omMerchantCode: true,
      // On ne renvoie JAMAIS les clés secrètes complètes
    },
  });

  // Masquer les clés pour la sécurité
  const safeSettings = settings
    ? {
        ...settings,
        waveMerchantId: settings.waveMerchantId ? maskKey(settings.waveMerchantId) : null,
        omMerchantCode: settings.omMerchantCode ? maskKey(settings.omMerchantCode) : null,
      }
    : {
        paymentsEnabled: false,
        defaultPaymentMethod: "cash",
        merchantPhone: null,
        waveMerchantId: null,
        omMerchantCode: null,
      };

  return NextResponse.json(safeSettings);
}

// PATCH: Sauvegarder / mettre à jour les paramètres de paiement
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Seuls les admins peuvent modifier les identifiants marchands
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Seuls les administrateurs peuvent configurer les paiements" }, { status: 403 });
  }

  const ownerId = user.ownerId || user.id;
  const body = await request.json();

  const {
    paymentsEnabled,
    defaultPaymentMethod,
    merchantPhone,
    waveMerchantId,
    waveApiKey,
    waveSecret,
    omMerchantCode,
    omApiKey,
    omClientSecret,
  } = body;

  // Upsert = créer si n'existe pas, mettre à jour sinon
  const updated = await prisma.boutiqueSettings.upsert({
    where: { userId: ownerId },
    update: {
      paymentsEnabled: paymentsEnabled ?? undefined,
      defaultPaymentMethod: defaultPaymentMethod ?? undefined,
      merchantPhone: merchantPhone ?? undefined,
      waveMerchantId: waveMerchantId ?? undefined,
      waveApiKey: waveApiKey ?? undefined,
      waveSecret: waveSecret ?? undefined,
      omMerchantCode: omMerchantCode ?? undefined,
      omApiKey: omApiKey ?? undefined,
      omClientSecret: omClientSecret ?? undefined,
      updatedAt: new Date(),
    },
    create: {
      userId: ownerId,
      paymentsEnabled: paymentsEnabled ?? false,
      defaultPaymentMethod: defaultPaymentMethod ?? "cash",
      merchantPhone: merchantPhone ?? null,
      waveMerchantId: waveMerchantId ?? null,
      waveApiKey: waveApiKey ?? null,
      waveSecret: waveSecret ?? null,
      omMerchantCode: omMerchantCode ?? null,
      omApiKey: omApiKey ?? null,
      omClientSecret: omClientSecret ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Paramètres de paiement mis à jour",
    // Ne jamais renvoyer les secrets
    settings: {
      paymentsEnabled: updated.paymentsEnabled,
      defaultPaymentMethod: updated.defaultPaymentMethod,
      merchantPhone: updated.merchantPhone,
      waveMerchantId: updated.waveMerchantId ? maskKey(updated.waveMerchantId) : null,
      omMerchantCode: updated.omMerchantCode ? maskKey(updated.omMerchantCode) : null,
    },
  });
}

function maskKey(key: string): string {
  if (!key || key.length < 6) return "••••••";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}
