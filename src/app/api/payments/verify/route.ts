import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getPaymentProvider } from "@/lib/payments";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { saleId } = await request.json();
    const ownerId = user.ownerId || user.id;

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, userId: ownerId },
      include: { transactions: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 });
    }

    if (sale.paymentMethod === "cash" || sale.paymentStatus === "paid") {
      return NextResponse.json({ success: true, status: sale.paymentStatus, message: "Paiement confirmé" });
    }

    const transaction = sale.transactions[0];
    if (!transaction) {
      return NextResponse.json({ error: "Aucune transaction trouvée" }, { status: 404 });
    }

    const provider = getPaymentProvider(transaction.provider as any);
    const statusResult = await provider.checkStatus(transaction.reference || transaction.id);

    // Mise à jour du statut
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: statusResult.status },
      });
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: statusResult.status },
      });
    });

    return NextResponse.json({
      success: statusResult.success,
      status: statusResult.status,
      message: statusResult.message,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
