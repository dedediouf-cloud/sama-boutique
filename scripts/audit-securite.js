/**
 * ============================================================================
 *  AUDIT DE SÉCURITÉ — comptes utilisant encore le mot de passe "demo123"
 * ============================================================================
 *  Usage :
 *      DATABASE_URL="postgresql://...neon..." node scripts/audit-securite.js
 *      (ou simplement : npm run audit:securite)
 *
 *  Ce script :
 *    1. vérifie qu'aucune route publique de réinitialisation ne subsiste
 *    2. teste chaque compte (super admin, boutiques, vendeurs) contre "demo123"
 *    3. affiche un rapport clair avec les actions à faire
 *
 *  Il ne MODIFIE RIEN. Lecture seule.
 * ============================================================================
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const MOT_DE_PASSE_FAIBLE = "demo123";

const prisma = new PrismaClient();

const c = {
  rouge: (t) => `\x1b[31m${t}\x1b[0m`,
  vert: (t) => `\x1b[32m${t}\x1b[0m`,
  jaune: (t) => `\x1b[33m${t}\x1b[0m`,
  gras: (t) => `\x1b[1m${t}\x1b[0m`,
  gris: (t) => `\x1b[90m${t}\x1b[0m`,
};

function titre(t) {
  console.log("\n" + c.gras(t));
  console.log("─".repeat(t.length));
}

async function main() {
  console.log(c.gras("\n🔒 AUDIT DE SÉCURITÉ — SamaBoutique"));
  console.log(c.gris(`   Base : ${(process.env.DATABASE_URL || "").replace(/:[^:@]*@/, ":***@").slice(0, 70)}…`));

  const problemes = [];

  /* ─────────────── 1. Routes de réinitialisation publiques ─────────────── */
  titre("1. Routes publiques dangereuses");

  const routesSensibles = [
    "src/app/api/seed/route.ts",
    "src/app/api/auth/nuke/route.ts",
  ];

  let routeTrouvee = false;
  for (const r of routesSensibles) {
    const existe = fs.existsSync(path.join(process.cwd(), r));
    if (existe) {
      routeTrouvee = true;
      console.log(c.rouge(`   ❌ PRÉSENT : ${r}`));
      console.log(c.gris(`      → n'importe qui peut appeler /api/seed et remettre les mots de passe à "demo123"`));
      problemes.push(`Route publique dangereuse : ${r}`);
    } else {
      console.log(c.vert(`   ✅ absent : ${r}`));
    }
  }
  if (!routeTrouvee) {
    console.log(c.vert("\n   ✅ Aucune route publique de réinitialisation trouvée."));
  }

  /* ─────────────── 2. Super administrateurs ─────────────── */
  titre("2. Super administrateurs");

  let superAdmins = [];
  try {
    superAdmins = await prisma.superAdmin.findMany({
      select: { id: true, email: true, password: true },
    });
  } catch (e) {
    console.log(c.jaune(`   ⚠️ Lecture impossible (${e.message.split("\n")[0]})`));
  }

  if (superAdmins.length === 0) {
    console.log(c.gris("   (aucun super admin en base)"));
  }

  for (const sa of superAdmins) {
    const faible = await bcrypt.compare(MOT_DE_PASSE_FAIBLE, sa.password);
    if (faible) {
      console.log(c.rouge(`   ❌ CRITIQUE : ${sa.email}`) + c.rouge(`  utilise encore "${MOT_DE_PASSE_FAIBLE}"`));
      problemes.push(`Super admin avec mot de passe faible : ${sa.email}`);
    } else {
      console.log(c.vert(`   ✅ ${sa.email}`) + c.gris("  (mot de passe personnalisé)"));
    }
  }

  /* ─────────────── 3. Boutiques ─────────────── */
  titre("3. Boutiques (commerçants)");

  let boutiques = [];
  try {
    boutiques = await prisma.user.findMany({
      select: { id: true, email: true, shopName: true, isBlocked: true, password: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (e) {
    console.log(c.jaune(`   ⚠️ Lecture impossible (${e.message.split("\n")[0]})`));
  }

  console.log(c.gris(`   ${boutiques.length} boutique(s) en base`));

  let nbBoutiquesFaibles = 0;
  for (const b of boutiques) {
    const faible = await bcrypt.compare(MOT_DE_PASSE_FAIBLE, b.password);
    if (faible) {
      nbBoutiquesFaibles++;
      console.log(
        c.rouge(`   ❌ ${b.shopName}`) +
          c.gris(`  (${b.email})`) +
          c.rouge(`  mot de passe "${MOT_DE_PASSE_FAIBLE}"`) +
          (b.isBlocked ? c.gris(" [bloquée]") : "")
      );
      problemes.push(`Boutique avec mot de passe faible : ${b.email}`);
    }
  }
  if (nbBoutiquesFaibles === 0) {
    console.log(c.vert("   ✅ Aucune boutique n'utilise le mot de passe de démonstration"));
  }

  /* ─────────────── 4. Vendeurs (employés) ─────────────── */
  titre("4. Vendeurs (employés)");

  let employes = [];
  try {
    employes = await prisma.employee.findMany({
      select: { id: true, email: true, name: true, password: true },
    });
  } catch (e) {
    console.log(c.jaune(`   ⚠️ Lecture impossible (${e.message.split("\n")[0]})`));
  }

  console.log(c.gris(`   ${employes.length} vendeur(s) en base`));

  let nbEmployesFaibles = 0;
  for (const e of employes) {
    const faible = await bcrypt.compare(MOT_DE_PASSE_FAIBLE, e.password);
    if (faible) {
      nbEmployesFaibles++;
      console.log(c.rouge(`   ❌ ${e.name} (${e.email})`) + c.rouge(`  mot de passe "${MOT_DE_PASSE_FAIBLE}"`));
      problemes.push(`Vendeur avec mot de passe faible : ${e.email}`);
    }
  }
  if (nbEmployesFaibles === 0) {
    console.log(c.vert("   ✅ Aucun vendeur n'utilise le mot de passe de démonstration"));
  }

  /* ─────────────── RAPPORT FINAL ─────────────── */
  titre("RAPPORT");

  if (problemes.length === 0) {
    console.log(c.vert("   🎉 Tout est bon. Aucun problème détecté.\n"));
  } else {
    console.log(c.rouge(`   ${problemes.length} problème(s) détecté(s) :\n`));
    problemes.forEach((p, i) => console.log(c.rouge(`   ${i + 1}. ${p}`)));

    console.log(c.gras("\n   QUE FAIRE :"));
    if (problemes.some((p) => p.includes("Route publique"))) {
      console.log("   → Supprimer la route :  git rm src/app/api/seed/route.ts");
    }
    if (problemes.some((p) => p.includes("Super admin"))) {
      console.log("   → Changer le mot de passe super admin :");
      console.log(c.gris('     DATABASE_URL="..." node change-superadmin-password.js MonNouveauMotDePasse2026'));
    }
    if (problemes.some((p) => p.includes("Boutique") || p.includes("Vendeur"))) {
      console.log("   → Depuis l'interface super admin → « Mot de passe » sur chaque boutique concernée,");
      console.log("     ou « Employés » → « Réinitialiser mot de passe » pour les vendeurs.");
      console.log(c.gris("     (s'il s'agit de comptes de démonstration, tu peux aussi les supprimer)"));
    }
    console.log("");
  }

  /* ─────────────── Contrôle de la configuration ─────────────── */
  titre("Configuration Vercel recommandée");
  const variables = ["RESEND_API_KEY", "CRON_SECRET", "NEXTAUTH_SECRET"];
  for (const v of variables) {
    const ok = Boolean(process.env[v]);
    console.log(
      (ok ? c.vert("   ✅ ") : c.jaune("   ⚠️  ")) +
        v +
        (ok ? "" : c.gris("  (non définie dans cet environnement)"))
    );
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(c.rouge("\n❌ Erreur : " + (e.message || e)));
    console.error(c.gris("   Vérifie que DATABASE_URL est bien défini et pointe vers ta base."));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
