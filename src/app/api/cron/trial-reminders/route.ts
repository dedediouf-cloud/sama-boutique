import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAccess } from "@/lib/access";
import { sendEmail, trialEmail, appBaseUrl } from "@/lib/email";

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

  console.log("[CRON trial-reminders]", JSON.stringify(result));
  return NextResponse.json(result);
}
