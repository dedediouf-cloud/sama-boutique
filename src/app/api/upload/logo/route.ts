// @ts-nocheck
// @vercel/blob is an optional dependency for logo uploads.
// We use dynamic import + @ts-nocheck because Vercel TypeScript
// sometimes fails to resolve its types during `next build`
// (especially with build cache), even when the package is installed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getBlobPut() {
  try {
    // @ts-ignore - @vercel/blob may not resolve during Vercel TypeScript check
    const mod = await import("@vercel/blob");
    return mod.put;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const ownerId = session.user.ownerId || session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse (max 4MB)" }, { status: 400 });
    }

    const put = await getBlobPut();

    if (!put) {
      return NextResponse.json(
        {
          error:
            "Vercel Blob n'est pas disponible. Ajoute BLOB_READ_WRITE_TOKEN dans les Environment Variables (Storage → Blob).",
        },
        { status: 500 }
      );
    }

    const blob = await put(`logos/${ownerId}-${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });

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
