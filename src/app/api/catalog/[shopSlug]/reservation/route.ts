import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { shopSlug },
    });

    if (!user) {
      return NextResponse.json({ error: "Boutique non trouvée" }, { status: 404 });
    }

    const body = await request.json();

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        productId: body.productId,
        productName: body.productName,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        quantity: body.quantity || 1,
        message: body.message,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
