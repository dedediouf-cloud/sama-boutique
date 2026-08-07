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
  let daysInPeriod = 7;

  if (period === "30d") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    daysInPeriod = 30;
  } else if (period === "12m") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    daysInPeriod = 365;
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    daysInPeriod = 7;
  }

  // === VENTES ===
  const sales = await prisma.sale.findMany({
    where: {
      userId: ownerId,
      createdAt: { gte: startDate },
      paymentStatus: { not: "cancelled" },
    },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.finalTotal || sale.total), 0);
  const totalSales = sales.length;

  // Ventes par jour
  const salesByDay: Record<string, { date: string; amount: number; count: number }> = {};
  sales.forEach((sale) => {
    const dateKey = sale.createdAt.toISOString().split("T")[0];
    if (!salesByDay[dateKey]) {
      salesByDay[dateKey] = { date: dateKey, amount: 0, count: 0 };
    }
    salesByDay[dateKey].amount += (sale.finalTotal || sale.total);
    salesByDay[dateKey].count += 1;
  });

  // Remplir les jours manquants
  const dailyData: { date: string; amount: number; count: number }[] = [];
  for (let i = daysInPeriod - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    dailyData.push(salesByDay[dateKey] || { date: dateKey, amount: 0, count: 0 });
  }

  // Ventes par mois (12m)
  const salesByMonth: Record<string, { month: string; amount: number; count: number }> = {};
  sales.forEach((sale) => {
    const monthKey = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!salesByMonth[monthKey]) {
      salesByMonth[monthKey] = { month: monthKey, amount: 0, count: 0 };
    }
    salesByMonth[monthKey].amount += (sale.finalTotal || sale.total);
    salesByMonth[monthKey].count += 1;
  });
  const monthlyData = Object.values(salesByMonth).sort((a, b) => a.month.localeCompare(b.month));

  // Top produits
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = { name: item.product.name, quantity: 0, revenue: 0 };
      }
      productMap[key].quantity += item.quantity;
      productMap[key].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Statuts paiement
  const paymentStatus = {
    paid: sales.filter((s) => s.paymentStatus === "paid" || s.paymentMethod === "cash" || s.paymentMethod === "qr_merchant" || s.paymentMethod === "cash_on_delivery").length,
    pending: sales.filter((s) => s.paymentStatus === "pending").length,
    failed: sales.filter((s) => s.paymentStatus === "failed").length,
  };

  // === VENTES PAR MÉTHODE DE PAIEMENT ===
  const salesByMethod: Record<string, { method: string; count: number; revenue: number }> = {};
  sales.forEach((sale) => {
    const m = sale.paymentMethod || "cash";
    if (!salesByMethod[m]) salesByMethod[m] = { method: m, count: 0, revenue: 0 };
    salesByMethod[m].count += 1;
    salesByMethod[m].revenue += (sale.finalTotal || sale.total);
  });
  const paymentMethods = Object.values(salesByMethod);

  // === STATISTIQUES CAISSE (Cash Sessions) ===
  const cashSessions = await prisma.cashSession.findMany({
    where: {
      userId: ownerId,
      openedAt: { gte: startDate },
    },
    include: { sales: true },
  });

  const cashStats = {
    totalSessions: cashSessions.length,
    closedSessions: cashSessions.filter(s => s.status === "CLOSED").length,
    totalCashIn: cashSessions.reduce((sum, s) => sum + (s.closingAmount || 0), 0),
    totalExpected: cashSessions.reduce((sum, s) => sum + (s.expectedAmount || 0), 0),
    totalDifference: cashSessions.reduce((sum, s) => sum + (s.difference || 0), 0),
    averageDifference: cashSessions.length > 0 
      ? cashSessions.reduce((sum, s) => sum + (s.difference || 0), 0) / cashSessions.length 
      : 0,
  };

  // === PRÉDICTIONS STOCK & VITESSE DE VENTE ===
  // Récupère tous les produits pour calculer la vélocité
  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    include: {
      saleItems: {
        where: {
          sale: {
            createdAt: { gte: startDate },
            paymentStatus: { not: "cancelled" },
          },
        },
      },
    },
  });

  const stockInsights: any[] = [];

  products.forEach((product) => {
    const soldInPeriod = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const velocityPerDay = daysInPeriod > 0 ? soldInPeriod / daysInPeriod : 0;
    const currentStock = product.quantity;

    let daysLeft: number | null = null;
    let prediction = "Stable";

    if (velocityPerDay > 0) {
      daysLeft = Math.floor(currentStock / velocityPerDay);
      if (daysLeft <= 3) prediction = "Critique";
      else if (daysLeft <= 10) prediction = "Attention";
      else prediction = "Bon";
    } else if (currentStock <= (product.lowStock || 5)) {
      prediction = "Faible";
    }

    if (soldInPeriod > 0 || currentStock <= (product.lowStock || 5)) {
      stockInsights.push({
        id: product.id,
        name: product.name,
        currentStock,
        soldInPeriod,
        velocityPerDay: Math.round(velocityPerDay * 100) / 100,
        daysLeft: daysLeft !== null ? Math.max(0, daysLeft) : null,
        prediction,
        lowStockThreshold: product.lowStock || 5,
      });
    }
  });

  // Trier par urgence (jours restants ou stock faible)
  stockInsights.sort((a, b) => {
    if (a.daysLeft === null && b.daysLeft === null) return b.soldInPeriod - a.soldInPeriod;
    if (a.daysLeft === null) return 1;
    if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });

  // Top 8 produits à risque
  const stockPredictions = stockInsights.slice(0, 8);

  // Moyenne journalière de ventes (pour prédictions globales)
  const avgDailySales = totalSales / Math.max(daysInPeriod, 1);

  return NextResponse.json({
    totalRevenue,
    totalSales,
    avgDailySales: Math.round(avgDailySales * 100) / 100,
    dailyData,
    monthlyData,
    topProducts,
    paymentStatus,
    paymentMethods,
    cashStats,
    stockPredictions,
    period,
    daysInPeriod,
  });
}
