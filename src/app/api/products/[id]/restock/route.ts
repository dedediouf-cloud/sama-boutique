import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const ownerId = user.ownerId || user.id;

  try {
    const { quantity, note } = await request.json();

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id, userId: ownerId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    // Condition : si la quantité commandée chez un fournisseur est déjà atteinte,
    // on empêche le réapprovisionnement manuel par défaut pour éviter le double stock.
    const orderedItems = await prisma.supplierOrderItem.findMany({
      where: {
        productId: id,
        supplierOrder: { userId: ownerId, status: { not: "cancelled" } },
      },
    });
    const totalOrdered = orderedItems.reduce((sum, item) => sum + item.quantity, 0);

    const receivedEntries = await prisma.stockEntry.findMany({
      where: {
        productId: id,
        note: { startsWith: "Réception commande fournisseur" },
      },
    });
    const totalReceived = receivedEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    if (totalOrdered > 0 && totalReceived >= totalOrdered) {
      return NextResponse.json(
        { error: "La quantité commandée chez le fournisseur est déjà atteinte. Créez une nouvelle commande fournisseur pour réapprovisionner." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { quantity: { increment: quantity } },
      });

      await tx.stockEntry.create({
        data: {
          quantity,
          note: note || null,
          productId: id,
          userId: ownerId,
        },
      });
    });

    return NextResponse.json({ success: true, message: "Stock mis à jour" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du réapprovisionnement" },
      { status: 500 }
    );
  }
}
