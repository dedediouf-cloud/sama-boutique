import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const payments = await prisma.subscriptionPayment.findMany({
    orderBy: { paidAt: "desc" },
    include: {
      user: {
        select: {
          shopName: true,
          shopSlug: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(payments);
}
