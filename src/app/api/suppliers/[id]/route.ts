import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ownerId = user.ownerId || user.id;
  const { id } = await params;

  try {
    // Vérifier que le fournisseur existe et appartient à l'utilisateur
    const supplier = await prisma.supplier.findFirst({
      where: { id, userId: ownerId },
      include: {
        orders: { select: { id: true } },
        products: { select: { id: true } },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    // Sécurité : empêcher la suppression s'il y a des commandes
    if (supplier.orders.length > 0) {
      return NextResponse.json(
        { 
          error: "Impossible de supprimer ce fournisseur car il a des commandes associées. Veuillez d'abord supprimer ou archiver les commandes." 
        }, 
        { status: 400 }
      );
    }

    // Supprimer le fournisseur (les produits garderont supplierId = null grâce à la relation optionnelle)
    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Fournisseur supprimé" });
  } catch (error: any) {
    console.error("Erreur suppression fournisseur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression du fournisseur" }, 
      { status: 500 }
    );
  }
}
