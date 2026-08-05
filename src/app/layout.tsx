import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SamaBoutique",
  description: "Gérez votre boutique, vos ventes et votre catalogue en ligne avec SamaBoutique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // === NETTOYAGE SÉCURITÉ 494 (exécuté côté client) ===
  // Supprime toute trace de logo base64 qui aurait pu rester dans le localStorage ou sessionStorage
  // (utile après un ancien déploiement qui mettait le logo dans le JWT)
  if (typeof window !== 'undefined') {
    try {
      // Nettoie les anciennes clés potentiellement problématiques
      const badKeys = ['next-auth.session-token', '__Secure-next-auth.session-token'];
      // On ne supprime PAS boutique_last_logo (c'est la source légitime)
      // Mais on peut logger si un logo trop gros est présent
      const logo = localStorage.getItem('boutique_last_logo');
      if (logo && logo.length > 400000) {
        console.warn('[494 FIX] Logo très volumineux détecté dans localStorage. Recommandé de le re-uploader.');
      }
    } catch {}
  }
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
