import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Suppression en cascade manuelle pour éviter les erreurs de contraintes
    await prisma.$transaction([
      prisma.referralReward.deleteMany({ where: { OR: [{ referrerId: id }, { referredId: id }] } }),
      prisma.user.updateMany({ where: { referredById: id }, data: { referredById: null } }),
      prisma.subscriptionPayment.deleteMany({ where: { userId: id } }),
      prisma.inventoryCount.deleteMany({ where: { userId: id } }),
      prisma.stockEntry.deleteMany({ where: { userId: id } }),
      prisma.paymentTransaction.deleteMany({ where: { sale: { userId: id } } }),
      prisma.saleItem.deleteMany({ where: { sale: { userId: id } } }),
      prisma.delivery.deleteMany({ where: { userId: id } }),
      prisma.sale.deleteMany({ where: { userId: id } }),
      prisma.reservation.deleteMany({ where: { userId: id } }),
      prisma.product.deleteMany({ where: { userId: id } }),
      prisma.customer.deleteMany({ where: { userId: id } }),
      prisma.employee.deleteMany({ where: { userId: id } }),
      prisma.promotion.deleteMany({ where: { userId: id } }),
      prisma.supplierOrderItem.deleteMany({ where: { supplierOrder: { userId: id } } }),
      prisma.supplierOrder.deleteMany({ where: { userId: id } }),
      prisma.supplier.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Boutique supprimée avec succès" });
  } catch (error: any) {
    console.error("Erreur suppression boutique:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
