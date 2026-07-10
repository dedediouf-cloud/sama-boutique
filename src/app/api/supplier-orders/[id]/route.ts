import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ownerId = user.ownerId || user.id;
  const { id } = await params;

  try {
    const { status } = await request.json();

    const order = await prisma.supplierOrder.findFirst({
      where: { id, userId: ownerId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (status === "received" && order.status === "received") {
      return NextResponse.json({ error: "Cette commande est déjà marquée comme reçue" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplierOrder.update({
        where: { id },
        data: { status, receivedDate: status === "received" ? new Date() : null },
      });

      if (status === "received" && order.status !== "received") {
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity: { increment: item.quantity } },
            });
            await tx.stockEntry.create({
              data: {
                quantity: item.quantity,
                note: `Réception commande fournisseur #${order.id}`,
                productId: item.productId,
                userId: ownerId,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
