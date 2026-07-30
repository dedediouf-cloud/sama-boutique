import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { closingAmount, note } = await req.json();
  const sessionId = params.id;

  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { sales: true },
  });

  if (!cashSession || cashSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (cashSession.status === "CLOSED") {
    return NextResponse.json({ error: "Session already closed" }, { status: 400 });
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
