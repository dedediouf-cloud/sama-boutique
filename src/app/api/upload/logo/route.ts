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

    if (file.size > 300 * 1024) {   // Limite stricte à 300KB pour éviter les problèmes de stockage en base64
      return NextResponse.json({ error: "Image trop volumineuse (max 300KB)" }, { status: 400 });
    }

    // Convertir l'image en base64 (solution fiable sans dépendance externe)
    let dataUrl: string;
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      dataUrl = `data:${file.type};base64,${base64}`;

      // Sécurité : vérifier la taille finale du dataUrl
      if (dataUrl.length > 500000) { // ~375KB max après base64
        return NextResponse.json({ 
          error: "Image trop volumineuse après encodage", 
          details: `Taille dataUrl: ${dataUrl.length} caractères` 
        }, { status: 400 });
      }
    } catch (convErr: any) {
      console.error("Base64 conversion error:", convErr);
      return NextResponse.json({ 
        error: "Erreur lors de la conversion de l'image", 
        details: convErr?.message 
      }, { status: 500 });
    }

    let ownerId = session.user.ownerId || session.user.id;

    // Super Admin peut uploader un logo pour n'importe quelle boutique
    if (targetUserId && isSuperAdmin(session.user?.role)) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
      }
      ownerId = targetUserId;
    }

    // Vérifie que l'utilisateur existe
    const existing = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!existing) {
      return NextResponse.json({ 
        error: "Utilisateur introuvable dans la base", 
        ownerId,
        sessionUser: { id: session.user.id, ownerId: session.user.ownerId }
      }, { status: 404 });
    }

    // Mise à jour du logo (base64)
    try {
      await prisma.user.update({
        where: { id: ownerId },
        data: { logoUrl: dataUrl },
      });
    } catch (prismaErr: any) {
      console.error("=== PRISMA UPDATE ERROR ===", prismaErr);
      return NextResponse.json({
        error: "Erreur lors de la sauvegarde en base de données",
        details: prismaErr?.message || String(prismaErr),
        code: prismaErr?.code,
        ownerId,
        fieldLength: dataUrl.length
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logoUrl: dataUrl,
      message: "Logo mis à jour avec succès",
    });
  } catch (error: any) {
    console.error("=== LOGO UPLOAD ERROR ===");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Stack:", error?.stack?.substring(0, 2000));
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    return NextResponse.json(
      { 
        error: "Erreur lors de l'upload du logo", 
        details: error?.message || String(error),
        code: error?.code || "UNKNOWN",
        name: error?.name,
        ownerIdAttempted: ownerId,
        session: {
          userId: session?.user?.id,
          ownerId: session?.user?.ownerId,
          role: session?.user?.role
        },
        // Always include full raw error for debugging
        rawError: error ? { message: error.message, code: error.code, name: error.name } : null
      },
      { status: 500 }
    );
  }
}
