import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAccess } from "@/lib/access";
import { sendEmail, trialEmail, rappelEcheanceEmail, appBaseUrl } from "@/lib/email";

/**
 * ============================================================================
 *  CRON QUOTIDIEN — RAPPELS DE FIN D'ESSAI GRATUIT
 * ============================================================================
 *  Appelé automatiquement par Vercel (voir vercel.json) :
 *      GET /api/cron/trial-reminders
 *
 *  Sécurité : exige l'en-tête `Authorization: Bearer $CRON_SECRET`
 *  (Vercel l'envoie automatiquement dès que la variable CRON_SECRET existe).
 *  Test manuel possible : /api/cron/trial-reminders?token=TA_CLE&dryRun=1
 *
 *  Idempotent : un même rappel n'est jamais envoyé deux fois (table TrialReminder).
 * ============================================================================
 */

export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // pas de clé configurée -> route fermée
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  const token = new URL(req.url).searchParams.get("token");
  return token === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        error: "Non autorisé",
        hint: "Définis CRON_SECRET dans les variables d'environnement Vercel, puis appelle /api/cron/trial-reminders?token=TA_CLE",
      },
      { status: 401 }
    );
  }

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const appUrl = appBaseUrl();

  const boutiques = await prisma.user.findMany({
    where: {
      isBlocked: false,
      trialEndsAt: { not: null },
      subscriptionStatus: { not: "paid" },
    },
    select: {
      id: true,
      email: true,
      shopName: true,
      isBlocked: true,
      subscriptionStatus: true,
      subscriptionDueDate: true,
      trialEndsAt: true,
      trialReminders: { select: { kind: true } },
    },
  });

  const result = {
    checked: boutiques.length,
    sent: 0,
    skipped: 0,
    alreadySent: 0,
    failed: 0,
    dryRun,
    details: [] as { shop: string; kind: string; daysLeft: number; status: string }[],
    renouvellements: { verifies: 0, envoyes: 0, dejaEnvoyes: 0, details: [] as any[] },
  };

  for (const boutique of boutiques) {
    const access = computeAccess(boutique);
    const daysLeft = access.daysLeft ?? 0;

    // Quel rappel pour aujourd'hui ? (robuste même si un jour de cron est manqué)
    let kind: string | null = null;
    if (daysLeft <= 0) kind = "J-0";
    else if (daysLeft === 1) kind = "J-1";
    else if (daysLeft <= 5) kind = "J-5";
    else kind = null;

    if (!kind) continue;
    if (kind === "J-0" && access.state !== "TRIAL_EXPIRED") continue;

    const already = boutique.trialReminders.some((r) => r.kind === kind);
    if (already) {
      result.alreadySent++;
      continue;
    }

    const mail = trialEmail({
      shopName: boutique.shopName,
      to: boutique.email,
      daysLeft,
      kind,
      appUrl,
      supportWhatsapp: access.supportWhatsapp,
      supportEmail: access.supportEmail,
    });

    if (dryRun) {
      result.details.push({ shop: boutique.shopName, kind, daysLeft, status: "dry-run" });
      result.sent++;
      continue;
    }

    const send = await sendEmail({
      to: boutique.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (send.ok) {
      await prisma.trialReminder.create({
        data: { userId: boutique.id, kind },
      });
      result.sent++;
      result.details.push({ shop: boutique.shopName, kind, daysLeft, status: "envoyé" });
    } else if (send.skipped) {
      result.skipped++;
      result.details.push({
        shop: boutique.shopName,
        kind,
        daysLeft,
        status: "ignoré (RESEND_API_KEY absente)",
      });
    } else {
      result.failed++;
      result.details.push({
        shop: boutique.shopName,
        kind,
        daysLeft,
        status: `échec: ${send.error}`,
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  RAPPELS D'ÉCHÉANCE D'ABONNEMENT (boutiques déjà payantes)
   * ══════════════════════════════════════════════════════════════════════
   *  Envoyé 3 jours avant l'échéance, puis le jour même si non régularisé.
   *  Le « kind » contient le mois concerné (ex. RENEW-2026-10) : ainsi un
   *  nouveau rappel peut partir le mois suivant sans être bloqué par la
   *  contrainte d'unicité [userId, kind].
   */
  const payantes = await prisma.user.findMany({
    where: {
      subscriptionStatus: "paid",
      isBlocked: false,
      subscriptionDueDate: { not: null },
    },
    select: {
      id: true,
      email: true,
      shopName: true,
      subscriptionAmount: true,
      subscriptionDueDate: true,
      trialEndsAt: true,
      isBlocked: true,
      subscriptionStatus: true,
      trialReminders: { select: { kind: true } },
    },
  });

  result.renouvellements = { verifies: payantes.length, envoyes: 0, dejaEnvoyes: 0, details: [] };

  for (const b of payantes) {
    const echeance = new Date(b.subscriptionDueDate!);
    const joursRestants = Math.ceil((echeance.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    // On n'alerte qu'à J-3 et J-0 (et si l'échéance est dépassée)
    let suffixe: string | null = null;
    if (joursRestants === 3) suffixe = "J3";
    else if (joursRestants <= 0) suffixe = "J0";
    else continue;

    const kind = `RENEW-${echeance.toISOString().slice(0, 7)}-${suffixe}`;
    if (b.trialReminders.some((r) => r.kind === kind)) {
      result.renouvellements.dejaEnvoyes++;
      continue;
    }

    const mail = rappelEcheanceEmail({
      shopName: b.shopName,
      to: b.email,
      joursRestants: Math.max(0, joursRestants),
      montant: b.subscriptionAmount || 0,
      echeance,
      appUrl,
      supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || null,
      supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null,
    });

    if (dryRun) {
      result.renouvellements.details.push({ shop: b.shopName, kind, statut: "dry-run" });
      result.renouvellements.envoyes++;
      continue;
    }

    const envoi = await sendEmail({
      to: b.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (envoi.ok) {
      await prisma.trialReminder.create({ data: { userId: b.id, kind } });
      result.renouvellements.envoyes++;
      result.renouvellements.details.push({ shop: b.shopName, kind, statut: "envoyé" });
    } else if (envoi.skipped) {
      result.renouvellements.details.push({ shop: b.shopName, kind, statut: "ignoré (clé absente)" });
    } else {
      result.renouvellements.details.push({ shop: b.shopName, kind, statut: `échec: ${envoi.error}` });
    }
  }

  console.log("[CRON rappels]", JSON.stringify(result));
  return NextResponse.json(result);
}
