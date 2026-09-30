import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { addMonths } from "@/lib/subscription";
import { verifierLimite } from "@/lib/rate-limit";
import { sendEmail, bienvenueEmail, appBaseUrl } from "@/lib/email";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateReferralCode(base: string) {
  return `${slugify(base)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

export async function POST(request: Request) {
  try {
    // Limite anti-création en masse (pas de captcha, pas de vérification email) :
    // sans elle, on pouvait créer des centaines de faux comptes.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "inconnue";
    if (!verifierLimite(`register:${ip}`, 3, 60 * 60 * 1000, 60 * 60 * 1000).autorise) {
      return NextResponse.json(
        { error: "Trop de créations de compte depuis cet appareil. Réessayez dans une heure." },
        { status: 429 }
      );
    }

    const { name, email, password, shopName, phone, referralCode, billingInterval } = await request.json();

    if (!email || !password || !shopName) {
      return NextResponse.json(
        { error: "Email, mot de passe et nom de boutique obligatoires" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
    }

    let shopSlug = slugify(shopName);
    if (shopSlug === "superadmin") {
      return NextResponse.json({ error: "Ce nom de boutique est réservé" }, { status: 400 });
    }
    const existingSlug = await prisma.user.findUnique({ where: { shopSlug } });
    if (existingSlug) {
      shopSlug = `${shopSlug}-${Date.now()}`;
    }

    // Paramètres globaux
    let settings = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: { id: "default" },
      });
    }

    const interval: "monthly" | "annual" = billingInterval === "annual" ? "annual" : "monthly";
    const now = new Date();

    // === ESSAI GRATUIT ===
    // La nouvelle boutique démarre avec un essai gratuit (15 jours par défaut,
    // durée réglable dans les Paramètres globaux du super admin).
    // L'échéance d'abonnement est calée sur la fin de l'essai : le premier
    // paiement démarre donc exactement à la fin de l'essai, sans jour perdu.
    const trialDays = settings.trialDays && settings.trialDays > 0 ? settings.trialDays : 15;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    trialEndsAt.setUTCHours(23, 59, 59, 999);
    const dueDate = trialEndsAt;

    const hashedPassword = await bcrypt.hash(password, 10);

    let referralCodeStr = generateReferralCode(shopSlug);
    // S'assurer que le code est unique
    while (await prisma.user.findUnique({ where: { referralCode: referralCodeStr } })) {
      referralCodeStr = generateReferralCode(shopSlug);
    }

    let referrerId: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        shopName,
        shopSlug,
        phone,
        subscriptionAmount: settings.defaultMonthlyAmount,
        subscriptionStatus: "trial",
        subscriptionDueDate: dueDate,
        trialEndsAt,
        trialUsed: true,
        billingInterval: interval,
        referralCode: referralCodeStr,
        referredById: referrerId || null,
      },
    });

    // Si abonnement annuel avec parrainage, offrir 1 mois gratuit au parrain
    if (interval === "annual" && referrerId) {
      const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
      if (referrer) {
        const currentDue = referrer.subscriptionDueDate || new Date();
        const newDue = addMonths(currentDue, settings.referralRewardMonths);
        await prisma.user.update({
          where: { id: referrerId },
          data: { subscriptionDueDate: newDue },
        });
        await prisma.referralReward.create({
          data: {
            referrerId,
            referredId: user.id,
            monthsGranted: settings.referralRewardMonths,
          },
        });
      }
    }

    /* ── EMAIL DE BIENVENUE (avec le guide utilisateur) ──────────────────
     *  ⚠️  On ne fait PAS attendre la réponse : le commerçant est redirigé
     *      immédiatement, l'email part en arrière-plan. Si l'envoi échoue
     *      (clé Resend absente, adresse invalide), l'inscription reste
     *      réussie — on trace simplement l'erreur.
     */
    const mail = bienvenueEmail({
      shopName: user.shopName,
      to: user.email,
      trialDays,
      appUrl: appBaseUrl(),
      supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || null,
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
    });

    sendEmail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    })
      .then((r) => {
        if (r.ok) console.log(`[REGISTER] Email de bienvenue envoyé à ${user.email}`);
        else if (r.skipped) console.log(`[REGISTER] Email de bienvenue ignoré (RESEND_API_KEY absente)`);
        else console.warn(`[REGISTER] Email de bienvenue en échec : ${r.error}`);
      })
      .catch((e) => console.error("[REGISTER] Email de bienvenue :", e?.message || e));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        shopName: user.shopName,
        shopSlug: user.shopSlug,
        referralCode: user.referralCode,
        billingInterval: user.billingInterval,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
