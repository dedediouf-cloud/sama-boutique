import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// DELETE /api/sales/[id] - Annuler une vente (ADMIN ONLY)
// Signature standard Next.js 15+ (corrige l'erreur RouteHandlerConfig sur Vercel)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    // Vérifier si déjà annulée
    if (sale.paymentStatus === "cancelled") {
      return NextResponse.json({ error: "Cette vente est déjà annulée" }, { status: 400 });
    }

    // Restaure les stocks + marque la vente comme annulée (ne supprime PAS pour garder l'historique)
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.sale.update({
        where: { id },
        data: { paymentStatus: "cancelled" },
      });
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
