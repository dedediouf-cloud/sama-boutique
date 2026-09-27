import { prisma } from "@/lib/prisma";
import { exporterBoutique, compresser, type InstantaneBoutique } from "./export";
import {
  enregistrerInstantane,
  supprimerInstantane,
  nomInstantane,
  lireInstantane,
} from "./storage";

/**
 * ============================================================================
 *  SERVICE DE SAUVEGARDE
 * ============================================================================
 *  Point d'entrée commun au cron de nuit et au bouton « Sauvegarder » de
 *  l'interface. Ne modifie jamais les données de la boutique : lecture seule.
 * ============================================================================
 */

export const RETENTION_DEFAUT = 30;

export interface ResultatSauvegarde {
  backupId: string;
  taille: number;
  resume: Record<string, number>;
  url: string;
}

/** Crée un instantané pour UNE boutique, le stocke et enregistre les métadonnées */
export async function creerSauvegarde(
  userId: string,
  kind: "auto" | "manual" = "auto",
  createdBy?: string
): Promise<ResultatSauvegarde> {
  // 1. Extraction (lecture seule)
  const instantane: InstantaneBoutique = await exporterBoutique(userId);

  // 2. Compression
  const contenu = compresser(instantane);

  // 3. Stockage hors base
  const pathname = nomInstantane(userId);
  const { url, sizeBytes } = await enregistrerInstantane(pathname, contenu);

  // 4. Métadonnées en base
  const ligne = await prisma.boutiqueBackup.create({
    data: {
      userId,
      kind,
      url,
      pathname,
      sizeBytes: sizeBytes || contenu.length,
      counts: JSON.stringify(instantane.resume),
      createdBy: createdBy ?? null,
    },
  });

  // 5. Nettoyage des anciens instantanés
  await appliquerRetention(userId);

  return {
    backupId: ligne.id,
    taille: ligne.sizeBytes,
    resume: instantane.resume as unknown as Record<string, number>,
    url,
  };
}

/**
 * Supprime le fichier d'un instantané SEULEMENT s'il n'est plus référencé.
 * (Deux lignes peuvent partager le même fichier : c'est le cas des traces de
 *  restauration, qui pointent vers l'instantané utilisé.)
 */
async function supprimerFichierSiOrphelin(
  pathname: string,
  url: string,
  saufId?: string
): Promise<boolean> {
  const autres = await prisma.boutiqueBackup.count({
    where: { pathname, ...(saufId ? { NOT: { id: saufId } } : {}) },
  });
  if (autres > 0) return false; // fichier encore utilisé ailleurs
  await supprimerInstantane(url, pathname);
  return true;
}

/** Supprime les instantanés au-delà de la rétention (les « permanents » sont conservés) */
export async function appliquerRetention(userId: string): Promise<number> {
  let retention = RETENTION_DEFAUT;
  try {
    const reglages = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (reglages?.backupRetention && reglages.backupRetention > 0) {
      retention = reglages.backupRetention;
    }
  } catch {
    /* on garde la valeur par défaut */
  }

  const instantanes = await prisma.boutiqueBackup.findMany({
    where: { userId, permanent: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, pathname: true },
  });

  const aSupprimer = instantanes.slice(retention);
  for (const s of aSupprimer) {
    await prisma.boutiqueBackup.delete({ where: { id: s.id } });
    await supprimerFichierSiOrphelin(s.pathname, s.url, s.id);
  }
  return aSupprimer.length;
}

/** Nombre de boutiques à sauvegarder, en commençant par celles qui attendent depuis le plus longtemps */
export async function boutiquesASauvegarder(limite: number) {
  const boutiques = await prisma.user.findMany({
    select: {
      id: true,
      shopName: true,
      email: true,
      backups: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  return boutiques
    .map((b) => ({
      id: b.id,
      shopName: b.shopName,
      email: b.email,
      dernierBackup: b.backups[0]?.createdAt ?? null,
    }))
    .sort((a, b) => {
      const ta = a.dernierBackup ? a.dernierBackup.getTime() : 0;
      const tb = b.dernierBackup ? b.dernierBackup.getTime() : 0;
      return ta - tb; // jamais sauvegardées en premier
    })
    .slice(0, limite);
}

/** Lit un instantané stocké (pour restauration ou téléchargement) */
export async function lireSauvegarde(backupId: string, userId: string) {
  const ligne = await prisma.boutiqueBackup.findFirst({
    where: { id: backupId, userId },
  });
  if (!ligne) throw new Error("Sauvegarde introuvable");

  const contenu = await lireInstantane(ligne.url, ligne.pathname);

  return { ligne, contenu };
}

/** Supprime un instantané (métadonnées + fichier) */
export async function supprimerSauvegarde(backupId: string, userId: string) {
  const ligne = await prisma.boutiqueBackup.findFirst({ where: { id: backupId, userId } });
  if (!ligne) throw new Error("Sauvegarde introuvable");
  await prisma.boutiqueBackup.delete({ where: { id: ligne.id } });
  await supprimerFichierSiOrphelin(ligne.pathname, ligne.url, ligne.id);
}

/** Résumé lisible pour l'interface */
export function resumeLisible(counts: string | null): string {
  if (!counts) return "";
  try {
    const c = JSON.parse(counts);
    const parties: string[] = [];
    if (c.sales) parties.push(`${c.sales} ventes`);
    if (c.products) parties.push(`${c.products} produits`);
    if (c.customers) parties.push(`${c.customers} clients`);
    if (c.cashSessions) parties.push(`${c.cashSessions} caisses`);
    return parties.join(" · ");
  } catch {
    return "";
  }
}

export function tailleLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
