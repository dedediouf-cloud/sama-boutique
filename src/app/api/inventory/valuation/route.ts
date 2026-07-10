import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    select: { id: true, name: true, category: true, price: true, quantity: true, lowStock: true },
  });

  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.lowStock).length;

  const byCategory: Record<string, { value: number; items: number; products: number }> = {};
  products.forEach((p) => {
    const category = p.category || "Sans catégorie";
    if (!byCategory[category]) {
      byCategory[category] = { value: 0, items: 0, products: 0 };
    }
    byCategory[category].value += p.price * p.quantity;
    byCategory[category].items += p.quantity;
    byCategory[category].products += 1;
  });

  const categoryList = Object.entries(byCategory).map(([name, data]) => ({
    name,
    ...data,
  }));

  return NextResponse.json({
    totalValue,
    totalItems,
    lowStockCount,
    productCount: products.length,
    byCategory: categoryList,
  });
}
