import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getNextDueDate } from "@/lib/subscription";

// ⚠️ ROUTE DE RÉINITIALISATION / SEED POUR PRODUCTION
// Appel une seule fois après déploiement : https://TON-APP.vercel.app/api/seed
// Crée le Super Admin + utilisateur démo si inexistants

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("demo123", 10);

    // 1. Super Admin
    const existingSuper = await prisma.superAdmin.findUnique({
      where: { email: "superadmin@boutique.com" },
    });

    if (!existingSuper) {
      await prisma.superAdmin.create({
        data: {
          name: "Super Admin",
          email: "superadmin@boutique.com",
          password: hashedPassword,
        },
      });
      console.log("✅ Super Admin créé");
    } else {
      await prisma.superAdmin.update({
        where: { email: "superadmin@boutique.com" },
        data: { password: hashedPassword },
      });
      console.log("✅ Super Admin mis à jour (mot de passe reset)");
    }

    // 2. Utilisateur boutique démo
    const existingUser = await prisma.user.findUnique({
      where: { email: "demo@boutique.com" },
    });

    let demoUser;
    if (!existingUser) {
      const dueDate = getNextDueDate(new Date(), "monthly");
      demoUser = await prisma.user.create({
        data: {
          name: "Boutique Démo",
          email: "demo@boutique.com",
          password: hashedPassword,
          shopName: "Ma Boutique Démo",
          shopSlug: "boutique-demo",
          phone: "+221771234567",
          subscriptionAmount: 10000,
          subscriptionStatus: "active",
          subscriptionDueDate: dueDate,
          billingInterval: "monthly",
          referralCode: "demo-" + Date.now(),
        },
      });
      console.log("✅ Utilisateur démo créé");
    } else {
      demoUser = await prisma.user.update({
        where: { email: "demo@boutique.com" },
        data: { password: hashedPassword },
      });
      console.log("✅ Utilisateur démo mis à jour");
    }

    // 3. Quelques produits de base si aucun
    const productCount = await prisma.product.count({ where: { userId: demoUser.id } });
    if (productCount === 0) {
      await prisma.product.createMany({
        data: [
          { name: "Riz 5kg", price: 5000, quantity: 25, lowStock: 5, category: "Alimentation", userId: demoUser.id },
          { name: "Huile 1L", price: 1200, quantity: 18, lowStock: 3, category: "Alimentation", userId: demoUser.id },
          { name: "Savon", price: 300, quantity: 60, lowStock: 10, category: "Hygiène", userId: demoUser.id },
          { name: "Sucre 1kg", price: 850, quantity: 40, lowStock: 5, category: "Alimentation", userId: demoUser.id },
        ],
      });
      console.log("✅ Produits démo ajoutés");
    }

    // 4. Employé vendeur
    const existingEmp = await prisma.employee.findFirst({
      where: { email: "vendeur@boutique.com" },
    });
    if (!existingEmp && demoUser) {
      await prisma.employee.create({
        data: {
          name: "Vendeur Démo",
          email: "vendeur@boutique.com",
          password: hashedPassword,
          role: "seller",
          userId: demoUser.id,
        },
      });
      console.log("✅ Employé vendeur créé");
    }

    return NextResponse.json({
      success: true,
      message: "Base de données initialisée avec succès !",
      accounts: {
        superadmin: "superadmin@boutique.com / demo123",
        boutique: "demo@boutique.com / demo123",
        vendeur: "vendeur@boutique.com / demo123",
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        hint: "Vérifie que DATABASE_URL est une URL PostgreSQL valide dans Vercel"
      },
      { status: 500 }
    );
  }
}
