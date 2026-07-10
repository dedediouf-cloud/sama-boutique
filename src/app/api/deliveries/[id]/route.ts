import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;
  const { id } = await params;

  try {
    const { status, deliveryDate } = await request.json();

    const delivery = await prisma.delivery.findFirst({
      where: { id, userId: ownerId },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    const updateData: any = { status };
    if (deliveryDate) {
      updateData.deliveryDate = new Date(deliveryDate);
    }

    const updated = await prisma.delivery.update({
      where: { id },
      data: updateData,
      include: {
        sale: {
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
