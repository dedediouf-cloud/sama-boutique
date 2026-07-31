import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = session.user.ownerId || session.user.id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // OPEN | CLOSED | all
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {
    userId: ownerId,
  };

  if (status === "OPEN") {
    where.status = "OPEN";
  } else if (status === "CLOSED") {
    where.status = "CLOSED";
  }

  const cashSessions = await prisma.cashSession.findMany({
    where,
    include: {
      sales: {
        select: {
          id: true,
          finalTotal: true,
          total: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: { openedAt: "desc" },
    take: limit,
  });

  // Enrich with summary
  const enriched = cashSessions.map((session) => {
    const totalSales = session.sales.reduce(
      (sum, s) => sum + (s.finalTotal || s.total || 0),
      0
    );
    const cashSales = session.sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + (s.finalTotal || s.total || 0), 0);

    return {
      ...session,
      salesCount: session.sales.length,
      totalSales,
      cashSales,
      expectedAmount: session.expectedAmount ?? (session.openingAmount + totalSales),
      difference: session.difference ?? null,
    };
  });

  return NextResponse.json(enriched);
}
