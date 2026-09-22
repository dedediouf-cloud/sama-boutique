import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertWritable } from "@/lib/access";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  // ⚡ On ne renvoie que le NOM du fournisseur (l'interface n'affiche que ça),
  //    au lieu de l'objet fournisseur complet dupliqué pour chaque produit.
  const products = await prisma.product.findMany({
    where: { userId: ownerId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      quantity: true,
      lowStock: true,
      category: true,
      imageUrl: true,
      barcode: true,
      supplierId: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      supplier: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  // Verrou essai/abonnement : modifie les données uniquement si la boutique
  // n'est pas en lecture seule (essai gratuit terminé).
  const __locked = await assertWritable();
  if (__locked) return __locked;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const product = await prisma.product.create({
      data: {
        ...body,
        userId: user.id,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

// ✅ NOUVEAU : Suppression en masse pour l'admin
export async function DELETE() {
  // Verrou essai/abonnement : modifie les données uniquement si la boutique
  // n'est pas en lecture seule (essai gratuit terminé).
  const __locked = await assertWritable();
  if (__locked) return __locked;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const ownerId = user.ownerId || user.id;

    const result = await prisma.product.deleteMany({
      where: { userId: ownerId },
    });

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `${result.count} produit(s) supprimé(s)` 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression en masse" }, { status: 500 });
  }
}
