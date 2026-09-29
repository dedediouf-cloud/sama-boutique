import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ShoppingCart,
  Package,
  BarChart3,
  Globe,
  Smartphone,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Store,
  Truck,
  MessageCircle,
  FileSpreadsheet,
  UserCog,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  PAGE D'ACCUEIL PUBLIQUE (vitrine)
 * ============================================================================
 *  Avant : cette page redirigeait TOUT LE MONDE vers /login.
 *          Un visiteur qui découvrait l'application tombait sur un
 *          formulaire de connexion, sans explication ni bouton d'inscription.
 *
 *  Maintenant :
 *    • visiteur non connecté  → cette page de présentation
 *    • commerçant connecté    → redirection vers son tableau de bord
 *
 *  ⚡ Composant SERVEUR (aucun « use client ») :
 *     - la page s'affiche sans attendre JavaScript
 *     - Google peut l'indexer (avant : rien à indexer)
 *     - les textes sont en français, en dur : c'est une page marketing,
 *       elle ne doit pas dépendre du choix de langue du visiteur
 * ============================================================================
 */

/** Slug de la boutique de démonstration (créée par npm run demo:creer) */
const SLUG_DEMO = "demo";

export const metadata: Metadata = {
  title: "SamaBoutique — Gérez votre boutique, vos ventes et votre stock",
  description:
    "Logiciel de gestion pour les commerçants : caisse rapide, suivi du stock, clients, réservations et catalogue partageable sur WhatsApp. Essai gratuit, sans carte bancaire.",
  keywords: [
    "logiciel de gestion boutique",
    "caisse commerçant",
    "gestion de stock",
    "catalogue WhatsApp",
    "Sénégal",
    "Dakar",
    "SamaBoutique",
  ],
  openGraph: {
    title: "SamaBoutique — Gérez votre boutique simplement",
    description:
      "Caisse, stock, clients et catalogue WhatsApp. Essai gratuit, sans carte bancaire.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

/** Formate un montant à la française : 10 000 */
function montant(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}

export default async function HomePage() {
  const user = await getCurrentUser();

  // Un commerçant déjà connecté va directement à son tableau de bord
  if (user) {
    redirect("/dashboard");
  }

  /* ── Paramètres réels (durée d'essai, tarif) ─────────────────────────── */
  let essaiJours = 15;
  let prixMensuel = 10000;
  try {
    const reglages = await prisma.globalSettings.findUnique({ where: { id: "default" } });
    if (reglages?.trialDays && reglages.trialDays > 0) essaiJours = reglages.trialDays;
    if (reglages?.defaultMonthlyAmount && reglages.defaultMonthlyAmount > 0) {
      prixMensuel = reglages.defaultMonthlyAmount;
    }
  } catch {
    /* on garde les valeurs par défaut si la base n'est pas joignable */
  }

  /* ── La boutique de démonstration existe-t-elle ? ───────────────────── */
  let demoDisponible = false;
  try {
    const demo = await prisma.user.findUnique({
      where: { shopSlug: SLUG_DEMO },
      select: { id: true },
    });
    demoDisponible = Boolean(demo);
  } catch {
    demoDisponible = false;
  }

  const whatsapp = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/[^0-9]/g, "");
  const emailContact = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  const arguments_ = [
    {
      icone: Wallet,
      titre: "Encaissez en 10 secondes",
      texte:
        "Caisse simple : vous scannez ou vous choisissez le produit, vous encaissez. Espèces, Wave, Orange Money ou paiement à la livraison.",
    },
    {
      icone: Package,
      titre: "Votre stock se met à jour tout seul",
      texte:
        "Chaque vente déduit le stock. Vous êtes alerté avant la rupture, plus besoin de compter à la main en fin de journée.",
    },
    {
      icone: Globe,
      titre: "Un catalogue à partager sur WhatsApp",
      texte:
        "Un lien à envoyer à vos clients : ils voient vos produits, les prix, et peuvent réserver en un clic.",
    },
    {
      icone: BarChart3,
      titre: "Vous savez enfin ce que vous gagnez",
      texte:
        "Ventes du jour, bénéfices, produits qui partent le mieux, écarts de caisse : tout est calculé automatiquement.",
    },
  ];

  const fonctionnalites = [
    { icone: ShoppingCart, texte: "Caisse (point de vente) avec scanner de code-barres" },
    { icone: Package, texte: "Suivi de stock, alertes de rupture, inventaire" },
    { icone: Users, texte: "Fiche clients et programme de fidélité" },
    { icone: Globe, texte: "Catalogue en ligne partageable" },
    { icone: Clock, texte: "Réservations de clients à valider" },
    { icone: Truck, texte: "Livraisons à organiser" },
    { icone: FileSpreadsheet, texte: "Rapports et export de vos données" },
    { icone: UserCog, texte: "Comptes vendeurs avec droits limités" },
    { icone: Smartphone, texte: "Fonctionne sur téléphone, tablette et ordinateur" },
  ];

  const etapes = [
    { n: "1", titre: "Créez votre boutique", texte: "Un email, un nom de boutique, un mot de passe. C'est tout." },
    { n: "2", titre: "Ajoutez vos produits", texte: "À la main, ou en important votre liste depuis un fichier." },
    { n: "3", titre: "Vendez", texte: "Encaissez, suivez votre stock, partagez votre catalogue." },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#3D2B1F] overflow-x-hidden">
      {/* Données structurées pour Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SamaBoutique",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Logiciel de gestion de boutique : caisse, stock, clients, réservations et catalogue en ligne.",
            offers: {
              "@type": "Offer",
              price: prixMensuel,
              priceCurrency: "XOF",
            },
          }),
        }}
      />

      {/* ═══════════════════ EN-TÊTE ═══════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#FFFBF5]/85 backdrop-blur-md border-b border-[#D4AF37]/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shadow-sm">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-[family-name:var(--font-playfair)] text-xl font-semibold">
              SamaBoutique
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm text-[#5C4033]">
            <a href="#fonctionnalites" className="hover:text-[#B87333] transition-colors">
              Fonctionnalités
            </a>
            <a href="#tarif" className="hover:text-[#B87333] transition-colors">
              Tarif
            </a>
            {demoDisponible && (
              <Link href={`/catalog/${SLUG_DEMO}`} className="hover:text-[#B87333] transition-colors">
                Démo
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-medium text-[#5C4033] hover:bg-[#D4AF37]/10 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="px-4 py-2.5 rounded-xl btn-luxe text-sm font-medium"
            >
              Créer ma boutique
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════ SECTION PRINCIPALE ═══════════════════ */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24">
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute top-10 -left-20 w-72 h-72 sm:w-96 sm:h-96 bg-[#D4AF37]/15 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute top-40 -right-20 w-72 h-72 sm:w-96 sm:h-96 bg-[#B87333]/12 rounded-full blur-[110px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/25 text-xs sm:text-sm font-medium text-[#8A6D2F] mb-6">
              <CheckCircle size={15} />
              {`${essaiJours} jours d'essai gratuit · sans carte bancaire`}
            </div>

            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6">
              Gérez votre boutique
              <span className="block bg-gradient-to-r from-[#D4AF37] to-[#B87333] bg-clip-text text-transparent">
                sans cahier, ni calculatrice
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#5C4033] leading-relaxed mb-9 max-w-2xl">
              Enregistrez vos ventes, suivez votre stock, gardez la trace de vos clients et
              partagez votre catalogue sur WhatsApp. Le tout depuis votre téléphone.
            </p>

            {/* ── LES DEUX BOUTONS ── */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl btn-luxe text-base font-semibold shadow-lg shadow-[#D4AF37]/25"
              >
                Créer ma boutique
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>

              {demoDisponible ? (
                <Link
                  href={`/catalog/${SLUG_DEMO}`}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl border-2 border-[#D4AF37]/40 text-[#5C4033] font-semibold hover:bg-[#D4AF37]/10 transition-colors"
                >
                  <Globe size={18} />
                  Voir la démo du catalogue
                </Link>
              ) : (
                <a
                  href="#fonctionnalites"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl border-2 border-[#D4AF37]/40 text-[#5C4033] font-semibold hover:bg-[#D4AF37]/10 transition-colors"
                >
                  Voir les fonctionnalités
                </a>
              )}
            </div>

            <p className="text-sm text-[#5C4033]/70 mt-4">
              Aucune carte bancaire demandée. Vous arrêtez quand vous voulez.
            </p>
          </div>

          {/* Aperçu visuel */}
          <div className="mt-14 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {[
              { icone: ShoppingCart, titre: "Vente", valeur: "10 s" },
              { icone: Package, titre: "Stock à jour", valeur: "auto" },
              { icone: Globe, titre: "Catalogue", valeur: "1 lien" },
              { icone: BarChart3, titre: "Rapports", valeur: "1 clic" },
            ].map((c) => (
              <div key={c.titre} className="glass rounded-2xl p-4 sm:p-5">
                <c.icone size={20} className="text-[#B87333] mb-2.5" />
                <p className="text-lg sm:text-xl font-semibold font-[family-name:var(--font-playfair)]">
                  {c.valeur}
                </p>
                <p className="text-xs sm:text-sm text-[#5C4033]/75">{c.titre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ POURQUOI ═══════════════════ */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-transparent to-[#FDF6E3]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-center mb-3">
            Ce que ça change au quotidien
          </h2>
          <p className="text-center text-[#5C4033] mb-12 max-w-2xl mx-auto">
            Pensé pour les commerçants qui n&apos;ont pas le temps d&apos;apprendre un logiciel compliqué.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {arguments_.map((a) => (
              <div key={a.titre} className="glass-strong rounded-3xl p-6 sm:p-7">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/15 flex items-center justify-center mb-4">
                  <a.icone size={22} className="text-[#B87333]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{a.titre}</h3>
                <p className="text-sm sm:text-base text-[#5C4033] leading-relaxed">{a.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ COMMENT ÇA MARCHE ═══════════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-center mb-12">
            Vous êtes prêt en 3 étapes
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {etapes.map((e) => (
              <div key={e.n} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center text-white text-xl font-semibold shadow-md shadow-[#D4AF37]/25 mb-4">
                  {e.n}
                </div>
                <h3 className="font-semibold mb-1.5">{e.titre}</h3>
                <p className="text-sm text-[#5C4033]">{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FONCTIONNALITÉS ═══════════════════ */}
      <section id="fonctionnalites" className="py-16 sm:py-24 bg-[#FDF6E3]/50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-center mb-3">
            Tout ce dont votre boutique a besoin
          </h2>
          <p className="text-center text-[#5C4033] mb-12 max-w-2xl mx-auto">
            Rien de superflu : uniquement ce qui vous fait gagner du temps et de l&apos;argent.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {fonctionnalites.map((f) => (
              <div
                key={f.texte}
                className="flex items-start gap-3 bg-white/70 rounded-2xl p-4 border border-[#D4AF37]/15"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/12 flex items-center justify-center shrink-0">
                  <f.icone size={17} className="text-[#B87333]" />
                </div>
                <p className="text-sm text-[#5C4033] leading-relaxed pt-1.5">{f.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TARIF ═══════════════════ */}
      <section id="tarif" className="py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-center mb-3">
            Un tarif simple
          </h2>
          <p className="text-center text-[#5C4033] mb-12">
            Pas de frais d&apos;installation, pas de commission sur vos ventes.
          </p>

          <div className="glass-strong rounded-3xl p-7 sm:p-10 border-t-4 border-[#D4AF37] max-w-xl mx-auto">
            <div className="text-center mb-7">
              <p className="text-sm text-[#5C4033]/80 mb-2">Abonnement mensuel</p>
              <p className="font-[family-name:var(--font-playfair)] text-5xl font-semibold">
                {montant(prixMensuel)}
                <span className="text-2xl ml-2 text-[#5C4033]">FCFA</span>
              </p>
              <p className="text-sm text-[#5C4033]/70 mt-2">
                Commencez par {essaiJours} jours offerts
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Toutes les fonctionnalités incluses",
                "Aucune commission sur vos ventes",
                `Premiers ${essaiJours} jours gratuits`,
                "Vos données restent les vôtres (export à tout moment)",
                "Assistance par WhatsApp",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm sm:text-base text-[#5C4033]">
                  <CheckCircle size={18} className="text-[#B87333] shrink-0 mt-0.5" />
                  {point}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl btn-luxe text-base font-semibold"
            >
              Démarrer l&apos;essai gratuit
              <ArrowRight size={18} />
            </Link>
            <p className="text-xs text-center text-[#5C4033]/60 mt-3">
              Sans carte bancaire · sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ CONTACT ═══════════════════ */}
      <section className="py-14 sm:py-20 bg-gradient-to-br from-[#3D2B1F] via-[#4A3328] to-[#5C4033] text-[#FDF6E3]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-semibold mb-3">
            Une question avant de commencer ?
          </h2>
          <p className="text-[#FDF6E3]/80 mb-8">
            Écrivez-nous, nous vous répondons rapidement. Nous pouvons aussi vous montrer
            l&apos;application en direct.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Bonjour, je voudrais des informations sur SamaBoutique."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#25D366] text-white font-semibold hover:brightness-110 transition-all"
              >
                <MessageCircle size={19} />
                Écrire sur WhatsApp
              </a>
            )}
            {emailContact && (
              <a
                href={`mailto:${emailContact}?subject=${encodeURIComponent(
                  "Informations sur SamaBoutique"
                )}`}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl border-2 border-[#D4AF37]/40 text-[#FDF6E3] font-semibold hover:bg-white/10 transition-colors"
              >
                {emailContact}
              </a>
            )}
            {!whatsapp && !emailContact && (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl btn-luxe font-semibold"
              >
                Créer ma boutique
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PIED DE PAGE ═══════════════════ */}
      <footer className="py-10 bg-[#3D2B1F] text-[#FDF6E3]/60 text-sm border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center">
              <Store size={14} className="text-white" />
            </div>
            <span>© {new Date().getFullYear()} SamaBoutique</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#FDF6E3] transition-colors">
              Se connecter
            </Link>
            <Link href="/register" className="hover:text-[#FDF6E3] transition-colors">
              Créer ma boutique
            </Link>
            {demoDisponible && (
              <Link href={`/catalog/${SLUG_DEMO}`} className="hover:text-[#FDF6E3] transition-colors">
                Démo
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
