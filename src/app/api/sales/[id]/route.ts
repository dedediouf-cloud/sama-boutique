import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// DELETE /api/sales/[id] — Annuler une vente (ADMIN ONLY)
// Next.js 15+ compatible — fixes RouteHandlerConfig type error
export async function DELETE(
  request: NextRequest,
  context: any
) {
  const { id } = await context.params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Seuls les administrateurs peuvent annuler une vente" }, { status: 403 });
  }

  try {
    const sale = await prisma.sale.findFirst({
      where: {
        id,
        userId: user.ownerId || user.id,
      },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
    }

    // Restaure les stocks + supprime la vente
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: "Vente annulée et stocks restaurés",
    });
  } catch (error) {
    console.error("Erreur annulation vente:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de la vente" },
      { status: 500 }
    );
  }
}
