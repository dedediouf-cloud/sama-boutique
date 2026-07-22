import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const { products } = await request.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit à importer" }, { status: 400 });
    }

    const createdProducts = [];

    for (const p of products) {
      const product = await prisma.product.create({
        data: {
          name: p.name?.trim() || "Sans nom",
          description: p.description || "",
          price: parseFloat(p.price) || 0,
          quantity: parseInt(p.quantity) || 0,
          lowStock: parseInt(p.lowStock) || 5,
          category: p.category || "",
          userId: user.id,
        },
      });
      createdProducts.push(product);
    }

    return NextResponse.json({
      success: true,
      imported: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    console.error("CSV Import Error:", error);
    return NextResponse.json({ error: "Erreur lors de l'import CSV" }, { status: 500 });
  }
}
