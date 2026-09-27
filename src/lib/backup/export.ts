import { prisma } from "@/lib/prisma";
import { gzipSync, gunzipSync } from "zlib";

/**
 * ============================================================================
 *  EXPORT D'UNE BOUTIQUE (sauvegarde)
 * ============================================================================
 *  Produit un instantané complet et autonome des données d'UNE boutique.
 *
 *  ⚡ Conçu pour ne PAS peser sur l'application :
 *    - lecture par paquets (500 ventes à la fois) → mémoire maîtrisée
 *    - aucune écriture en base
 *    - utilisable à tout moment (cron de nuit ou bouton manuel)
 *
 *  🔒 Sécurité : les mots de passe ne sont JAMAIS inclus dans l'instantané
 *     (ni celui du patron, ni ceux des vendeurs).
 * ============================================================================
 */

export const VERSION_INSTANTANE = 1;
const TAILLE_PAQUET = 500;

export interface ResumeInstantane {
  products: number;
  customers: number;
  suppliers: number;
  sales: number;
  saleItems: number;
  payments: number;
  deliveries: number;
  reservations: number;
  cashSessions: number;
  stockEntries: number;
  inventoryCounts: number;
  promotions: number;
  employees: number;
}

export interface InstantaneBoutique {
  version: number;
  genereLe: string;
  boutique: {
    id: string;
    shopName: string;
    shopSlug: string;
    name: string | null;
    email: string;
    phone: string | null;
    logoUrl: string | null;
    createdAt: string;
  };
  settings: any | null;
  suppliers: any[];
  products: any[];
  customers: any[];
  promotions: any[];
  employees: any[]; // sans mots de passe
  cashSessions: any[];
  sales: any[]; // avec items + transactions
  deliveries: any[];
  reservations: any[];
  stockEntries: any[];
  inventoryCounts: any[];
  resume: ResumeInstantane;
}

/** Lit toutes les lignes d'une table en respectant une pagination par curseur */
async function lireParPaquets<T>(
  charger: (curseur: string | null, taille: number) => Promise<T[]>,
  taille = TAILLE_PAQUET
): Promise<T[]> {
  const tout: T[] = [];
  let curseur: string | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const paquet = await charger(curseur, taille);
    tout.push(...paquet);
    if (paquet.length < taille) break;
    const dernier: any = paquet[paquet.length - 1];
    curseur = dernier?.id ?? null;
    if (!curseur) break;
  }
  return tout;
}

export async function exporterBoutique(userId: string): Promise<InstantaneBoutique> {
  const boutique = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      shopName: true,
      shopSlug: true,
      name: true,
      email: true,
      phone: true,
      logoUrl: true,
      createdAt: true,
      settings: true,
    },
  });

  if (!boutique) {
    throw new Error("Boutique introuvable");
  }

  const {
    settings,
    logoUrl: _logo, // le logo (base64) n'est pas inclus : volumineux et re-téléchargeable
    ...profil
  } = boutique;

  /* ── Données simples (petits volumes) ─────────────────────────────────── */
  const [products, customers, suppliers, promotions, employees, cashSessions] =
    await Promise.all([
      prisma.product.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.customer.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.supplier.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.promotion.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.employee.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          // ⛔ pas de mot de passe
        },
      }),
      prisma.cashSession.findMany({ where: { userId }, orderBy: { openedAt: "asc" } }),
    ]);

  /* ── Ventes : lecture par paquets (le gros volume) ────────────────────── */
  const sales = await lireParPaquets<any>((curseur, taille) =>
    prisma.sale.findMany({
      where: { userId, ...(curseur ? { id: { gt: curseur } } : {}) },
      orderBy: { id: "asc" },
      take: taille,
      include: { items: true, transactions: true },
    })
  );

  const deliveries = await lireParPaquets<any>((curseur, taille) =>
    prisma.delivery.findMany({
      where: { userId, ...(curseur ? { id: { gt: curseur } } : {}) },
      orderBy: { id: "asc" },
      take: taille,
    })
  );

  const reservations = await lireParPaquets<any>((curseur, taille) =>
    prisma.reservation.findMany({
      where: { userId, ...(curseur ? { id: { gt: curseur } } : {}) },
      orderBy: { id: "asc" },
      take: taille,
    })
  );

  const stockEntries = await lireParPaquets<any>((curseur, taille) =>
    prisma.stockEntry.findMany({
      where: { userId, ...(curseur ? { id: { gt: curseur } } : {}) },
      orderBy: { id: "asc" },
      take: taille,
    })
  );

  const inventoryCounts = await lireParPaquets<any>((curseur, taille) =>
    prisma.inventoryCount.findMany({
      where: { userId, ...(curseur ? { id: { gt: curseur } } : {}) },
      orderBy: { id: "asc" },
      take: taille,
    })
  );

  const saleItems = sales.reduce((n, s) => n + (s.items?.length || 0), 0);
  const paiements = sales.reduce((n, s) => n + (s.transactions?.length || 0), 0);

  return {
    version: VERSION_INSTANTANE,
    genereLe: new Date().toISOString(),
    boutique: {
      id: profil.id,
      shopName: profil.shopName,
      shopSlug: profil.shopSlug,
      name: profil.name,
      email: profil.email,
      phone: profil.phone,
      logoUrl: null, // volontairement exclu (base64 volumineux)
      createdAt: profil.createdAt.toISOString(),
    },
    settings: settings ?? null,
    suppliers,
    products,
    customers,
    promotions,
    employees,
    cashSessions,
    sales,
    deliveries,
    reservations,
    stockEntries,
    inventoryCounts,
    resume: {
      products: products.length,
      customers: customers.length,
      suppliers: suppliers.length,
      sales: sales.length,
      saleItems,
      payments: paiements,
      deliveries: deliveries.length,
      reservations: reservations.length,
      cashSessions: cashSessions.length,
      stockEntries: stockEntries.length,
      inventoryCounts: inventoryCounts.length,
      promotions: promotions.length,
      employees: employees.length,
    },
  };
}

/** Compresse l'instantané (≈ 8 à 15× plus petit) */
export function compresser(instantane: InstantaneBoutique): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(instantane), "utf-8"), { level: 9 });
}

export function decompresser(contenu: Buffer): InstantaneBoutique {
  const json = gunzipSync(contenu).toString("utf-8");
  const data = JSON.parse(json);
  if (!data || typeof data !== "object" || !data.boutique) {
    throw new Error("Fichier de sauvegarde illisible ou corrompu");
  }
  return data as InstantaneBoutique;
}

/** Nom de fichier lisible pour le téléchargement */
export function nomFichierTelechargement(shopSlug: string, date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `sauvegarde-${shopSlug}-${d}.json.gz`;
}
