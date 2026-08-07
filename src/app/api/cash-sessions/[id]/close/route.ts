import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (user as any).ownerId || user.id;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { closingAmount, note } = body;
  const { id: sessionId } = await params;

  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { sales: true },
  });

  if (!cashSession || cashSession.userId !== userId) {
    return NextResponse.json({ error: "Session introuvable ou accès refusé" }, { status: 404 });
  }

  if (cashSession.status === "CLOSED") {
    return NextResponse.json({ error: "La caisse est déjà clôturée" }, { status: 400 });
  }

  const totalSales = cashSession.sales.reduce((sum, sale) => sum + (sale.finalTotal || sale.total), 0);
  const expected = cashSession.openingAmount + totalSales;
  const diff = (parseFloat(closingAmount) || 0) - expected;

  const updated = await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      closingAmount: parseFloat(closingAmount) || 0,
      expectedAmount: expected,
      difference: diff,
      status: "CLOSED",
      closedAt: new Date(),
      note: note || cashSession.note,
    },
  });

  return NextResponse.json(updated);
}
