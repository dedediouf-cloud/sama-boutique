#!/usr/bin/env node
/**
 * ============================================================================
 *  VÉRIFICATION DES CHANGEMENTS DE SCHÉMA  —  AVANT DÉPLOIEMENT
 * ============================================================================
 *
 *  Usage :
 *      npm run db:verifier
 *      npm run db:verifier -- "postgresql://...neon.tech/neondb"
 *
 *  Que fait ce script ?
 *    1. Il demande à Prisma quelles modifications seront appliquées à la base
 *       lors du prochain déploiement.
 *    2. Il détecte les opérations DESTRUCTRICES (suppression de table ou de
 *       colonne, changement de type…).
 *    3. Il affiche un rapport clair.
 *
 *  Pourquoi ? Depuis que le déploiement n'utilise plus --accept-data-loss,
 *  une opération destructrice fait ÉCHOUER le build au lieu de détruire des
 *  données. Ce script permet de le savoir AVANT de pousser, et non en
 *  découvrant un échec sur Vercel.
 * ============================================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const c = {
  rouge: (t) => `\x1b[31m${t}\x1b[0m`,
  vert: (t) => `\x1b[32m${t}\x1b[0m`,
  jaune: (t) => `\x1b[33m${t}\x1b[0m`,
  bleu: (t) => `\x1b[36m${t}\x1b[0m`,
  gras: (t) => `\x1b[1m${t}\x1b[0m`,
  gris: (t) => `\x1b[90m${t}\x1b[0m`,
};
const couleurs = process.stdout.isTTY ? c : Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (t) => t]));

/* ── 1. Quel schéma ? ─────────────────────────────────────────────────── */
const argUrl = process.argv.slice(2).find((a) => /^(file:|postgres(ql)?:\/\/)/i.test(a));
if (argUrl) process.env.DATABASE_URL = argUrl;

const url = process.env.DATABASE_URL || "";

/* On choisit le schéma correspondant à la base :
   - base PostgreSQL  -> prisma/schema.prod.prisma
   - base SQLite      -> prisma/schema.prisma
   (forçable avec --schema=...) */
const schemaForce = process.argv.find((a) => a.startsWith("--schema="))?.split("=")[1];
const schema =
  schemaForce ||
  (/^postgres(ql)?:\/\//i.test(url) && fs.existsSync("prisma/schema.prod.prisma")
    ? "prisma/schema.prod.prisma"
    : "prisma/schema.prisma");
const masque = url ? url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@") : "(non définie)";
const estProd = /^postgres(ql)?:\/\//i.test(url) && !/localhost|127\.0\.0\.1/.test(url);

console.log(couleurs.gras("\n🔍 VÉRIFICATION DES CHANGEMENTS DE SCHÉMA\n"));
console.log(`   Schéma : ${schema}`);
console.log(`   Base   : ${masque}`);
console.log(
  `   Type   : ${estProd ? couleurs.vert("PRODUCTION") : url.startsWith("file:") ? couleurs.jaune("LOCALE (développement)") : "inconnu"}\n`
);

if (!url) {
  console.log(couleurs.rouge("   ❌ DATABASE_URL n'est pas définie.\n"));
  console.log("   Donne l'URL de ta base :");
  console.log(couleurs.gris('     npm run db:verifier -- "postgresql://...neon.tech/neondb"'));
  console.log(couleurs.gris('     npm run db:verifier -- "file:./dev.db"   (base locale)\n'));
  process.exit(1);
}

/* ── 2. Demander à Prisma le différentiel ─────────────────────────────── */
let sql = "";
try {
  sql = execSync(
    `npx prisma migrate diff --from-schema-datasource ${schema} --to-schema-datamodel ${schema} --script`,
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );
} catch (e) {
  const msg = String(e.stdout || e.stderr || e.message).split("\n").filter(Boolean).slice(-4).join("\n");
  console.log(couleurs.rouge("   ❌ Impossible de comparer le schéma et la base :"));
  console.log(couleurs.gris("     " + msg.replace(/\n/g, "\n     ")));
  console.log();
  if (/can't reach|ENOTFOUND|P1001/i.test(msg)) {
    console.log("   → Base injoignable : vérifie l'URL (base Neon en veille ?).");
  } else if (/must start with the protocol/i.test(msg)) {
    console.log("   → Le client Prisma installé ne correspond pas à cette base.");
    console.log(couleurs.gris("     PostgreSQL : npx prisma generate --schema=prisma/schema.prod.prisma"));
    console.log(couleurs.gris("     SQLite     : npx prisma generate --schema=prisma/schema.prisma"));
  }
  console.log();
  process.exit(1);
}

/* ── 3. Analyse du SQL ────────────────────────────────────────────────── */
const nettoye = sql
  .split("\n")
  .filter((l) => l.trim() && !l.trim().startsWith("--"))
  .join("\n");

if (!nettoye.trim()) {
  console.log(couleurs.vert("   ✅ AUCUN CHANGEMENT à appliquer."));
  console.log(couleurs.gris("      La base est déjà à jour avec le schéma.\n"));
  process.exit(0);
}

const instructions = nettoye
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const destructrices = [];
const ajouts = [];
const autres = [];

const estReconstructionSqlite = /CREATE\s+TABLE\s+"new_/i.test(nettoye);

for (const inst of instructions) {
  const table = /(?:TABLE|ALTER TABLE)\s+"?([A-Za-z_]+)"?/i.exec(inst)?.[1] || "?";
  // tous les noms de colonnes cités (gère les modifications multi-colonnes)
  const nomsColonnes = [...inst.matchAll(/COLUMN\s+"?([A-Za-z_]+)"?/gi)].map((m) => m[1]);
  const colonne = nomsColonnes.length
    ? nomsColonnes.join(", ")
    : /ADD\s+"?([A-Za-z_]+)"?/i.exec(inst)?.[1] || "";

  // Prisma reconstruit parfois une table (motif interne) : on l'ignore,
  // ce n'est pas une vraie création/suppression demandée par l'utilisateur.
  const estTableTemporaire = /^new_/i.test(table);

  if (/CREATE\s+TABLE\s+"new_/i.test(inst)) {
    continue; // table de travail interne
  }
  if (/INSERT\s+INTO\s+"new_/i.test(inst) || /RENAME\s+TO/i.test(inst)) {
    continue; // opérations internes de reconstruction
  }
  if (/PRAGMA\s+(defer_foreign_keys|foreign_keys)/i.test(inst)) {
    continue;
  }

  if (/DROP\s+INDEX/i.test(inst)) {
    // un index ne contient aucune donnée : pas de perte, juste moins rapide
    const nomIndex = /DROP\s+INDEX\s+"?([A-Za-z_0-9]+)"?/i.exec(inst)?.[1] || "?";
    autres.push(`Index « ${nomIndex} » supprimé (aucune donnée perdue, seulement moins rapide)`);
  } else if (/DROP\s+TABLE/i.test(inst)) {
    if (estTableTemporaire) continue;
    // En reconstruction SQLite, ce DROP fait partie du remplacement de la table
    if (estReconstructionSqlite && /DROP\s+TABLE\s+"(?!new_)/i.test(inst)) {
      continue;
    }
    destructrices.push(`Suppression de la TABLE « ${table} » — toutes ses lignes sont perdues`);
  } else if (/DROP\s+COLUMN/i.test(inst)) {
    destructrices.push(
      `Suppression de la COLONNE « ${colonne} » de la table « ${table} » — ses valeurs sont perdues`
    );
  } else if (/ALTER\s+COLUMN.*(?:TYPE|SET\s+NOT\s+NULL)/i.test(inst)) {
    destructrices.push(
      `Modification du TYPE de « ${colonne} » dans « ${table} » — conversion des données`
    );
  } else if (/ALTER\s+TABLE[\s\S]*DROP\s+CONSTRAINT/i.test(inst)) {
    autres.push(`Contrainte modifiée sur « ${table} »`);
  } else if (/CREATE\s+TABLE/i.test(inst)) {
    if (estTableTemporaire) continue;
    ajouts.push(`Nouvelle table « ${table} »`);
  } else if (/ADD\s+COLUMN/i.test(inst)) {
    ajouts.push(`Nouvelle colonne « ${colonne} » dans « ${table} »`);
  } else if (/CREATE\s+(?:UNIQUE\s+)?INDEX/i.test(inst)) {
    autres.push(`Nouvel index sur « ${table} »`);
  }
}

/* En SQLite, Prisma reconstruit les tables concernées : la détection reste
   indicative. Sur PostgreSQL (production), le SQL est direct et fiable. */
if (estReconstructionSqlite) {
  const tables = [
    ...new Set(
      [...nettoye.matchAll(/CREATE\s+TABLE\s+"new_(\w+)"/gi)].map((m) => m[1])
    ),
  ];
  if (tables.length) {
    autres.push(
      `Base locale SQLite — tables restructurées : ${tables.join(", ")}. Prisma les reconstruit intégralement (les données sont recopiées). Pour un détail fiable des colonnes ajoutées ou supprimées, lance cette vérification sur la base de production (PostgreSQL).`
    );
  }
}

/* ── 4. Rapport ───────────────────────────────────────────────────────── */
console.log(couleurs.gras(`   ${instructions.length} modification(s) détectée(s) :\n`));

if (ajouts.length) {
  console.log(couleurs.vert("   AJOUTS (sans danger) :"));
  ajouts.slice(0, 20).forEach((a) => console.log(couleurs.gris(`     + ${a}`)));
  if (ajouts.length > 20) console.log(couleurs.gris(`     … et ${ajouts.length - 20} autre(s)`));
  console.log();
}

if (autres.length) {
  console.log(couleurs.bleu("   AUTRES CHANGEMENTS :"));
  [...new Set(autres)].slice(0, 15).forEach((a) => console.log(couleurs.gris(`     • ${a}`)));
  console.log();
}

if (destructrices.length) {
  console.log(couleurs.rouge(couleurs.gras("   ⚠️  OPÉRATIONS DESTRUCTRICES :")));
  [...new Set(destructrices)].forEach((d) => console.log(couleurs.rouge(`     ⚠️  ${d}`)));
  console.log();
  console.log(couleurs.jaune("   CONSÉQUENCE :"));
  console.log(couleurs.jaune("     Le déploiement Vercel va ÉCHOUER à l'étape « prisma db push »."));
  console.log(couleurs.gris("     (C'est volontaire : sans --accept-data-loss, Prisma refuse de"));
  console.log(couleurs.gris("      détruire des données. Avant, il les détruisait silencieusement.)"));
  console.log();
  console.log(couleurs.gras("   QUE FAIRE :"));
  console.log("     1. Fais une sauvegarde de toutes les boutiques AVANT toute chose :");
  console.log(couleurs.gris("        Espace Super Admin → bouton « Sauvegardes » → Sauvegarder maintenant"));
  console.log("     2. Si la suppression est INVOLONTAIRE (modèle retiré du schéma par erreur) :");
  console.log(couleurs.gris("        remets-le dans prisma/schema.prod.prisma, puis relance ce script."));
  console.log("     3. Si la suppression est VOLONTAIRE :");
  console.log(couleurs.gris("        tu peux forcer avec --accept-data-loss, mais SEULEMENT après"));
  console.log(couleurs.gris("        avoir une sauvegarde et vérifié que tu ne perds rien d'utile."));
  console.log();
  process.exitCode = 2;
} else {
  console.log(couleurs.vert(couleurs.gras("   ✅ AUCUNE OPÉRATION DESTRUCTRICE.")));
  console.log(couleurs.gris("      Le déploiement appliquera ces changements sans perte de données.\n"));
}

console.log(couleurs.gris("   ─".repeat(30)));
console.log(couleurs.gris("   Détail SQL complet :"));
console.log(couleurs.gris(nettoye.split("\n").slice(0, 40).map((l) => "   " + l).join("\n")));
if (nettoye.split("\n").length > 40) {
  console.log(couleurs.gris(`   … (${nettoye.split("\n").length - 40} lignes supplémentaires masquées)`));
}
console.log();
