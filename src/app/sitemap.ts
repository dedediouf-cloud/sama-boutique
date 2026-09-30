import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  SITEMAP.XML  —  généré automatiquement par Next.js
 * ============================================================================
 *  Accessible sur  /sitemap.xml
 *
 *  Rôle : donner à Google la LISTE COMPLÈTE des pages à indexer. Sans ce
 *  fichier, un moteur de recherche doit deviner ton contenu en suivant les
 *  liens — ce qui prend beaucoup plus de temps.
 *
 *  Deux catégories d'adresses :
 *    • les pages fixes : accueil, guide, inscription
 *    • les CATALOGUES DES BOUTIQUES : ajoutés dynamiquement, pour que les
 *      produits de tes commerçants soient trouvables sur Google. C'est un
 *      vrai avantage pour eux (et un argument de vente pour toi).
 * ============================================================================
 */

export const revalidate = 3600; // régénéré au maximum une fois par heure

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const url = base.replace(/\/$/, "");
  const maintenant = new Date();

  /* ── Pages fixes ─────────────────────────────────────────────────────── */
  const pagesFixes: MetadataRoute.Sitemap = [
    {
      url: `${url}/`,
      lastModified: maintenant,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${url}/guide`,
      lastModified: maintenant,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${url}/register`,
      lastModified: maintenant,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  /* ── Catalogues publics des boutiques ────────────────────────────────── */
  /*  ⚠️  On n'inclut QUE les boutiques qui ont au moins un produit EN STOCK.
   *
   *  Pourquoi ? Le catalogue public masque les produits dont la quantité
   *  est à 0. Une boutique sans stock affiche donc « Aucun produit trouvé ».
   *
   *  Or une page vide dans Google, c'est :
   *    • un visiteur qui découvre ton application… et la croit vide
   *    • du « contenu de faible qualité » aux yeux de Google, ce qui nuit
   *      au référencement de TOUT le site
   *
   *  En filtrant ici, la page reste parfaitement accessible (on peut la
   *  partager, le client la consulte) mais Google ne l'explore pas tant
   *  que le commerçant n'a rien mis en vente.
   */
  let catalogues: MetadataRoute.Sitemap = [];
  try {
    const boutiques = await prisma.user.findMany({
      where: {
        isBlocked: false,
        // au moins un produit visible dans le catalogue (quantité > 0)
        products: { some: { quantity: { gt: 0 } } },
      },
      select: {
        shopSlug: true,
        updatedAt: true,
        _count: { select: { products: true } },
      },
      take: 500, // au-delà, on passe à un sitemap par lots
      orderBy: { updatedAt: "desc" },
    });

    catalogues = boutiques
      .filter((b) => Boolean(b.shopSlug))
      .map((b) => ({
        url: `${url}/catalog/${b.shopSlug}`,
        lastModified: b.updatedAt ?? maintenant,
        changeFrequency: "weekly" as const,
        // Une boutique bien remplie a un peu plus d'intérêt pour Google
        priority: (b._count?.products ?? 0) >= 10 ? 0.7 : 0.6,
      }));
  } catch {
    // Si la base n'est pas joignable, on renvoie au moins les pages fixes :
    // un sitemap incomplet vaut mieux qu'une erreur 500 (Google le rejetterait).
    catalogues = [];
  }

  return [...pagesFixes, ...catalogues];
}
