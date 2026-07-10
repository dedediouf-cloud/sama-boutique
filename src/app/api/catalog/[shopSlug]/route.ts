import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  const user = await prisma.user.findUnique({
    where: { shopSlug },
    include: {
      products: {
        where: { quantity: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Boutique non trouvée" }, { status: 404 });
  }

  return NextResponse.json({
    shopName: user.shopName,
    phone: user.phone,
    products: user.products,
  });
}
