import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { assertWritable } from "@/lib/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verrou essai/abonnement : modifie les données uniquement si la boutique
  // n'est pas en lecture seule (essai gratuit terminé).
  const __locked = await assertWritable();
  if (__locked) return __locked;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const ownerId = user.ownerId || user.id;

  try {
    // ⚠️  CORRECTION D'UN BUG : le navigateur envoyait déjà « unitPrice »
    // (le prix d'achat saisi dans la fenêtre de réapprovisionnement) et
    // « supplierId », mais le serveur ne lisait QUE « quantity » et « note ».
    // Résultat : le prix d'achat était silencieusement jeté. Vérifié le
    // 03/10/2026 : 850 FCFA envoyés → « Stock mis à jour » → 850 FCFA perdus.
    const { quantity, note, unitPrice, supplierId } = await request.json();

    // Prix d'achat : on n'accepte qu'un nombre strictement positif. Une valeur
    // vide ou nulle ne doit PAS écraser un prix déjà connu.
    const prixAchat =
      unitPrice === null || unitPrice === undefined || unitPrice === ""
        ? null
        : Number(unitPrice);
    const prixAchatValide =
      prixAchat !== null && Number.isFinite(prixAchat) && prixAchat > 0 ? prixAchat : null;

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
        data: {
          quantity: { increment: quantity },
          // On met à jour le prix d'achat du produit SEULEMENT si le commerçant
          // en a saisi un. Sinon on garde le prix connu : effacer une info
          // utile parce qu'on ne l'a pas ressaisie serait une régression.
          ...(prixAchatValide !== null ? { costPrice: prixAchatValide } : {}),
          // Le fournisseur n'est renseigné que s'il est fourni.
          ...(supplierId ? { supplierId } : {}),
        },
      });

      await tx.stockEntry.create({
        data: {
          quantity,
          note: note || null,
          // Historique : on garde le prix payé À CE MOMENT-LÀ. C'est ce qui
          // permet de voir l'évolution des prix d'un fournisseur.
          unitPrice: prixAchatValide,
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
