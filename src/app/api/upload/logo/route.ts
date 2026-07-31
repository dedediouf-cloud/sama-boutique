import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Only admins can change logo for their shop
  const ownerId = session.user.ownerId || session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    // Basic validation
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) { // 4MB max
      return NextResponse.json({ error: "L'image est trop volumineuse (max 4MB)" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`logos/${ownerId}-${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });

    // Save URL to the user (boutique)
    await prisma.user.update({
      where: { id: ownerId },
      data: { logoUrl: blob.url },
    });

    return NextResponse.json({
      success: true,
      logoUrl: blob.url,
      message: "Logo mis à jour avec succès",
    });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du logo" },
      { status: 500 }
    );
  }
}
