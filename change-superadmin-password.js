/**
 * ============================================================================
 *  CHANGER LE MOT DE PASSE DU SUPER ADMIN
 * ============================================================================
 *
 *  Utilisation :
 *      node change-superadmin-password.js NouveauMotDePasse2026
 *      node change-superadmin-password.js NouveauMotDePasse2026 "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
 *
 *  ⚠️  SANS le 2e argument, le script utilise la DATABASE_URL du fichier .env
 *      — c'est souvent la base LOCALE, pas la production.
 *      Le script affiche TOUJOURS la base qu'il modifie, AVANT de la modifier,
 *      et VÉRIFIE le changement après écriture.
 *
 *  Compte par défaut : superadmin@boutique.com
 *  Autre compte :     MODIFIER_EMAIL=autre@mail.com node change-superadmin-password.js ...
 * ============================================================================
 */

const urlArg = process.argv.slice(2).find((a) => /^(file:|postgres(ql)?:\/\/)/i.test(a));
if (urlArg) process.env.DATABASE_URL = urlArg;

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const EMAIL = process.env.MODIFIER_EMAIL || "superadmin@boutique.com";
const nouveauMotDePasse = process.argv[2] && !/^(file:|postgres(ql)?:\/\/)/i.test(process.argv[2])
  ? process.argv[2]
  : null;

function masquer(url) {
  if (!url) return "(non définie)";
  return url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@");
}

function typer(url) {
  if (!url || !url.trim()) return "inconnue";
  if (url.startsWith("file:")) return "locale";
  if (/^postgres(ql)?:\/\//i.test(url)) {
    let hote = "";
    try {
      hote = new URL(url).hostname;
    } catch {}
    return /localhost|127\.0\.0\.1/.test(hote) ? "locale" : "production";
  }
  return "inconnue";
}

const url = process.env.DATABASE_URL || "";
const type = typer(url);

async function main() {
  console.log("\n🔑 CHANGEMENT DU MOT DE PASSE SUPER ADMIN\n");

  if (!nouveauMotDePasse) {
    console.log("❌ Usage : node change-superadmin-password.js NouveauMotDePasse2026 [URL]");
    console.log('   Ex.   : node change-superadmin-password.js MonPass2026 "postgresql://...neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }
  if (nouveauMotDePasse.length < 8) {
    console.log("❌ Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  console.log(`   Compte ciblé : ${EMAIL}`);
  console.log(`   Base ciblée  : ${masquer(url)}`);
  console.log("");

  if (type === "locale") {
    console.log("   ⚠️  ATTENTION : cette base est LOCALE (développement).");
    console.log("       Ta PRODUCTION ne sera PAS modifiée.");
    console.log("       Pour la production, ajoute l'URL Neon en 2e argument :");
    console.log('       node change-superadmin-password.js MonPass "postgresql://...neon.tech/neondb?sslmode=require"');
    console.log("");
  } else if (type === "production") {
    console.log("   ✅ Base distante détectée → modification en PRODUCTION.");
    console.log("");
  } else {
    console.log("   ⚠️  Base non reconnue — vérifie l'URL avant de continuer.");
    console.log("");
  }

  const prisma = new PrismaClient(url ? { datasourceUrl: url } : {});

  try {
    /* ── Test de connexion explicite (message d'erreur clair) ─────────── */
    try {
      await prisma.$connect();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (e) {
      const msg = String(e.message || e.code || e.name || "").split("\n")[0];
      console.log("❌ Connexion impossible : " + (msg || "(aucun détail renvoyé par la base)"));
      if (/must start with the protocol/i.test(msg)) {
        console.log("");
        console.log("→ Le client Prisma installé ne correspond pas à cette base.");
        if (type === "locale") {
          console.log("  Ta base est locale : lance d'abord  npm run audit:local");
        } else {
          console.log("  Lance d'abord :  npm run audit:prod -- \"<ton URL>\"");
        }
      } else if (/authentication|password|credentials/i.test(msg)) {
        console.log("→ Identifiants (utilisateur/mot de passe) incorrects dans l'URL.");
      } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|Can't reach database server|P1001/i.test(msg)) {
        console.log("→ Serveur injoignable : hôte mal orthographié, base Neon en veille, ou connexion bloquée.");
      } else if (/does not exist|P1003/i.test(msg)) {
        console.log("→ Base inexistante : vérifie le nom en fin d'URL (souvent /neondb).");
      }
      console.log("");
      process.exitCode = 1;
      return;
    }

    const existe = await prisma.superAdmin.findUnique({ where: { email: EMAIL } });
    if (!existe) {
      console.log(`❌ Aucun super admin avec l'email ${EMAIL} dans CETTE base.`);
      console.log("   → Soit tu vises la mauvaise base, soit le compte n'existe pas.");
      const tous = await prisma.superAdmin.findMany({ select: { email: true } });
      console.log("   → Super admins présents dans cette base :");
      if (tous.length === 0) console.log("     (aucun)");
      tous.forEach((s) => console.log("     - " + s.email));
      console.log("");
      process.exitCode = 1;
      return;
    }

    const etaitFaible = await bcrypt.compare("demo123", existe.password);

    const hashed = await bcrypt.hash(nouveauMotDePasse, 10);
    await prisma.superAdmin.update({ where: { email: EMAIL }, data: { password: hashed } });

    // Vérification réelle : on relit la base
    const relu = await prisma.superAdmin.findUnique({ where: { email: EMAIL } });
    const ok = await bcrypt.compare(nouveauMotDePasse, relu.password);
    const ancienMarche = await bcrypt.compare("demo123", relu.password);

    console.log("");
    if (!ok) {
      console.log("❌ PROBLÈME : le mot de passe écrit ne correspond pas. Réessaie.");
      process.exitCode = 1;
      return;
    }

    console.log("✅ SUCCÈS VÉRIFIÉ — le nouveau mot de passe fonctionne.");
    if (etaitFaible) {
      console.log('   ℹ️  Ce compte utilisait "demo123" avant ce changement.');
    }
    if (ancienMarche) {
      console.log('   ⚠️  Anomalie : "demo123" fonctionne toujours (mots de passe identiques ?).');
    } else {
      console.log('   ✅ "demo123" ne fonctionne plus sur cette base.');
    }

    console.log("");
    console.log(`   Base modifiée : ${type === "production" ? "PRODUCTION" : type === "locale" ? "LOCALE" : "inconnue"}`);
    console.log(`   ${masquer(url)}`);
    console.log("");
    console.log("→ Pour tester :");
    console.log("   1. Ouvre /superadmin/login sur ton site");
    console.log("   2. Déconnecte-toi puis Ctrl + Shift + R");
    console.log("   3. Connecte-toi avec le nouveau mot de passe");
    console.log('   4. Vérifie que "demo123" est maintenant REFUSÉ');
    console.log("");
  } catch (error) {
    const msg = String(error.message || error.code || error.name || "erreur inconnue").split("\n")[0];
    console.log("");
    console.log("❌ ERREUR : " + (msg || "(aucun détail renvoyé par la base)"));
    if (error.code) console.log("   Code : " + error.code);
    if (/must start with the protocol/i.test(msg)) {
      console.log("");
      console.log("→ Le client Prisma installé ne correspond pas à cette base.");
      console.log("  Pour PostgreSQL (Neon) : npx prisma generate --schema=prisma/schema.prod.prisma");
      console.log("  (ou lance d'abord : npm run audit:prod -- \"<ton URL>\")");
    } else if (/authentication|password|credentials/i.test(msg)) {
      console.log("");
      console.log("→ Identifiants incorrects dans l'URL de connexion.");
    } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|Can't reach database server|P1001/i.test(msg)) {
      console.log("");
      console.log("→ Serveur injoignable : hôte mal orthographié, base Neon en veille, ou connexion bloquée.");
    }
    console.log("");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
