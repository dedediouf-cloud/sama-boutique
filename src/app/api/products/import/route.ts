import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertWritable } from "@/lib/access";

/**
 * ============================================================================
 *  IMPORT DE PRODUITS (fichier CSV / Excel)
 * ============================================================================
 *
 *  DEUX COMPORTEMENTS, SELON LE FICHIER
 *  -------------------------------------
 *  1. Le fichier vient de « Exporter mes produits » (il contient la colonne
 *     « Identifiant ») → on MET À JOUR les produits existants.
 *     C'est ce qui permet de remplir les prix d'achat dans Excel puis de
 *     réimporter sans créer de doublons.
 *
 *  2. Le fichier est un nouveau fichier (pas d'identifiant) → on CRÉE des
 *     produits, comme avant.
 *
 *  ⚠️  LA QUANTITÉ N'EST JAMAIS MODIFIÉE PAR UNE MISE À JOUR.
 *  -----------------------------------------------------------------
 *  C'est une décision de sécurité importante. Le stock change tous les jours
 *  (ventes, réceptions). Si on réécrivait la quantité depuis un fichier
 *  exporté la semaine dernière, on remettrait le stock d'il y a une semaine —
 *  et le commerçant croirait avoir du stock qu'il n'a plus.
 *  Pour corriger un stock, il y a la page Inventaire et le réapprovisionnement.
 * ============================================================================
 */

/** Transforme une valeur en nombre, ou null si ce n'est pas un nombre valide */
function nombreOuNull(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  // Verrou essai/abonnement : modifie les données uniquement si la boutique
  // n'est pas en lecture seule (essai gratuit terminé).
  const __locked = await assertWritable();
  if (__locked) return __locked;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ownerId = user.ownerId || user.id;

  try {
    const { products } = await request.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit à importer" }, { status: 400 });
    }

    // On charge les identifiants réels de la boutique : sert à vérifier
    // qu'un identifiant reçu dans le fichier lui appartient bien (sinon
    // n'importe qui pourrait modifier les produits d'une autre boutique).
    const siens = await prisma.product.findMany({
      where: { userId: ownerId },
      select: { id: true },
    });
    const idsAutorises = new Set(siens.map((p) => p.id));

    const createdProducts = [];
    let misAJour = 0;

    for (const p of products) {
      const nom = p.name?.trim() || "Sans nom";
      const prixVente = nombreOuNull(p.price) ?? 0;
      // Prix d'achat : FACULTATIF. Une case vide signifie « pas renseigné »
      // et non « zéro » — sinon on afficherait une marge de 100 %.
      const prixAchat = nombreOuNull(p.costPrice);

      const identifiant = typeof p.id === "string" ? p.id : "";
      const estMiseAJour = identifiant !== "" && idsAutorises.has(identifiant);

      if (estMiseAJour) {
        await prisma.product.update({
          where: { id: identifiant },
          data: {
            name: nom,
            description: p.description || "",
            price: prixVente,
            ...(prixAchat !== null ? { costPrice: prixAchat } : {}),
            lowStock: nombreOuNull(p.lowStock) ?? 5,
            category: p.category || "",
            ...(p.barcode ? { barcode: String(p.barcode).trim() } : {}),
            // ⛔ quantité volontairement NON modifiée (voir commentaire en haut)
          },
        });
        misAJour += 1;
      } else {
        const produit = await prisma.product.create({
          data: {
            name: nom,
            description: p.description || "",
            price: prixVente,
            costPrice: prixAchat,
            quantity: nombreOuNull(p.quantity) ?? 0,
            lowStock: nombreOuNull(p.lowStock) ?? 5,
            category: p.category || "",
            ...(p.barcode ? { barcode: String(p.barcode).trim() } : {}),
            userId: ownerId,
          },
        });
        createdProducts.push(produit);
      }
    }

    return NextResponse.json({
      success: true,
      imported: createdProducts.length,
      updated: misAJour,
      products: createdProducts,
      // Message prêt à afficher côté interface
      message:
        misAJour > 0
          ? `${createdProducts.length} produit(s) créé(s), ${misAJour} mis à jour`
          : `${createdProducts.length} produit(s) importé(s)`,
    });
  } catch (error) {
    console.error("CSV Import Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import CSV" }, { status: 500 });
  }
}
