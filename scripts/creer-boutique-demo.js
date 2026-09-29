#!/usr/bin/env node
/**
 * ============================================================================
 *  BOUTIQUE DE DÉMONSTRATION
 * ============================================================================
 *
 *  Usage :
 *      node scripts/creer-boutique-demo.js "postgresql://...neon.tech/neondb"
 *      node scripts/creer-boutique-demo.js "postgresql://..." --remplir   (vide et remet les produits)
 *
 *  Raccourcis npm :
 *      npm run demo:creer
 *      npm run demo:creer -- "postgresql://..."
 *
 *  À quoi ça sert ?
 *    Le bouton « Voir la démo du catalogue » de la page d'accueil pointe vers
 *    /catalog/demo. Sans boutique portant le slug « demo », le visiteur
 *    tomberait sur une page vide — pire qu'aucune démo.
 *
 *  Ce script crée (ou complète) cette boutique de démonstration avec des
 *  produits réalistes, pour que les visiteurs puissent vraiment cliquer,
 *  ajouter au panier et tester.
 *
 *  ⚠️  Il ne touche JAMAIS à tes vraies boutiques : il n'agit que sur la
 *      boutique dont le slug est « demo » (modifiable avec --slug=...).
 * ============================================================================
 */

const args = process.argv.slice(2);
let urlArg = null;
let remplir = false;
let slug = "demo";
let aide = false;
let fichierUrl = null;
let verifierSeulement = false;

for (const a of args) {
  if (a === "--remplir" || a === "-r") remplir = true;
  else if (a === "--aide" || a === "-h") aide = true;
  else if (a === "--verifier" || a === "-v") verifierSeulement = true;
  else if (a.startsWith("--slug=")) slug = a.split("=")[1].trim().toLowerCase();
  else if (a.startsWith("--fichier-url=")) fichierUrl = a.split("=").slice(1).join("=").trim();
  else if (/^(file:|postgres(ql)?:\/\/)/i.test(a)) urlArg = a;
}

/* ⚡ Lecture de l'URL depuis un FICHIER
 * Pourquoi ? Dans une invite de commandes Windows, les caractères
 * % ! ^ des mots de passe sont interprétés et abîment l'URL.
 * Un fichier, lui, est transmis tel quel : aucune interprétation.
 */
if (fichierUrl) {
  const fs = require("fs");
  const chemin = fichierUrl.replace(/^"|"$/g, "").trim();
  if (!fs.existsSync(chemin)) {
    console.log(`\n❌ Fichier introuvable : ${chemin}\n`);
    process.exit(1);
  }
  // on prend la 1re ligne non vide, et on retire guillemets et espaces
  const lignes = fs.readFileSync(chemin, "utf-8").split(/\r?\n/);
  const utile = lignes.map((l) => l.trim()).find((l) => l && !l.startsWith("#") && !l.startsWith("//"));
  if (!utile) {
    console.log(`\n❌ Le fichier ${chemin} ne contient aucune URL.\n`);
    console.log("   Colle ton URL de production sur la première ligne.\n");
    process.exit(1);
  }
  urlArg = utile.replace(/^["']|["']$/g, "");

  // contrôle de forme : évite les erreurs obscures si on a collé autre chose
  if (!/^(file:|postgres(ql)?:\/\/)/i.test(urlArg)) {
    console.log("\n❌ Ce n'est pas une URL de base de données :");
    console.log(`   « ${urlArg.slice(0, 70)} »\n`);
    console.log("   Une URL valide ressemble à :");
    console.log("     postgresql://neondb_owner:npg_XXX@ep-xxx.neon.tech/neondb?sslmode=require");
    console.log("\n   ⚠️  N'utilise PAS l'URL « Pooling / Accelerate » si tu en as une,");
    console.log("       prends bien celle qui commence par postgresql://\n");
    process.exit(1);
  }
}

if (urlArg) process.env.DATABASE_URL = urlArg;

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const c = {
  vert: (t) => `\x1b[32m${t}\x1b[0m`,
  rouge: (t) => `\x1b[31m${t}\x1b[0m`,
  jaune: (t) => `\x1b[33m${t}\x1b[0m`,
  gras: (t) => `\x1b[1m${t}\x1b[0m`,
  gris: (t) => `\x1b[90m${t}\x1b[0m`,
};
const couleurs = process.stdout.isTTY ? c : Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (t) => t]));

if (aide) {
  console.log(`
🏪  BOUTIQUE DE DÉMONSTRATION

  node scripts/creer-boutique-demo.js [options] [URL de la base]

  Options :
    --remplir, -r          Supprime les produits de la démo et les recrée
    --verifier, -v         Vérifie seulement, ne crée rien
    --fichier-url=fichier  Lit l'URL depuis un fichier texte
                           (RECOMMANDÉ sous Windows : évite les problèmes de
                            caractères % ! ^ dans les mots de passe)
    --slug=xxx             Utiliser un autre slug (défaut : demo)
    --aide, -h             Cette aide

  Exemples :
    node scripts/creer-boutique-demo.js "file:./dev.db"
    node scripts/creer-boutique-demo.js "postgresql://...neon.tech/neondb"
    node scripts/creer-boutique-demo.js --remplir "postgresql://..."

  Après l'exécution, le catalogue est visible sur  /catalog/${slug}
`);
  process.exit(0);
}

/* ─────────────── Produits de la démonstration ─────────────── */
const PRODUITS = [
  { name: "Riz parfumé 5 kg",            category: "Alimentation", price: 5500, quantity: 24, lowStock: 5,  description: "Riz parfumé de qualité supérieure, sac de 5 kg." },
  { name: "Huile végétale 1 L",          category: "Alimentation", price: 1200, quantity: 36, lowStock: 8,  description: "Huile de cuisson 100 % végétale, bouteille de 1 litre." },
  { name: "Sucre en poudre 1 kg",        category: "Alimentation", price: 850,  quantity: 40, lowStock: 10, description: "Sucre blanc cristallisé, paquet de 1 kg." },
  { name: "Lait en poudre 400 g",        category: "Alimentation", price: 2500, quantity: 18, lowStock: 5,  description: "Lait en poudre entier, boîte de 400 g." },
  { name: "Concentré de tomate",         category: "Alimentation", price: 350,  quantity: 60, lowStock: 15, description: "Double concentré de tomate, petite boîte." },
  { name: "Spaghetti 500 g",             category: "Alimentation", price: 700,  quantity: 45, lowStock: 10, description: "Pâtes alimentaires, paquet de 500 g." },
  { name: "Couscous 1 kg",               category: "Alimentation", price: 900,  quantity: 20, lowStock: 5,  description: "Semoule de couscous fine, paquet de 1 kg." },
  { name: "Café Touba 250 g",            category: "Alimentation", price: 1000, quantity: 30, lowStock: 8,  description: "Café Touba moulu, sachet de 250 g." },
  { name: "Thé vert (paquet)",           category: "Alimentation", price: 500,  quantity: 50, lowStock: 12, description: "Feuilles de thé vert pour la préparation du attaya." },
  { name: "Eau minérale 1,5 L",          category: "Boisson",      price: 600,  quantity: 48, lowStock: 12, description: "Eau minérale naturelle, bouteille de 1,5 litre." },
  { name: "Jus de bissap 50 cl",         category: "Boisson",      price: 800,  quantity: 24, lowStock: 6,  description: "Jus de bissap artisanal, bouteille de 50 cl." },
  { name: "Boisson gazeuse 1,5 L",       category: "Boisson",      price: 1300, quantity: 30, lowStock: 8,  description: "Boisson gazeuse rafraîchissante, bouteille de 1,5 litre." },
  { name: "Savon de toilette",           category: "Hygiène",      price: 300,  quantity: 80, lowStock: 20, description: "Savon de toilette parfumé, pain de 200 g." },
  { name: "Dentifrice 75 ml",            category: "Hygiène",      price: 1200, quantity: 25, lowStock: 6,  description: "Dentifrice au fluor, tube de 75 ml." },
  { name: "Papier hygiénique (4 rouleaux)", category: "Hygiène",   price: 1000, quantity: 40, lowStock: 10, description: "Lot de 4 rouleaux de papier hygiénique." },
  { name: "Détergent 1 kg",              category: "Entretien",    price: 1500, quantity: 22, lowStock: 6,  description: "Poudre à lessive, paquet de 1 kg." },
  { name: "Eau de Javel 1 L",            category: "Entretien",    price: 500,  quantity: 35, lowStock: 10, description: "Eau de Javel désinfectante, bouteille de 1 litre." },
  { name: "Éponge de cuisine (lot de 3)", category: "Entretien",   price: 400,  quantity: 28, lowStock: 8,  description: "Lot de 3 éponges pour la vaisselle." },
  { name: "Cahier 200 pages",            category: "Divers",       price: 700,  quantity: 40, lowStock: 10, description: "Cahier scolaire grand format, 200 pages." },
  { name: "Stylo à bille (lot de 5)",    category: "Divers",       price: 500,  quantity: 50, lowStock: 12, description: "Lot de 5 stylos à bille bleus." },
  { name: "Bougies (paquet de 6)",       category: "Divers",       price: 1000, quantity: 26, lowStock: 6,  description: "Paquet de 6 bougies longue durée." },
  { name: "Piles AA (lot de 4)",         category: "Divers",       price: 1500, quantity: 20, lowStock: 5,  description: "Lot de 4 piles alcalines AA." },
];

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
const prisma = new PrismaClient(url ? { datasourceUrl: url } : {});

async function main() {
  console.log(couleurs.gras("\n🏪  BOUTIQUE DE DÉMONSTRATION\n"));

  if (!url) {
    console.log(couleurs.rouge("   ❌ Aucune base indiquée.\n"));
    console.log("   Donne l'URL de ta base :");
    console.log(couleurs.gris('     node scripts/creer-boutique-demo.js "file:./dev.db"'));
    console.log(couleurs.gris('     node scripts/creer-boutique-demo.js "postgresql://...neon.tech/neondb"'));
    console.log();
    process.exit(1);
  }

  console.log(`   Base    : ${masquer(url)}`);
  console.log(
    `   Type    : ${
      type === "production"
        ? couleurs.vert("PRODUCTION")
        : type === "locale"
        ? couleurs.jaune("LOCALE (développement)")
        : "inconnue"
    }`
  );
  console.log(`   Boutique : slug « ${slug} »  →  sera visible sur /catalog/${slug}`);
  console.log(`   Mode    : ${remplir ? couleurs.jaune("remplir (vide et recrée les produits)") : "créer/compléter"}\n`);

  /* ── Connexion ─────────────────────────────────────────────────────── */
  try {
    await prisma.$connect();
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log(couleurs.vert("   ✅ Connexion réussie\n"));
  } catch (e) {
    const msg = String(e.message || e.code || e.name || "").split("\n")[0];
    console.log(couleurs.rouge(`   ❌ Connexion impossible : ${msg || "(aucun détail)"}\n`));
    if (/must start with the protocol/i.test(msg)) {
      console.log("   → Le client Prisma installé ne correspond pas à cette base.");
      console.log(couleurs.gris("     PostgreSQL : npx prisma generate --schema=prisma/schema.prod.prisma"));
      console.log(couleurs.gris("     SQLite     : npx prisma generate --schema=prisma/schema.prisma"));
    } else if (/authentication|password|credentials/i.test(msg)) {
      console.log("   → Identifiants incorrects dans l'URL.");
    } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|Can't reach/i.test(msg)) {
      console.log("   → Base injoignable : hôte mal orthographié, base Neon en veille,");
      console.log("     ou connexion/pare-feu bloquant le port 5432.");
    }
    console.log();
    process.exitCode = 1;
    return;
  }

  /* ── Mode vérification seule ───────────────────────────────────────── */
  if (verifierSeulement) {
    const existante = await prisma.user.findUnique({
      where: { shopSlug: slug },
      select: { id: true, shopName: true },
    });

    console.log(couleurs.gras("   VÉRIFICATION"));
    if (!existante) {
      console.log(couleurs.rouge(`   ❌ Aucune boutique avec le slug « ${slug} » dans CETTE base.`));
      console.log();
      console.log("   → La démonstration ne s'affichera pas sur ton site.");
      console.log(couleurs.gris(`     Relance sans --verifier pour la créer :`));
      console.log(couleurs.gris(`     node scripts/creer-boutique-demo.js --fichier-url=url-production.txt`));
      process.exitCode = 1;
    } else {
      const total = await prisma.product.count({ where: { userId: existante.id } });
      const enStock = await prisma.product.count({
        where: { userId: existante.id, quantity: { gt: 0 } },
      });
      console.log(couleurs.vert(`   ✅ Boutique « ${existante.shopName} » trouvée`));
      console.log(`      slug          : ${slug}`);
      console.log(`      produits      : ${total} (dont ${enStock} visibles)`);
      console.log(`      adresse       : /catalog/${slug}`);
      if (enStock === 0) {
        console.log();
        console.log(couleurs.jaune("   ⚠️  Aucun produit visible : la démo paraîtra vide."));
        console.log(couleurs.gris("      Relance avec --remplir pour les recréer."));
        process.exitCode = 1;
      }
    }
    console.log();
    return;
  }

  /* ── La boutique de démo existe-t-elle ? ───────────────────────────── */
  let boutique = await prisma.user.findUnique({ where: { shopSlug: slug } });
  let creee = false;

  if (!boutique) {
    // Vérifie que le mot de passe de démonstration n'est pas déjà pris ailleurs
    const emailDemo = `${slug}@boutique-demo.local`;
    const emailDejaPris = await prisma.user.findUnique({ where: { email: emailDemo } });
    const email = emailDejaPris ? `${slug}-${Date.now()}@boutique-demo.local` : emailDemo;

    // code de parrainage unique
    let codeParrainage = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    while (await prisma.user.findUnique({ where: { referralCode: codeParrainage } })) {
      codeParrainage = `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    boutique = await prisma.user.create({
      data: {
        name: "Boutique de démonstration",
        email,
        // mot de passe volontairement inutilisable : ce compte ne sert qu'à
        // alimenter le catalogue public de démonstration
        password: await bcrypt.hash(`demo-inutilisable-${Date.now()}`, 10),
        shopName: "Boutique Démonstration",
        shopSlug: slug,
        phone: null,
        subscriptionAmount: 0,
        subscriptionStatus: "demo",
        subscriptionDueDate: null,
        trialEndsAt: null,
        trialUsed: false,
        billingInterval: "monthly",
        referralCode: codeParrainage,
      },
    });
    creee = true;
    console.log(couleurs.vert(`   ✅ Boutique « ${boutique.shopName} » créée (slug : ${boutique.shopSlug})`));
  } else {
    console.log(`   ℹ️  Boutique « ${boutique.shopName} » déjà présente (slug : ${boutique.shopSlug})`);
  }

  /* ── Produits ──────────────────────────────────────────────────────── */
  if (remplir) {
    const supprimes = await prisma.product.deleteMany({ where: { userId: boutique.id } });
    if (supprimes.count > 0) {
      console.log(couleurs.jaune(`   ↻ ${supprimes.count} ancien(s) produit(s) retiré(s)`));
    }
  }

  const existants = await prisma.product.findMany({
    where: { userId: boutique.id },
    select: { name: true },
  });
  const nomsExistants = new Set(existants.map((p) => p.name));

  const aCreer = PRODUITS.filter((p) => !nomsExistants.has(p.name));
  if (aCreer.length > 0) {
    await prisma.product.createMany({
      data: aCreer.map((p) => ({
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        quantity: p.quantity,
        lowStock: p.lowStock,
        userId: boutique.id,
      })),
    });
    console.log(couleurs.vert(`   ✅ ${aCreer.length} produit(s) ajouté(s)`));
  }
  if (nomsExistants.size > 0 && !remplir) {
    console.log(couleurs.gris(`      (${nomsExistants.size} produit(s) déjà en place, conservés)`));
  }

  /* ── Réglages de la boutique de démo ──────────────────────────────── */
  await prisma.boutiqueSettings.upsert({
    where: { userId: boutique.id },
    create: { userId: boutique.id, paymentsEnabled: false },
    update: {},
  });

  /* ── Résumé ───────────────────────────────────────────────────────── */
  const total = await prisma.product.count({ where: { userId: boutique.id } });
  const enStock = await prisma.product.count({
    where: { userId: boutique.id, quantity: { gt: 0 } },
  });

  console.log();
  console.log(couleurs.gras("   RÉSULTAT"));
  console.log(`   Produits dans la démo : ${total} (dont ${enStock} visibles dans le catalogue)`);
  console.log(`   Adresse du catalogue  : /catalog/${slug}`);
  console.log();
  console.log(couleurs.gras("   À FAIRE MAINTENANT"));
  console.log("   1. Ouvre ton site et vérifie que le bouton « Voir la démo du catalogue »");
  console.log("      apparaît bien sur la page d'accueil");
  console.log("   2. Clique dessus : tu dois voir les produits, pouvoir en ajouter au panier");
  console.log();
  console.log(couleurs.gris("   Pour vider et recréer les produits plus tard :"));
  console.log(couleurs.gris(`     node scripts/creer-boutique-demo.js --remplir "${type === "production" ? "postgresql://..." : "file:./dev.db"}"`));
  console.log();
}

main()
  .catch((e) => {
    console.error(couleurs.rouge("\n❌ Erreur : " + (e.message || e.code || e.name || "inconnue")));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
