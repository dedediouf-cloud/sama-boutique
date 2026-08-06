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
      // Préparer les données détaillées avec prix
      const itemsWithPrices = body.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity || 1,
        price: i.price || 0,
      }));

      const computedTotal = itemsWithPrices.reduce((sum: number, i: any) => 
        sum + (i.price * i.quantity), 0);

      const itemsData = JSON.stringify(itemsWithPrices);

      // Créer une réservation groupée avec montants
      const reservation = await prisma.reservation.create({
        data: {
          userId: user.id,
          productName: `Panier (${body.items.length} articles)`,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          quantity: body.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
          message: body.message || 
            body.items.map((i: any) => `${i.name} × ${i.quantity}`).join(" • "),
          // @ts-ignore - new fields added to schema (will be available after prisma db push)
          total: computedTotal,
          // @ts-ignore
          itemsData: itemsData,
        } as any,
      });

      return NextResponse.json({ 
        success: true, 
        message: "Réservation du panier envoyée avec succès",
        reservation 
      }, { status: 201 });
    }

    // === Réservation produit unique (comportement existant) ===
    const unitPrice = body.unitPrice || 0;
    const quantity = body.quantity || 1;

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        productId: body.productId,
        productName: body.productName,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        quantity: quantity,
        message: body.message,
        // @ts-ignore - new schema fields
        unitPrice: unitPrice,
        // @ts-ignore
        total: unitPrice * quantity,
      } as any,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
