#!/usr/bin/env node
/**
 * ============================================================================
 *  GÉNÉRATEUR DE LA PAGE GUIDE
 * ============================================================================
 *
 *  Usage :
 *      node scripts/generer-guide.js
 *      npm run guide:generer
 *
 *  Que fait ce script ?
 *    Il lit le fichier Word « SamaBoutique-Guide-Utilisateur.docx » et
 *    régénère le fichier src/lib/guide-data.ts, qui alimente la page
 *    publique /guide.
 *
 *  Quand l'utiliser ?
 *    Chaque fois que tu modifies le guide Word. Tu lances cette commande,
 *    puis tu publies : la page /guide se met à jour toute seule.
 *
 *  ⚠️  Sans cette commande, la page /guide garderait l'ancienne version.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const DOCX = path.join(process.cwd(), "SamaBoutique-Guide-Utilisateur.docx");
const SORTIE = path.join(process.cwd(), "src", "lib", "guide-data.ts");

const c = {
  vert: (t) => `\x1b[32m${t}\x1b[0m`,
  rouge: (t) => `\x1b[31m${t}\x1b[0m`,
  jaune: (t) => `\x1b[33m${t}\x1b[0m`,
  gras: (t) => `\x1b[1m${t}\x1b[0m`,
  gris: (t) => `\x1b[90m${t}\x1b[0m`,
};
const couleurs = process.stdout.isTTY ? c : Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (t) => t]));

/* ── Lecture du .docx (c'est une archive ZIP contenant du XML) ─────────── */
function lireDocx(chemin) {
  // Un .docx est un ZIP : on le lit sans dépendance externe
  const { execSync } = require("child_process");
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "docx-"));

  try {
    execSync(`unzip -o -q "${chemin}" -d "${tmp}"`, { stdio: "ignore" });
  } catch {
    // Repli : certains systèmes n'ont pas « unzip »
    throw new Error(
      "Impossible d'extraire le .docx. Installe « unzip » ou renomme le fichier en .zip et extrais-le à la main."
    );
  }

  const xml = fs.readFileSync(path.join(tmp, "word", "document.xml"), "utf-8");
  fs.rmSync(tmp, { recursive: true, force: true });
  return xml;
}

function texteDe(fragment) {
  const morceaux = [...fragment.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
  return morceaux.join("").trim();
}

function extraire(xml) {
  const corps = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!corps) throw new Error("Structure du document Word non reconnue");

  const elements = corps[1].match(/<w:p[ >][\s\S]*?<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  const blocs = [];

  for (const el of elements) {
    /* Tableau */
    if (el.startsWith("<w:tbl")) {
      const lignes = [...el.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)]
        .map((tr) => [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) => texteDe(tc[0])))
        .filter((l) => l.some((cellule) => cellule));
      if (lignes.length) blocs.push({ type: "tableau", lignes });
      continue;
    }

    /* Paragraphe */
    const style = (el.match(/<w:pStyle w:val="([^"]+)"/) || [, "Normal"])[1];
    const texte = texteDe(el);
    if (!texte) continue;

    if (style.startsWith("Heading1")) blocs.push({ type: "h2", texte });
    else if (style.startsWith("Heading")) blocs.push({ type: "h3", texte });
    else if (style.includes("List") || el.includes("<w:numPr>")) {
      const dernier = blocs[blocs.length - 1];
      if (dernier && dernier.type === "liste") dernier.items.push(texte);
      else blocs.push({ type: "liste", items: [texte] });
    } else blocs.push({ type: "p", texte });
  }

  /* Retirer la page de titre et la table des matières */
  const debut = blocs.findIndex((b) => (b.texte || "").startsWith("1. Introduction"));
  return debut > 0 ? blocs.slice(debut) : blocs;
}

/* ── Corrections à appliquer après extraction ──────────────────────────── */
/* Certaines phrases du document Word peuvent ne plus correspondre à
   l'application. On les ajuste ici automatiquement. */
const CORRECTIONS = [
  {
    debut: "Pour les paiements Orange Money ou Wave, indiquez",
    remplacement:
      "Le paiement mobile en ligne (Orange Money / Wave) n'est pas encore activé : il nécessite un compte marchand et une configuration. Pour l'instant, encaissez en espèces, par QR code marchand, ou à la livraison.",
  },
  {
    debut: "⚠️ Important : Pendant la phase de test, les paiements",
    remplacement:
      "⚠️ Important : si le paiement mobile en ligne est refusé, c'est qu'il n'est pas encore configuré pour votre boutique. Utilisez un autre mode de paiement.",
  },
  {
    debut: "En phase de test, les paiements sont simulés",
    remplacement:
      "Le paiement mobile en ligne nécessite un compte marchand (Wave Business ou Orange Money Marchand) et une configuration. Tant qu'il n'est pas activé, utilisez les espèces, le QR code marchand ou le paiement à la livraison.",
  },
];

function appliquerCorrections(blocs) {
  let n = 0;
  for (const b of blocs) {
    if (b.type !== "p") continue;
    for (const cor of CORRECTIONS) {
      if (b.texte.startsWith(cor.debut)) {
        b.texte = cor.remplacement;
        n++;
      }
    }
  }
  return n;
}

/* ── Génération du fichier TypeScript ──────────────────────────────────── */
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function generer(blocs) {
  const l = [];
  l.push(`/**
 * ============================================================================
 *  CONTENU DU GUIDE UTILISATEUR
 * ============================================================================
 *  ⚠️  FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 *  Source  : SamaBoutique-Guide-Utilisateur.docx
 *  Généré  : ${new Date().toISOString().slice(0, 10)} par scripts/generer-guide.js
 *  Commande : npm run guide:generer
 *
 *  Ce contenu alimente la page publique /guide, qui sert à la fois :
 *    • aux commerçants (documentation consultable sur téléphone)
 *    • au référencement Google (contenu utile et unique)
 *
 *  ➜ Pour mettre à jour : modifie le fichier Word, puis relance
 *     « npm run guide:generer » et publie.
 * ============================================================================
 */

export type BlocGuide =
  | { type: "h2"; texte: string }
  | { type: "h3"; texte: string }
  | { type: "p"; texte: string }
  | { type: "liste"; items: string[] }
  | { type: "tableau"; lignes: string[][] };

export const GUIDE_VERSION = "1.1";

export const GUIDE_TITRE = "Guide utilisateur SamaBoutique";

/** Résumé affiché en haut de page et dans les résultats Google */
export const GUIDE_INTRO =
  "Tout ce que vous pouvez faire avec SamaBoutique, pas à pas : stock, caisse, clients, réservations, livraisons, promotions, catalogue WhatsApp et abonnements. Consultable sur téléphone.";

export const guideSections: BlocGuide[] = [`);

  for (const b of blocs) {
    if (b.type === "h2" || b.type === "h3" || b.type === "p")
      l.push(`  { type: "${b.type}", texte: "${esc(b.texte)}" },`);
    else if (b.type === "liste")
      l.push(`  { type: "liste", items: [${b.items.map((i) => `"${esc(i)}"`).join(", ")}] },`);
    else if (b.type === "tableau")
      l.push(
        `  { type: "tableau", lignes: [${b.lignes
          .map((r) => `[${r.map((c) => `"${esc(c)}"`).join(", ")}]`)
          .join(", ")}] },`
      );
  }

  l.push(`];

/** Transforme un titre en identifiant d'ancre (pour les liens du sommaire) */
export function ancreDe(titre: string) {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
`);

  return l.join("\n");
}

/* ── Programme principal ───────────────────────────────────────────────── */
function main() {
  console.log(couleurs.gras("\n📘  GÉNÉRATION DE LA PAGE GUIDE\n"));

  if (!fs.existsSync(DOCX)) {
    console.log(couleurs.rouge(`   ❌ Fichier introuvable : ${path.basename(DOCX)}\n`));
    console.log("   Il doit se trouver à la racine du projet, à côté de package.json.\n");
    process.exitCode = 1;
    return;
  }

  const taille = (fs.statSync(DOCX).size / 1024).toFixed(0);
  console.log(`   Source : ${path.basename(DOCX)} (${taille} Ko)`);

  const xml = lireDocx(DOCX);
  const blocs = extraire(xml);
  const corrections = appliquerCorrections(blocs);

  const sections = blocs.filter((b) => b.type === "h2").length;
  const sousSections = blocs.filter((b) => b.type === "h3").length;
  const mots = blocs.reduce((n, b) => {
    if (b.texte) return n + b.texte.split(/\s+/).length;
    if (b.items) return n + b.items.join(" ").split(/\s+/).length;
    return n;
  }, 0);

  console.log(`   Extrait : ${blocs.length} blocs · ${sections} sections · ${sousSections} sous-sections · ~${mots} mots`);
  if (corrections > 0) {
    console.log(couleurs.jaune(`   ✎ ${corrections} passage(s) ajusté(s) pour refléter l'application actuelle`));
  }

  fs.writeFileSync(SORTIE, generer(blocs), "utf-8");
  console.log(couleurs.vert(`\n   ✅ ${path.relative(process.cwd(), SORTIE)} régénéré\n`));
  console.log(couleurs.gris("   Prochaine étape : publie pour mettre à jour la page /guide\n"));
}

try {
  main();
} catch (e) {
  console.error(couleurs.rouge(`\n   ❌ ${e.message}\n`));
  process.exitCode = 1;
}
