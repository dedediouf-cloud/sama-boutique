import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { getNextDueDate } from "../src/lib/subscription";

async function main() {
  const hashedPassword = await bcrypt.hash("demo123", 10);

  // ⚠️ SÉCURITÉ : on NE réinitialise PAS le mot de passe d'un super admin existant.
  // Avant, ce script remettait le mot de passe à "demo123" à chaque exécution,
  // ce qui écrasait le mot de passe de production (très dangereux si lancé
  // avec la DATABASE_URL de production).
  // Pour forcer la réinitialisation : SEED_RESET_PASSWORD=1 npm run db:seed
  const forceReset = process.env.SEED_RESET_PASSWORD === "1";
  const existingSuperAdmin = await prisma.superAdmin.findUnique({
    where: { email: "superadmin@boutique.com" },
  });
  if (!existingSuperAdmin) {
    await prisma.superAdmin.create({
      data: {
        name: "Super Admin",
        email: "superadmin@boutique.com",
        password: hashedPassword,
      },
    });
    console.log("Super admin created: superadmin@boutique.com / demo123");
  } else if (forceReset) {
    await prisma.superAdmin.update({
      where: { email: "superadmin@boutique.com" },
      data: { password: hashedPassword },
    });
    console.log("⚠️ Mot de passe super admin RÉINITIALISÉ à demo123 (SEED_RESET_PASSWORD=1)");
  } else {
    console.log("Super admin déjà présent : mot de passe laissé INTACT (aucune modification).");
  }

  const existing = await prisma.user.findUnique({
    where: { email: "demo@boutique.com" },
  });

  let user;
  if (!existing) {
    const demoDueDate = getNextDueDate(new Date(), "monthly");

    user = await prisma.user.create({
      data: {
        name: "Demo User",
        email: "demo@boutique.com",
        password: hashedPassword,
        shopName: "Boutique Démo",
        shopSlug: "boutique-demo",
        phone: "+221771234567",
        subscriptionAmount: 10000,
        subscriptionStatus: "pending",
        subscriptionDueDate: demoDueDate,
        billingInterval: "monthly",
        referralCode: "boutique-demo",
      },
    });
  } else {
    user = await prisma.user.update({
      where: { email: "demo@boutique.com" },
      data: { password: hashedPassword },
    });
  }

  const products = [
    {
      name: "Riz 5kg",
      description: "Riz blanc de haute qualité",
      price: 5000,
      quantity: 20,
      lowStock: 5,
      category: "Alimentation",
      userId: user.id,
    },
    {
      name: "Huile 1L",
      description: "Huile végétale",
      price: 1200,
      quantity: 15,
      lowStock: 3,
      category: "Alimentation",
      userId: user.id,
    },
    {
      name: "Savon",
      description: "Savon de toilette",
      price: 300,
      quantity: 50,
      lowStock: 10,
      category: "Hygiène",
      userId: user.id,
    },
  ];

  for (const product of products) {
    const existingProduct = await prisma.product.findFirst({
      where: { name: product.name, userId: user.id },
    });
    if (!existingProduct) {
      await prisma.product.create({ data: product });
    }
  }

  // Créer un employé vendeur de démo
  const existingEmployee = await prisma.employee.findFirst({
    where: { email: "vendeur@boutique.com" },
  });
  if (!existingEmployee) {
    await prisma.employee.create({
      data: {
        name: "Vendeur Démo",
        email: "vendeur@boutique.com",
        password: hashedPassword,
        role: "seller",
        userId: user.id,
      },
    });
  }

  console.log("Seed done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
