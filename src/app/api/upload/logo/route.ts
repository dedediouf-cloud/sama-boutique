// @ts-nocheck
// SOLUTION SIMPLE ET FIABLE : Upload de logo en base64 directement dans la base de données.
// Plus besoin de Vercel Blob (problèmes de bundling/Turbopack sur Vercel).
// Fonctionne partout + support Super Admin (gestion des boutiques).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;
    const targetUserId = formData.get("targetUserId") as string | null; // Pour Super Admin

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier doit être une image" }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse (max 4MB)" }, { status: 400 });
    }

    // Convertir l'image en base64 (solution fiable sans dépendance externe)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    let ownerId = session.user.ownerId || session.user.id;

    // Super Admin peut uploader un logo pour n'importe quelle boutique
    if (targetUserId && isSuperAdmin(session.user?.role)) {
      // Vérifier que la boutique existe
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
      }
      ownerId = targetUserId;
    }

    await prisma.user.update({
      where: { id: ownerId },
      data: { logoUrl: dataUrl },
    });

    return NextResponse.json({
      success: true,
      logoUrl: dataUrl,
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
