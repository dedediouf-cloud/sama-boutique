import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaySales = await prisma.sale.findMany({
    where: {
      userId: ownerId,
      createdAt: { gte: startOfDay },
    },
    include: { items: true },
  });

  const totalToday = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const countToday = todaySales.length;

  const allProducts = await prisma.product.findMany({
    where: { userId: ownerId },
  });
  const lowStock = allProducts.filter((p) => p.quantity <= p.lowStock);

  const topProducts = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { userId: ownerId } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const topProductsWithNames = await Promise.all(
    topProducts.map(async (p) => {
      const product = await prisma.product.findUnique({
        where: { id: p.productId },
      });
      return {
        name: product?.name || "Produit supprimé",
        quantity: p._sum.quantity || 0,
      };
    })
  );

  const reservationsCount = await prisma.reservation.count({
    where: { userId: ownerId, status: "pending" },
  });

  return NextResponse.json({
    totalToday,
    countToday,
    lowStock,
    topProducts: topProductsWithNames,
    reservationsCount,
  });
}
