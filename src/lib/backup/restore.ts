import { prisma } from "@/lib/prisma";
import type { InstantaneBoutique } from "./export";

/**
 * ============================================================================
 *  RESTAURATION D'UNE BOUTIQUE
 * ============================================================================
 *  Deux modes, volontairement explicites :
 *
 *   « fusionner » (défaut, non destructif)
 *     On ne rajoute que ce qui MANQUE. Rien n'est supprimé, rien n'est écrasé.
 *     Usage : récupérer 200 produits supprimés par erreur, des ventes perdues…
 *
 *   « remplacer » (destructif)
 *     On efface les données de la boutique puis on réinsère l'instantané.
 *     Usage : catastrophe (données corrompues). Nécessite une confirmation.
 *
 *  ⚠️ Dans les deux cas :
 *    - la fiche de la boutique et son MOT DE PASSE ne sont JAMAIS touchés
 *    - les identifiants (id) d'origine sont conservés → les liens entre
 *      ventes / articles / clients restent cohérents
 *    - les éléments dont le parent n'existe pas sont ignorés (jamais d'erreur)
 * ============================================================================
 */

const TAILLE_LOT = 500;

export type ModeRestauration = "fusionner" | "remplacer";

export interface RapportRestauration {
  mode: ModeRestauration;
  dureeMs: number;
  crees: Record<string, number>;
  ignores: Record<string, number>;
  avertissements: string[];
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Utilitaires                                                              */
/* ══════════════════════════════════════════════════════════════════════════ */

/** Insère par lots (rapide et mémoire maîtrisée) */
async function insererParLots(
  modele: string,
  lignes: any[],
  creer: (lot: any[]) => Promise<any>
): Promise<number> {
  let total = 0;
  for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
    const lot = lignes.slice(i, i + TAILLE_LOT);
    if (lot.length === 0) continue;
    await creer(lot);
    total += lot.length;
  }
  return total;
}

/** Ne garde qu'une référence si elle existe réellement (évite les erreurs de clé étrangère) */
function referenceValide(id: any, valides: Set<string>) {
  return typeof id === "string" && valides.has(id) ? id : null;
}

function setDe(lignes: any[]): Set<string> {
  return new Set(lignes.map((l) => l.id));
}

function compteParTable(instantane: InstantaneBoutique) {
  return {
    produits: instantane.products?.length || 0,
    clients: instantane.customers?.length || 0,
    fournisseurs: instantane.suppliers?.length || 0,
    promotions: instantane.promotions?.length || 0,
    vendeurs: instantane.employees?.length || 0,
    ventes: instantane.sales?.length || 0,
    articles: (instantane.sales || []).reduce((n, s) => n + (s.items?.length || 0), 0),
    paiements: (instantane.sales || []).reduce((n, s) => n + (s.transactions?.length || 0), 0),
    livraisons: instantane.deliveries?.length || 0,
    reservations: instantane.reservations?.length || 0,
    caisses: instantane.cashSessions?.length || 0,
    mouvementsStock: instantane.stockEntries?.length || 0,
    inventaires: instantane.inventoryCounts?.length || 0,
  };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Mode « remplacer » : effacer les données de la boutique                  */
/* ══════════════════════════════════════════════════════════════════════════ */

async function viderBoutique(userId: string) {
  // Ordre inverse des dépendances
  await prisma.inventoryCount.deleteMany({ where: { userId } });
  await prisma.stockEntry.deleteMany({ where: { userId } });
  await prisma.paymentTransaction.deleteMany({ where: { sale: { userId } } });
  await prisma.saleItem.deleteMany({ where: { sale: { userId } } });
  await prisma.delivery.deleteMany({ where: { userId } });
  await prisma.sale.deleteMany({ where: { userId } });
  await prisma.reservation.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { userId } });
  await prisma.customer.deleteMany({ where: { userId } });
  await prisma.promotion.deleteMany({ where: { userId } });
  await prisma.supplierOrderItem.deleteMany({ where: { supplierOrder: { userId } } });
  await prisma.supplierOrder.deleteMany({ where: { userId } });
  await prisma.supplier.deleteMany({ where: { userId } });
  await prisma.employee.deleteMany({ where: { userId } });
  await prisma.cashSession.deleteMany({ where: { userId } });
  await prisma.boutiqueSettings.deleteMany({ where: { userId } });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Insertion commune (utilisée après un vidage OU en fusion)                */
/* ══════════════════════════════════════════════════════════════════════════ */

async function insererDonnees(
  userId: string,
  instantane: InstantaneBoutique,
  rapport: RapportRestauration,
  idExistant: Record<string, Set<string>>
) {
  const ajouter = (cle: string, n: number, table = "crees") => {
    if (!n) return;
    (rapport as any)[table][cle] = ((rapport as any)[table][cle] || 0) + n;
  };

  /* ── 1. Réglages de la boutique (paiements mobiles…) ─────────────────── */
  if (instantane.settings && !idExistant.boutiqueSettings.has(instantane.settings.id)) {
    const s = instantane.settings;
    await prisma.boutiqueSettings.create({
      data: {
        id: s.id,
        userId,
        waveMerchantId: s.waveMerchantId ?? null,
        waveApiKey: s.waveApiKey ?? null,
        waveSecret: s.waveSecret ?? null,
        omMerchantCode: s.omMerchantCode ?? null,
        omApiKey: s.omApiKey ?? null,
        omClientSecret: s.omClientSecret ?? null,
        paymentsEnabled: s.paymentsEnabled ?? false,
        defaultPaymentMethod: s.defaultPaymentMethod ?? null,
        merchantPhone: s.merchantPhone ?? null,
      },
    });
    ajouter("reglages", 1);
    idExistant.boutiqueSettings.add(s.id);
  }

  /* ── 2. Fournisseurs ─────────────────────────────────────────────────── */
  const fournisseurs = (instantane.suppliers || []).filter((s) => !idExistant.supplier.has(s.id));
  for (let i = 0; i < fournisseurs.length; i += TAILLE_LOT) {
    const lot = fournisseurs.slice(i, i + TAILLE_LOT);
    await prisma.supplier.createMany({
      data: lot.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone ?? null,
        email: s.email ?? null,
        address: s.address ?? null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        userId,
      })),
    });
    lot.forEach((s) => idExistant.supplier.add(s.id));
  }
  ajouter("fournisseurs", fournisseurs.length);

  /* ── 3. Produits ─────────────────────────────────────────────────────── */
  const produits = (instantane.products || []).filter((p) => !idExistant.product.has(p.id));
  for (let i = 0; i < produits.length; i += TAILLE_LOT) {
    const lot = produits.slice(i, i + TAILLE_LOT);
    await prisma.product.createMany({
      data: lot.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        price: p.price,
        quantity: p.quantity ?? 0,
        lowStock: p.lowStock ?? 5,
        category: p.category ?? null,
        imageUrl: p.imageUrl ?? null,
        barcode: p.barcode ?? null,
        supplierId: referenceValide(p.supplierId, idExistant.supplier),
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        userId,
      })),
    });
    lot.forEach((p) => idExistant.product.add(p.id));
  }
  ajouter("produits", produits.length);

  /* ── 4. Clients ──────────────────────────────────────────────────────── */
  const clients = (instantane.customers || []).filter((c) => !idExistant.customer.has(c.id));
  for (let i = 0; i < clients.length; i += TAILLE_LOT) {
    const lot = clients.slice(i, i + TAILLE_LOT);
    await prisma.customer.createMany({
      data: lot.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        address: c.address ?? null,
        email: c.email ?? null,
        fidelityPoints: c.fidelityPoints ?? 0,
        notes: c.notes ?? null,
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        userId,
      })),
    });
    lot.forEach((c) => idExistant.customer.add(c.id));
  }
  ajouter("clients", clients.length);

  /* ── 5. Promotions ───────────────────────────────────────────────────── */
  const promotions = (instantane.promotions || []).filter((p) => !idExistant.promotion.has(p.id));
  for (let i = 0; i < promotions.length; i += TAILLE_LOT) {
    const lot = promotions.slice(i, i + TAILLE_LOT);
    await prisma.promotion.createMany({
      data: lot.map((p) => ({
        id: p.id,
        code: p.code ?? null,
        name: p.name,
        type: p.type,
        value: p.value,
        minAmount: p.minAmount ?? null,
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
        active: p.active ?? true,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        userId,
      })),
    });
    lot.forEach((p) => idExistant.promotion.add(p.id));
  }
  ajouter("promotions", promotions.length);

  /* ── 6. Sessions de caisse (avant les ventes) ────────────────────────── */
  const caisses = (instantane.cashSessions || []).filter((c) => !idExistant.cashSession.has(c.id));
  for (let i = 0; i < caisses.length; i += TAILLE_LOT) {
    const lot = caisses.slice(i, i + TAILLE_LOT);
    await prisma.cashSession.createMany({
      data: lot.map((c) => ({
        id: c.id,
        userId,
        openedAt: new Date(c.openedAt),
        closedAt: c.closedAt ? new Date(c.closedAt) : null,
        openingAmount: c.openingAmount ?? 0,
        closingAmount: c.closingAmount ?? null,
        expectedAmount: c.expectedAmount ?? null,
        difference: c.difference ?? null,
        status: c.status ?? "OPEN",
        note: c.note ?? null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
    });
    lot.forEach((c) => idExistant.cashSession.add(c.id));
  }
  ajouter("caisses", caisses.length);

  /* ── 7. Vendeurs (sans mot de passe : à réinitialiser ensuite) ───────── */
  const vendeurs = (instantane.employees || []).filter((e) => !idExistant.employee.has(e.id));
  for (let i = 0; i < vendeurs.length; i += TAILLE_LOT) {
    const lot = vendeurs.slice(i, i + TAILLE_LOT);
    await prisma.employee.createMany({
      data: lot.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        // mot de passe non sauvegardé (sécurité) → valeur temporaire inutilisable
        password: "!restaure!-a-reinitialiser",
        role: e.role ?? "seller",
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        userId,
      })),
    });
    lot.forEach((e) => idExistant.employee.add(e.id));
    rapport.avertissements.push(
      `${lot.length} vendeur(s) restauré(s) : leur mot de passe doit être réinitialisé (bouton « Réinitialiser mot de passe »).`
    );
  }
  ajouter("vendeurs", vendeurs.length);

  /* ── 8. Ventes (+ articles + paiements) ─────────────────────────────── */
  /*  ⚠️ Point clé : on parcourt TOUTES les ventes de l'instantané, car les
   *  articles ou paiements d'une vente DÉJÀ PRÉSENTE peuvent avoir été perdus
   *  (ex. suppression d'un produit qui supprime ses lignes de vente).
   *  Seules les ventes manquantes sont créées ; les articles/paiements
   *  manquants sont rétablis dans tous les cas.                            */
  const toutesLesVentes = instantane.sales || [];
  let ventesCreees = 0;
  let articles = 0;
  let paiements = 0;
  let referencesIgnorees = 0;

  for (let i = 0; i < toutesLesVentes.length; i += 100) {
    const lot = toutesLesVentes.slice(i, i + 100);

    /* a) créer les ventes manquantes */
    const ventesManquantes = lot.filter((s) => !idExistant.sale.has(s.id));
    if (ventesManquantes.length > 0) {
      const ventesPreparees = ventesManquantes.map((s) => {
        // On annule les références devenues invalides au lieu de planter
        const clientId = referenceValide(s.customerId, idExistant.customer);
        const vendeurId = referenceValide(s.employeeId, idExistant.employee);
        const promoId = referenceValide(s.promotionId, idExistant.promotion);
        const caisseId = referenceValide(s.cashSessionId, idExistant.cashSession);
        if (
          (s.customerId && !clientId) ||
          (s.employeeId && !vendeurId) ||
          (s.promotionId && !promoId) ||
          (s.cashSessionId && !caisseId)
        ) {
          referencesIgnorees++;
        }
        return {
          id: s.id,
          total: s.total,
          discount: s.discount ?? 0,
          finalTotal: s.finalTotal,
          paymentMethod: s.paymentMethod ?? "cash",
          paymentStatus: s.paymentStatus ?? "pending",
          paymentRef: s.paymentRef ?? null,
          deliveryType: s.deliveryType ?? "pickup",
          earnedFidelityPoints: s.earnedFidelityPoints ?? 0,
          createdAt: new Date(s.createdAt),
          userId,
          customerId: clientId,
          employeeId: vendeurId,
          promotionId: promoId,
          cashSessionId: caisseId,
        };
      });

      await prisma.sale.createMany({ data: ventesPreparees });
      ventesPreparees.forEach((v) => idExistant.sale.add(v.id));
      ventesCreees += ventesPreparees.length;
    }

    /* b) rétablir les articles manquants (ventes anciennes ET nouvelles) */
    const lignes = lot.flatMap((s) =>
      (s.items || [])
        .filter((it: any) => idExistant.product.has(it.productId) && idExistant.sale.has(s.id))
        .map((it: any) => ({
          id: it.id,
          quantity: it.quantity,
          price: it.price,
          saleId: s.id,
          productId: it.productId,
        }))
    );
    const aInserer = lignes.filter((l) => !idExistant.saleItem.has(l.id));
    for (let j = 0; j < aInserer.length; j += TAILLE_LOT) {
      const bloc = aInserer.slice(j, j + TAILLE_LOT);
      await prisma.saleItem.createMany({ data: bloc });
      bloc.forEach((l: any) => idExistant.saleItem.add(l.id));
      articles += bloc.length;
    }

    /* c) rétablir les paiements manquants */
    const paiementsLot = lot.flatMap((s) =>
      (s.transactions || [])
        .filter(() => idExistant.sale.has(s.id))
        .map((t: any) => ({
          id: t.id,
          provider: t.provider,
          amount: t.amount,
          reference: t.reference ?? null,
          status: t.status ?? "pending",
          phone: t.phone ?? null,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          saleId: s.id,
        }))
    );
    const paiementsAInserer = paiementsLot.filter((t) => !idExistant.paymentTransaction.has(t.id));
    for (let j = 0; j < paiementsAInserer.length; j += TAILLE_LOT) {
      const bloc = paiementsAInserer.slice(j, j + TAILLE_LOT);
      await prisma.paymentTransaction.createMany({ data: bloc });
      bloc.forEach((t: any) => idExistant.paymentTransaction.add(t.id));
      paiements += bloc.length;
    }
  }
  ajouter("ventes", ventesCreees);
  ajouter("articles", articles);
  ajouter("paiements", paiements);
  if (referencesIgnorees) {
    rapport.avertissements.push(
      `${referencesIgnorees} vente(s) : une référence manquante (client, vendeur, promotion ou caisse) a été neutralisée.`
    );
  }

  /* ── 9. Livraisons ───────────────────────────────────────────────────── */
  const livraisons = (instantane.deliveries || []).filter(
    (d) => !idExistant.delivery.has(d.id) && idExistant.sale.has(d.saleId)
  );
  for (let i = 0; i < livraisons.length; i += TAILLE_LOT) {
    const lot = livraisons.slice(i, i + TAILLE_LOT);
    await prisma.delivery.createMany({
      data: lot.map((d) => ({
        id: d.id,
        status: d.status ?? "pending",
        address: d.address,
        phone: d.phone ?? null,
        notes: d.notes ?? null,
        deliveryDate: d.deliveryDate ? new Date(d.deliveryDate) : null,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
        saleId: d.saleId,
        userId,
      })),
    });
    lot.forEach((d) => idExistant.delivery.add(d.id));
  }
  ajouter("livraisons", livraisons.length);

  /* ── 10. Réservations ────────────────────────────────────────────────── */
  const reservations = (instantane.reservations || []).filter(
    (r) => !idExistant.reservation.has(r.id)
  );
  for (let i = 0; i < reservations.length; i += TAILLE_LOT) {
    const lot = reservations.slice(i, i + TAILLE_LOT);
    await prisma.reservation.createMany({
      data: lot.map((r) => ({
        id: r.id,
        productId: referenceValide(r.productId, idExistant.product),
        productName: r.productName,
        customerName: r.customerName,
        customerPhone: r.customerPhone ?? null,
        quantity: r.quantity ?? 1,
        status: r.status ?? "pending",
        message: r.message ?? null,
        unitPrice: r.unitPrice ?? null,
        total: r.total ?? null,
        itemsData: r.itemsData ?? null,
        createdAt: new Date(r.createdAt),
        userId,
        customerId: referenceValide(r.customerId, idExistant.customer),
      })),
    });
    lot.forEach((r) => idExistant.reservation.add(r.id));
  }
  ajouter("reservations", reservations.length);

  /* ── 11. Mouvements de stock (produits obligatoires) ─────────────────── */
  const mouvements = (instantane.stockEntries || []).filter(
    (m) => !idExistant.stockEntry.has(m.id) && idExistant.product.has(m.productId)
  );
  for (let i = 0; i < mouvements.length; i += TAILLE_LOT) {
    const lot = mouvements.slice(i, i + TAILLE_LOT);
    await prisma.stockEntry.createMany({
      data: lot.map((m) => ({
        id: m.id,
        quantity: m.quantity,
        note: m.note ?? null,
        createdAt: new Date(m.createdAt),
        productId: m.productId,
        userId,
      })),
    });
    lot.forEach((m) => idExistant.stockEntry.add(m.id));
  }
  ajouter("mouvementsStock", mouvements.length);

  /* ── 12. Inventaires ─────────────────────────────────────────────────── */
  const inventaires = (instantane.inventoryCounts || []).filter(
    (i2) => !idExistant.inventoryCount.has(i2.id) && idExistant.product.has(i2.productId)
  );
  for (let i = 0; i < inventaires.length; i += TAILLE_LOT) {
    const lot = inventaires.slice(i, i + TAILLE_LOT);
    await prisma.inventoryCount.createMany({
      data: lot.map((x) => ({
        id: x.id,
        countedQty: x.countedQty,
        systemQty: x.systemQty,
        difference: x.difference,
        note: x.note ?? null,
        countedAt: new Date(x.countedAt),
        createdAt: new Date(x.createdAt),
        productId: x.productId,
        userId,
      })),
    });
    lot.forEach((x) => idExistant.inventoryCount.add(x.id));
  }
  ajouter("inventaires", inventaires.length);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Point d'entrée                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */

async function chargerIdentifiantsExistants(userId: string) {
  const [
    produits, clients, fournisseurs, promotions, vendeurs, reglages,
    ventes, caisses, livraisons, reservations, mouvements, inventaires,
    articles, paiements,
  ] = await Promise.all([
    prisma.product.findMany({ where: { userId }, select: { id: true } }),
    prisma.customer.findMany({ where: { userId }, select: { id: true } }),
    prisma.supplier.findMany({ where: { userId }, select: { id: true } }),
    prisma.promotion.findMany({ where: { userId }, select: { id: true } }),
    prisma.employee.findMany({ where: { userId }, select: { id: true } }),
    prisma.boutiqueSettings.findMany({ where: { userId }, select: { id: true } }),
    prisma.sale.findMany({ where: { userId }, select: { id: true } }),
    prisma.cashSession.findMany({ where: { userId }, select: { id: true } }),
    prisma.delivery.findMany({ where: { userId }, select: { id: true } }),
    prisma.reservation.findMany({ where: { userId }, select: { id: true } }),
    prisma.stockEntry.findMany({ where: { userId }, select: { id: true } }),
    prisma.inventoryCount.findMany({ where: { userId }, select: { id: true } }),
    prisma.saleItem.findMany({ where: { sale: { userId } }, select: { id: true } }),
    prisma.paymentTransaction.findMany({ where: { sale: { userId } }, select: { id: true } }),
  ]);

  return {
    product: setDe(produits),
    customer: setDe(clients),
    supplier: setDe(fournisseurs),
    promotion: setDe(promotions),
    employee: setDe(vendeurs),
    boutiqueSettings: setDe(reglages),
    sale: setDe(ventes),
    cashSession: setDe(caisses),
    delivery: setDe(livraisons),
    reservation: setDe(reservations),
    stockEntry: setDe(mouvements),
    inventoryCount: setDe(inventaires),
    saleItem: setDe(articles),
    paymentTransaction: setDe(paiements),
  };
}

export async function restaurerBoutique(
  userId: string,
  instantane: InstantaneBoutique,
  mode: ModeRestauration
): Promise<RapportRestauration> {
  const debut = Date.now();
  const rapport: RapportRestauration = {
    mode,
    dureeMs: 0,
    crees: {},
    ignores: {},
    avertissements: [],
  };

  const boutique = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, shopName: true },
  });
  if (!boutique) {
    throw new Error("Boutique introuvable : restauration impossible");
  }

  if (instantane.boutique?.id && instantane.boutique.id !== userId) {
    rapport.avertissements.push(
      `Attention : cet instantané provient d'une autre boutique (${instantane.boutique.shopName}). Les données seront tout de même restaurées dans « ${boutique.shopName} ».`
    );
  }

  // Sauvegarde de sécurité automatique avant tout remplacement destructif
  if (mode === "remplacer") {
    await viderBoutique(userId);
    rapport.ignores = compteParTable(instantane);
  }

  const idExistant = await chargerIdentifiantsExistants(userId);
  await insererDonnees(userId, instantane, rapport, idExistant);

  rapport.dureeMs = Date.now() - debut;
  return rapport;
}
