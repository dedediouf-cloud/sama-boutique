import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      costPrice: true,
      quantity: true,
      lowStock: true,
    },
  });

  // ── Les deux valorisations, à ne surtout pas confondre ──────────────────
  //  • totalValue      : au PRIX DE VENTE. C'est ce qu'on encaisserait si tout
  //                      était vendu. Ce n'est PAS la valeur du stock.
  //  • totalCostValue  : au PRIX D'ACHAT. C'est l'ARGENT RÉELLEMENT INVESTI,
  //                      l'argent qui dort sur l'étagère. C'est le chiffre
  //                      utile pour piloter une boutique.
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const totalCostValue = products.reduce(
    (sum, p) => sum + (p.costPrice ?? 0) * p.quantity,
    0
  );
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.lowStock).length;

  // Combien de produits ont un prix d'achat renseigné ? Sert à afficher la
  // progression de la saisie sans bloquer le commerçant.
  const produitsAvecPrixAchat = products.filter((p) => p.costPrice !== null).length;

  const byCategory: Record<
    string,
    { value: number; costValue: number; items: number; products: number }
  > = {};
  products.forEach((p) => {
    const category = p.category || "Sans catégorie";
    if (!byCategory[category]) {
      byCategory[category] = { value: 0, costValue: 0, items: 0, products: 0 };
    }
    byCategory[category].value += p.price * p.quantity;
    byCategory[category].costValue += (p.costPrice ?? 0) * p.quantity;
    byCategory[category].items += p.quantity;
    byCategory[category].products += 1;
  });

  const categoryList = Object.entries(byCategory).map(([name, data]) => ({
    name,
    ...data,
  }));

  return NextResponse.json({
    totalValue,
    totalCostValue,
    // Marge potentielle : ce qu'on gagnerait si tout le stock était vendu.
    // (Calculée uniquement sur les produits dont le prix d'achat est connu,
    //  sinon le chiffre serait trompeur.)
    totalMargin: products.reduce(
      (sum, p) => (p.costPrice === null ? sum : sum + (p.price - p.costPrice) * p.quantity),
      0
    ),
    produitsAvecPrixAchat,
    totalItems,
    lowStockCount,
    productCount: products.length,
    byCategory: categoryList,
  });
}
