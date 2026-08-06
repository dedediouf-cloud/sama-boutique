import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_PRODUCT_IMAGE_SIZE = 350 * 1024; // ~350KB max for product photo

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucune image envoyée" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      return NextResponse.json({ 
        error: `Image trop volumineuse (max ${Math.round(MAX_PRODUCT_IMAGE_SIZE / 1024)} Ko)` 
      }, { status: 400 });
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Safety check
    if (dataUrl.length > 550000) {
      return NextResponse.json({ error: "Image trop volumineuse après encodage" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl: dataUrl,
      message: "Photo produit uploadée avec succès"
    });
  } catch (error: any) {
    console.error("Product image upload error:", error);
    return NextResponse.json({ 
      error: "Erreur lors de l'upload de l'image", 
      details: error?.message 
    }, { status: 500 });
  }
}
