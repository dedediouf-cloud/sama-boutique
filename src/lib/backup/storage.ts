import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

/**
 * ============================================================================
 *  STOCKAGE DES SAUVEGARDES
 * ============================================================================
 *  Les instantanés sont stockés HORS de la base de données (sinon ils
 *  disparaîtraient avec elle) :
 *
 *   - En production : Vercel Blob (variable BLOB_READ_WRITE_TOKEN)
 *   - En local (tests) : un dossier temporaire du disque
 *
 *  ⚠️  Chaque instantané a un nom de fichier contenant 32 caractères
 *      aléatoires : l'URL n'est pas devinable. Le téléchargement passe
 *      de toute façon par notre API protégée (super admin).
 * ============================================================================
 */

const DOSSIER_LOCAL = process.env.BACKUP_LOCAL_DIR
  ? process.env.BACKUP_LOCAL_DIR
  : path.join(os.tmpdir(), "samaboutique-backups");

export function blobConfigure() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function modeStockage(): "blob" | "local" {
  return blobConfigure() ? "blob" : "local";
}

/** Nom de fichier non devinable */
export function nomInstantane(userId: string, date = new Date()) {
  const horodatage = date.toISOString().replace(/[:.]/g, "-");
  const alea = crypto.randomBytes(16).toString("hex");
  return `backups/${userId}/${horodatage}-${alea}.json.gz`;
}

export interface ResultatEnregistrement {
  url: string;
  pathname: string;
  sizeBytes: number;
}

/** Écrit un instantané compressé et renvoie son adresse */
export async function enregistrerInstantane(
  pathname: string,
  contenu: Buffer
): Promise<ResultatEnregistrement> {
  if (blobConfigure()) {
    const { put } = await import("@vercel/blob");
    const res = await put(pathname, contenu, {
      access: "public",
      contentType: "application/gzip",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return { url: res.url, pathname: res.pathname, sizeBytes: contenu.length };
  }

  // Repli local (développement / tests)
  const chemin = path.join(DOSSIER_LOCAL, pathname.replace(/^backups\//, ""));
  await fs.mkdir(path.dirname(chemin), { recursive: true });
  await fs.writeFile(chemin, contenu);
  return { url: `local:${chemin}`, pathname, sizeBytes: contenu.length };
}

/** Relit un instantané */
export async function lireInstantane(url: string, pathname: string): Promise<Buffer> {
  if (url.startsWith("local:")) {
    return fs.readFile(url.slice("local:".length));
  }

  // URL Blob publique : lecture directe
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Impossible de lire la sauvegarde (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Supprime un instantané */
export async function supprimerInstantane(url: string, pathname: string): Promise<void> {
  try {
    if (url.startsWith("local:")) {
      await fs.unlink(url.slice("local:".length));
      return;
    }
    if (blobConfigure()) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
  } catch (e: any) {
    // La suppression d'un fichier absent ne doit pas faire échouer le nettoyage
    console.warn("[BACKUP] suppression impossible :", e?.message || e);
  }
}

export { DOSSIER_LOCAL };
