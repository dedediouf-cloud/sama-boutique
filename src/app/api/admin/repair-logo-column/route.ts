// @ts-nocheck
// Endpoint de réparation pour forcer la création de la colonne logoUrl
// Accès : Super Admin uniquement (ou via curl avec secret si besoin)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Sécurité simple : seulement Super Admin
  if (!session?.user?.id || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Accès refusé (Super Admin uniquement)" }, { status: 403 });
  }

  try {
    console.log("[REPAIR-LOGO] Début de la réparation de la colonne logoUrl...");

    // 1. Forcer la création de la colonne
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;`
    );

    // 2. Vérifier que la colonne existe maintenant
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'logoUrl'
    `) as any[];

    const columnExists = Array.isArray(result) && result.length > 0;

    // 3. Optionnel : mettre à jour un utilisateur de test si besoin (commenté par défaut)

    return NextResponse.json({
      success: true,
      message: columnExists 
        ? "✅ Colonne 'logoUrl' créée avec succès dans la base de données !"
        : "⚠️ La colonne a été demandée mais la vérification a échoué.",
      columnExists,
      method: "repair-endpoint",
      version: "2026-08-04",
      nextStep: "Maintenant, réessaie d'uploader un logo depuis /settings ou /superadmin"
    });
  } catch (error: any) {
    console.error("[REPAIR-LOGO] Erreur:", error);
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la réparation",
      details: error?.message,
      code: error?.code,
      hint: "Vérifie que DATABASE_URL est correcte et que tu as les droits sur la base."
    }, { status: 500 });
  }
}
