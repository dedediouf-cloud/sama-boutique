import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Safe dynamic import for Vercel Blob (prevents build failure if package not present)
async function getBlobClient() {
  try {
    const blob = await import("@vercel/blob");
    return blob;
  } catch (e) {
    console.warn("@vercel/blob not installed or failed to load");
    return null;
  }
}

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

    // Upload to Vercel Blob (dynamic import)
    const blobModule = await getBlobClient();
    if (!blobModule?.put) {
      return NextResponse.json(
        { error: "Vercel Blob n'est pas configuré. Ajoute BLOB_READ_WRITE_TOKEN dans les variables d'environnement Vercel." },
        { status: 500 }
      );
    }

    const { put } = blobModule;
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
