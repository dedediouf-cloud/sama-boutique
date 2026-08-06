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

    // === Support pour panier complet (plusieurs produits) ===
    if (body.isCart && Array.isArray(body.items)) {
      // Créer une réservation groupée
      const reservation = await prisma.reservation.create({
        data: {
          userId: user.id,
          productName: `Panier (${body.items.length} articles)`,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          quantity: body.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
          message: body.message || 
            body.items.map((i: any) => `${i.name} × ${i.quantity}`).join(" • "),
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Réservation du panier envoyée avec succès",
        reservation 
      }, { status: 201 });
    }

    // === Réservation produit unique (comportement existant) ===
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
