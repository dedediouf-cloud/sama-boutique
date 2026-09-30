import type { MetadataRoute } from "next";

/**
 * ============================================================================
 *  ROBOTS.TXT  —  généré automatiquement par Next.js
 * ============================================================================
 *  Accessible sur  /robots.txt
 *
 *  Rôle : dire aux robots des moteurs de recherche ce qu'ils peuvent visiter.
 *
 *  ✅ AUTORISÉ : la page d'accueil, le guide, les catalogues des boutiques
 *  ❌ INTERDIT : l'application elle-même (connexion, tableau de bord, API)
 *
 *  Pourquoi interdire le reste ? Parce qu'un moteur de recherche qui tombe
 *  sur /dashboard se verrait refuser l'accès (redirection vers /login) et
 *  gaspillerait son temps de visite. On le guide vers ce qui est utile.
 * ============================================================================
 */

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  const url = base.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/", // page d'accueil (vitrine)
          "/guide", // guide utilisateur (contenu utile)
          "/catalog/", // catalogues publics des boutiques
          "/register", // inscription
        ],
        disallow: [
          "/api/", // routes techniques
          "/dashboard", // espace privé
          "/sales",
          "/products",
          "/customers",
          "/inventory",
          "/employees",
          "/suppliers",
          "/promotions",
          "/deliveries",
          "/reservations",
          "/reports",
          "/settings",
          "/cash-history",
          "/superadmin", // espace d'administration
          "/login", // pas de contenu à indexer
        ],
      },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
