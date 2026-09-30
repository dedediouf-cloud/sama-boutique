import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import {
  guideSections,
  GUIDE_TITRE,
  GUIDE_INTRO,
  GUIDE_VERSION,
  ancreDe,
  type BlocGuide,
} from "@/lib/guide-data";

/**
 * ============================================================================
 *  PAGE PUBLIQUE — GUIDE UTILISATEUR  (/guide)
 * ============================================================================
 *  Cette page sert DEUX objectifs :
 *
 *  1. POUR LES COMMERÇANTS
 *     Le guide est consultable sur téléphone, toujours à jour, sans rien
 *     installer. C'est le lien envoyé automatiquement à l'inscription, puis
 *     à l'activation de l'abonnement. (Avant : un fichier Word de 43 Ko,
 *     peu pratique à lire sur mobile.)
 *
 *  2. POUR GOOGLE (référencement)
 *     Un contenu long (~2 700 mots), unique et utile, réparti en 17 sections.
 *     C'est exactement ce que Google valorise : les curieux qui cherchent
 *     « comment gérer le stock d'une boutique » ou « logiciel caisse Sénégal »
 *     peuvent tomber sur cette page, puis découvrir l'application.
 *
 *  ⚡ Composant SERVEUR : aucune ligne de JavaScript envoyée au visiteur,
 *     la page s'affiche immédiatement, même sur un téléphone modeste.
 * ============================================================================
 */

export const metadata: Metadata = {
  title: `Guide utilisateur — ${GUIDE_TITRE}`,
  description: GUIDE_INTRO,
  keywords: [
    "guide logiciel boutique",
    "comment gérer son stock",
    "utiliser une caisse",
    "catalogue WhatsApp commerçant",
    "gestion boutique Sénégal",
    "SamaBoutique guide",
  ],
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "Guide utilisateur SamaBoutique",
    description: GUIDE_INTRO,
    type: "article",
  },
  robots: { index: true, follow: true },
};

/* ── Rendu d'un bloc de contenu ──────────────────────────────────────────── */
function Bloc({ bloc, index }: { bloc: BlocGuide; index: number }) {
  switch (bloc.type) {
    case "h2":
      return (
        <h2
          id={ancreDe(bloc.texte)}
          className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-semibold text-[#3D2B1F] mt-12 mb-4 scroll-mt-24 pb-2 border-b border-[#D4AF37]/25"
        >
          {bloc.texte}
        </h2>
      );

    case "h3":
      return (
        <h3
          id={ancreDe(bloc.texte)}
          className="text-lg sm:text-xl font-semibold text-[#5C4033] mt-8 mb-3 scroll-mt-24"
        >
          {bloc.texte}
        </h3>
      );

    case "p": {
      // Les remarques (💡 astuce, ⚠️ attention) sont mises en valeur
      const estAstuce = bloc.texte.startsWith("💡");
      const estAlerte = bloc.texte.startsWith("⚠️");

      if (estAstuce || estAlerte) {
        return (
          <div
            className={`rounded-2xl p-4 my-4 border text-sm sm:text-[15px] leading-relaxed ${
              estAlerte
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-[#FDF6E3]/70 border-[#D4AF37]/25 text-[#5C4033]"
            }`}
          >
            {bloc.texte}
          </div>
        );
      }

      return (
        <p className="text-[15px] sm:text-base text-[#5C4033] leading-relaxed my-3">
          {bloc.texte}
        </p>
      );
    }

    case "liste":
      return (
        <ul className="my-4 space-y-2">
          {bloc.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] sm:text-base text-[#5C4033]">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#B87333] shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "tableau":
      return (
        <div className="my-5 overflow-x-auto rounded-2xl border border-[#D4AF37]/20">
          <table className="w-full text-sm sm:text-[15px]">
            <tbody>
              {bloc.lignes.map((ligne, i) => (
                <tr
                  key={i}
                  className={i === 0 ? "bg-[#FDF6E3]/70" : i % 2 ? "bg-white/40" : "bg-white/70"}
                >
                  {ligne.map((cellule, j) => (
                    <td
                      key={j}
                      className={`px-4 py-3 text-[#5C4033] align-top ${
                        i === 0 ? "font-semibold text-[#3D2B1F]" : ""
                      }`}
                    >
                      {cellule}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

export default function GuidePage() {
  // Sommaire : uniquement les grandes sections
  const sommaire = guideSections.filter((b) => b.type === "h2");

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#3D2B1F]">
      {/* Données structurées : aide Google à comprendre la page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: GUIDE_TITRE,
            description: GUIDE_INTRO,
            inLanguage: "fr",
            about: { "@type": "SoftwareApplication", name: "SamaBoutique" },
            step: sommaire.map((section) => ({
              "@type": "HowToSection",
              name: section.texte,
            })),
          }),
        }}
      />

      {/* ═══ Bandeau ═══ */}
      <header className="bg-gradient-to-br from-[#3D2B1F] via-[#4A3328] to-[#5C4033] text-[#FDF6E3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#FDF6E3] transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Retour à l&apos;accueil
          </Link>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shrink-0">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold mb-3">
                {GUIDE_TITRE}
              </h1>
              <p className="text-[#FDF6E3]/85 leading-relaxed max-w-2xl">{GUIDE_INTRO}</p>
              <p className="text-xs text-[#FDF6E3]/60 mt-4 flex items-center gap-1.5">
                <Clock size={13} />
                Version {GUIDE_VERSION} · {sommaire.length} sections · lecture 10 minutes
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* ═══ Sommaire ═══ */}
        <nav className="glass-strong rounded-3xl p-6 sm:p-7 mb-12">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold mb-4">
            Sommaire
          </h2>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {sommaire.map((section) => (
              <li key={section.texte}>
                <a
                  href={`#${ancreDe(section.texte)}`}
                  className="text-sm text-[#B87333] hover:text-[#5C4033] hover:underline transition-colors"
                >
                  {section.texte}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ═══ Contenu ═══ */}
        <article>
          {guideSections.map((bloc, i) => (
            <Bloc key={i} bloc={bloc} index={i} />
          ))}
        </article>

        {/* ═══ Pied de page ═══ */}
        <div className="mt-16 glass-strong rounded-3xl p-6 sm:p-8 text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl sm:text-2xl font-semibold mb-3">
            Prêt à essayer ?
          </h2>
          <p className="text-[#5C4033] mb-6 text-sm sm:text-base">
            Créez votre boutique en 2 minutes. 15 jours d&apos;essai gratuit, sans carte bancaire.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl btn-luxe font-semibold"
            >
              Créer ma boutique
            </Link>
            <Link
              href="/catalog/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-[#D4AF37]/40 text-[#5C4033] font-semibold hover:bg-[#D4AF37]/10 transition-colors"
            >
              Voir la démo
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#5C4033]/50 mt-8">
          Guide version {GUIDE_VERSION} · SamaBoutique
        </p>
      </div>
    </div>
  );
}
