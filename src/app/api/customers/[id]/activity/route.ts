import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;
  const { id } = await params;

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, userId: ownerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id, userId: ownerId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    const reservations = await prisma.reservation.findMany({
      where: { customerId: id, userId: ownerId },
      orderBy: { createdAt: "desc" },
    });

    const totalSpent = sales.reduce((sum, sale) => sum + (sale.finalTotal || sale.total), 0);

    return NextResponse.json({
      customer,
      sales,
      reservations,
      totalSpent,
      totalSales: sales.length,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur" }, { status: 500 });
  }
}
