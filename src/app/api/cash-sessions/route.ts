import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentSession = await prisma.cashSession.findFirst({
    where: {
      userId: session.user.id,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(currentSession);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { openingAmount, note } = await req.json();

  // Close any previous open session (safety)
  await prisma.cashSession.updateMany({
    where: {
      userId: session.user.id,
      status: "OPEN",
    },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  const cashSession = await prisma.cashSession.create({
    data: {
      userId: session.user.id,
      openingAmount: parseFloat(openingAmount) || 0,
      note: note || null,
      status: "OPEN",
    },
  });

  return NextResponse.json(cashSession);
}
