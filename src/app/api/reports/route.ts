import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d"; // 7d, 30d, 12m

  const now = new Date();
  let startDate: Date;

  if (period === "30d") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  } else if (period === "12m") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  }

  const sales = await prisma.sale.findMany({
    where: {
      userId: ownerId,
      createdAt: { gte: startDate },
    },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = sales.length;

  // Ventes par jour
  const salesByDay: Record<string, { date: string; amount: number; count: number }> = {};

  sales.forEach((sale) => {
    const dateKey = sale.createdAt.toISOString().split("T")[0];
    if (!salesByDay[dateKey]) {
      salesByDay[dateKey] = { date: dateKey, amount: 0, count: 0 };
    }
    salesByDay[dateKey].amount += sale.total;
    salesByDay[dateKey].count += 1;
  });

  // Remplir les jours manquants avec 0
  const dailyData: { date: string; amount: number; count: number }[] = [];
  const days = period === "30d" ? 30 : 7;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    dailyData.push(salesByDay[dateKey] || { date: dateKey, amount: 0, count: 0 });
  }

  // Ventes par mois (pour 12m)
  const salesByMonth: Record<string, { month: string; amount: number; count: number }> = {};
  sales.forEach((sale) => {
    const monthKey = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!salesByMonth[monthKey]) {
      salesByMonth[monthKey] = { month: monthKey, amount: 0, count: 0 };
    }
    salesByMonth[monthKey].amount += sale.total;
    salesByMonth[monthKey].count += 1;
  });

  const monthlyData = Object.values(salesByMonth).sort((a, b) => a.month.localeCompare(b.month));

  // Top produits
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productMap[item.productId].quantity += item.quantity;
      productMap[item.productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Statuts de paiement
  const paymentStatus = {
    paid: sales.filter((s) => s.paymentStatus === "paid" || s.paymentMethod === "cash").length,
    pending: sales.filter((s) => s.paymentStatus === "pending").length,
    failed: sales.filter((s) => s.paymentStatus === "failed").length,
  };

  return NextResponse.json({
    totalRevenue,
    totalSales,
    dailyData,
    monthlyData,
    topProducts,
    paymentStatus,
  });
}
