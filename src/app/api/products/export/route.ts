import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * ============================================================================
 *  EXPORT DES PRODUITS EN CSV (ouvrable dans Excel)
 * ============================================================================
 *
 *  À QUOI ÇA SERT
 *  ---------------
 *  Renseigner les prix d'achat un par un dans l'application est pénible
 *  (≈ 4 à 5 clics par produit). Avec cet export, le commerçant :
 *     1. télécharge son fichier
 *     2. remplit la colonne « Prix d'achat FCFA » dans Excel
 *     3. le réimporte
 *
 *  ⚠️  LA COLONNE « Identifiant » EST INDISPENSABLE
 *  -------------------------------------------------
 *  C'est elle qui permet à l'import de RECONNAÎTRE chaque produit et de le
 *  METTRE À JOUR, au lieu de créer des doublons. Ne la supprime pas.
 *
 *  🔒 SÉCURITÉ : on n'exporte que les produits de SA propre boutique
 *     (ownerId), jamais ceux d'une autre.
 * ============================================================================
 */

/** Échappe une valeur pour le CSV (guillemets doublés, encadrée si besoin) */
function cellule(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  if (/[";\n\r]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const produits = await prisma.product.findMany({
    where: { userId: ownerId },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      costPrice: true,
      quantity: true,
      lowStock: true,
      description: true,
      barcode: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const entetes = [
    "Identifiant",
    "Nom du produit",
    "Catégorie",
    "Prix de vente FCFA",
    "Prix d'achat FCFA",
    "Quantité",
    "Seuil alerte stock",
    "Description",
    "Code-barres",
  ];

  const lignes = produits.map((p) =>
    [
      p.id,
      p.name,
      p.category || "",
      p.price,
      // Vide = prix d'achat pas encore renseigné. On n'écrit surtout pas 0 :
      // au réimport, 0 serait compris comme « produit gratuit ».
      p.costPrice === null ? "" : p.costPrice,
      p.quantity,
      p.lowStock,
      p.description || "",
      p.barcode || "",
    ]
      .map(cellule)
      .join(";")
  );

  // Le BOM (\uFEFF) est indispensable : sans lui, Excel affiche « HygiÃ¨ne »
  // au lieu de « Hygiène » (les accents sont mal décodés).
  const csv = "\uFEFF" + [entetes.join(";"), ...lignes].join("\r\n") + "\r\n";

  const slug = (user.shopSlug || "boutique").replace(/[^a-z0-9-]/gi, "-");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produits-${slug}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
