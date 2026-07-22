import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// DELETE - Annuler une vente (seulement admin)
export async function DELETE(
  request: Request,
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
      where: { id, userId: user.ownerId || user.id },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Vente annulée et stocks restaurés" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'annulation de la vente" }, { status: 500 });
  }
}
'@ | Out-File -Encoding utf8 "src\app\api\sales\[id]\route.ts"

Write-Host "✅ Fichier API Annuler Vente créé avec succès"