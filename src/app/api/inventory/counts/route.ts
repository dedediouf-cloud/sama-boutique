import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const counts = await prisma.inventoryCount.findMany({
    where: { userId: ownerId },
    orderBy: { countedAt: "desc" },
    include: {
      product: {
        select: { id: true, name: true, category: true },
      },
    },
    take: 200,
  });

  return NextResponse.json(counts);
}
