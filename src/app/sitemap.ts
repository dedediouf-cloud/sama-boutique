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
  let catalogues: MetadataRoute.Sitemap = [];
  try {
    const boutiques = await prisma.user.findMany({
      where: { isBlocked: false },
      select: { shopSlug: true, updatedAt: true },
      take: 500, // au-delà, on passe à un sitemap par lots
      orderBy: { updatedAt: "desc" },
    });

    catalogues = boutiques
      .filter((b) => Boolean(b.shopSlug))
      .map((b) => ({
        url: `${url}/catalog/${b.shopSlug}`,
        lastModified: b.updatedAt ?? maintenant,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // Si la base n'est pas joignable, on renvoie au moins les pages fixes :
    // un sitemap incomplet vaut mieux qu'une erreur 500 (Google le rejetterait).
    catalogues = [];
  }

  return [...pagesFixes, ...catalogues];
}
