import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  creerSauvegarde,
  boutiquesASauvegarder,
  tailleLisible,
} from "@/lib/backup/service";
import { modeStockage, blobConfigure } from "@/lib/backup/storage";

/**
 * ============================================================================
 *  CRON QUOTIDIEN — SAUVEGARDE DE TOUTES LES BOUTIQUES
 * ============================================================================
 *  Appelé par Vercel (voir vercel.json) : GET /api/cron/backups
 *
 *  ⚡ Fonctionne par petits paquets pour rester dans les limites Vercel :
 *     - budget de temps de 45 s (au-delà, on s'arrête et on reprend demain)
 *     - 3 boutiques sauvegardées en parallèle maximum
 *     - les boutiques jamais sauvegardées passent en premier
 *
 *  🔒 Protégé par CRON_SECRET (Vercel l'envoie automatiquement).
 *  Test manuel : /api/cron/backups?token=TA_CLE&dryRun=1
 * ============================================================================
 */

export const maxDuration = 60;

const BUDGET_MS = 45_000;
const CONCURRENCE = 3;
const MAX_BOUTIQUES = 100;

function autorise(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((req.headers.get("authorization") || "") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("token") === secret;
}

export async function GET(req: NextRequest) {
  if (!autorise(req)) {
    return NextResponse.json(
      {
        error: "Non autorisé",
        hint: "Définis CRON_SECRET dans Vercel, puis appelle /api/cron/backups?token=TA_CLE",
      },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  // Les sauvegardes peuvent-elles être désactivées depuis les réglages ?
  const reglages = await prisma.globalSettings.findUnique({ where: { id: "default" } });
  if (reglages && reglages.backupEnabled === false) {
    return NextResponse.json({
      desactive: true,
      message: "Les sauvegardes automatiques sont désactivées (Réglages globaux).",
    });
  }

  const debut = Date.now();
  const candidates = await boutiquesASauvegarder(MAX_BOUTIQUES);

  const resultat = {
    stockage: modeStockage(),
    blobConfigure: blobConfigure(),
    boutiquesVues: candidates.length,
    sauvegardees: 0,
    echecs: 0,
    tempsRestantUtilise: false,
    dryRun,
    details: [] as { boutique: string; statut: string; taille?: string }[],
  };

  if (dryRun) {
    for (const b of candidates) {
      resultat.details.push({
        boutique: b.shopName,
        statut: b.dernierBackup
          ? `à sauvegarder (dernière : ${b.dernierBackup.toISOString().slice(0, 10)})`
          : "jamais sauvegardée",
      });
    }
    return NextResponse.json(resultat);
  }

  /* ── Sauvegarde par paquets de CONCURRENCE ───────────────────────────── */
  let index = 0;
  while (index < candidates.length) {
    if (Date.now() - debut > BUDGET_MS) {
      resultat.tempsRestantUtilise = true;
      break;
    }

    const paquet = candidates.slice(index, index + CONCURRENCE);
    index += CONCURRENCE;

    const retours = await Promise.allSettled(
      paquet.map((b) => creerSauvegarde(b.id, "auto", "cron"))
    );

    retours.forEach((r, i) => {
      const b = paquet[i];
      if (r.status === "fulfilled") {
        resultat.sauvegardees++;
        resultat.details.push({
          boutique: b.shopName,
          statut: "sauvegardée",
          taille: tailleLisible(r.value.taille),
        });
      } else {
        resultat.echecs++;
        resultat.details.push({
          boutique: b.shopName,
          statut: `échec : ${r.reason?.message || r.reason}`,
        });
        console.error(`[BACKUP CRON] échec pour ${b.shopName} :`, r.reason);
      }
    });
  }

  const duree = Math.round((Date.now() - debut) / 1000);
  console.log(
    `[BACKUP CRON] ${resultat.sauvegardees}/${candidates.length} sauvegardées en ${duree}s` +
      (resultat.tempsRestantUtilise ? " (budget de temps atteint, suite au prochain passage)" : "")
  );

  return NextResponse.json({ ...resultat, dureeSecondes: duree });
}
