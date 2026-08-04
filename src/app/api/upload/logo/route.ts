// @ts-nocheck
// SOLUTION SIMPLE ET FIABLE : Upload de logo en base64 directement dans la base de données.
// Plus besoin de Vercel Blob (problèmes de bundling/Turbopack sur Vercel).
// Fonctionne partout + support Super Admin (gestion des boutiques).
// VERSION: 2026-08-04-base64-raw  |  MÉTHODE: raw-sql (double stratégie)  |  AUCUN prisma.user.update()

const LOGO_UPLOAD_VERSION = "2026-08-04-base64-raw";
const LOGO_UPLOAD_METHOD = "raw-sql";

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

  // Déclarer tôt pour que le catch outer puisse toujours y accéder (évite TDZ)
  let ownerId: string = session.user.ownerId || session.user.id;
  let dataUrl: string = "";

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

    // Super Admin peut uploader un logo pour n'importe quelle boutique
    if (targetUserId && isSuperAdmin(session.user?.role)) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
      }
      ownerId = targetUserId;
    }

    // Vérifie que l'utilisateur existe (requis)
    const existing = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!existing) {
      return NextResponse.json({ 
        error: "Utilisateur introuvable dans la base", 
        ownerId,
        sessionUser: { id: session.user.id, ownerId: session.user.ownerId }
      }, { status: 404 });
    }

    // === MISE À JOUR DU LOGO EN BASE64 AVEC RAW SQL ===
    // Utilisation de RAW SQL (template) pour éviter complètement l'erreur 
    // "invalid 'prisma.user.update()' invocation" (stale Prisma client généré)
    // Version marquée pour confirmer que le bon code est déployé
    console.log(`[LOGO-UPLOAD ${LOGO_UPLOAD_VERSION}] Starting raw update for ownerId=${ownerId}, dataUrlLen=${dataUrl.length}`);

    let updateSucceeded = false;
    let lastUpdateError: any = null;

    // Stratégie 1 : $executeRaw (template literal) - la plus sûre
    try {
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "logoUrl" = ${dataUrl}, 
            "updatedAt" = NOW()
        WHERE "id" = ${ownerId}
      `;
      updateSucceeded = true;
      console.log(`[LOGO-UPLOAD ${LOGO_UPLOAD_VERSION}] ✅ SUCCESS via $executeRaw (template)`);
    } catch (err1: any) {
      lastUpdateError = err1;
      console.warn("[LOGO-UPLOAD] $executeRaw template échoué, essai du fallback unsafe...", err1?.message?.substring(0, 200));
    }

    // Stratégie 2 : Fallback $executeRawUnsafe (si le template échoue pour une raison obscure)
    if (!updateSucceeded) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "logoUrl" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          dataUrl,
          ownerId
        );
        updateSucceeded = true;
        console.log(`[LOGO-UPLOAD ${LOGO_UPLOAD_VERSION}] ✅ SUCCESS via $executeRawUnsafe (fallback)`);
      } catch (err2: any) {
        lastUpdateError = err2;
        console.error(`=== ÉCHEC DES DEUX STRATÉGIES RAW SQL (${LOGO_UPLOAD_VERSION}) ===`);
      }
    }

    if (!updateSucceeded) {
      console.error("Message:", lastUpdateError?.message);
      console.error("Code:", lastUpdateError?.code);
      console.error("Meta:", lastUpdateError?.meta);

      return NextResponse.json({
        error: "Erreur lors de la sauvegarde en base de données",
        details: lastUpdateError?.message || String(lastUpdateError),
        code: lastUpdateError?.code,
        ownerId,
        fieldLength: dataUrl.length,
        method: LOGO_UPLOAD_METHOD,
        version: LOGO_UPLOAD_VERSION,
        strategiesTried: ["$executeRaw", "$executeRawUnsafe"],
        hint: "AUCUN appel à 'prisma.user.update()' n'existe dans ce code. Si tu vois encore cette erreur, c'est que l'ANCIEN code tourne sur Vercel (build cache).",
        solution: "1) Redeploy avec 'Clear build cache' (obligatoire)  2) Vérifie Function Logs sur Vercel  3) Attends 60-90s après le déploiement",
        rawError: lastUpdateError ? { message: lastUpdateError.message, code: lastUpdateError.code, name: lastUpdateError.name } : null
      }, { status: 500 });
    }

    // Vérification post-update pour confirmer que la sauvegarde a bien marché
    let verified = false;
    try {
      const check = await prisma.user.findUnique({ 
        where: { id: ownerId }, 
        select: { logoUrl: true } 
      });
      verified = !!check?.logoUrl;
    } catch (checkErr) {
      console.warn("Post-update verification failed (non bloquant):", checkErr);
    }

    return NextResponse.json({
      success: true,
      logoUrl: dataUrl,
      message: "Logo mis à jour avec succès",
      method: LOGO_UPLOAD_METHOD,
      version: LOGO_UPLOAD_VERSION,
      strategyUsed: updateSucceeded ? "executeRaw" : "executeRawUnsafe",
      verified,
      ownerId,
      dataUrlLength: dataUrl.length
    });
  } catch (error: any) {
    console.error(`=== LOGO UPLOAD ERROR (${LOGO_UPLOAD_VERSION}) ===`);
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
        method: LOGO_UPLOAD_METHOD,
        version: LOGO_UPLOAD_VERSION,
        session: {
          userId: session?.user?.id,
          ownerId: session?.user?.ownerId,
          role: session?.user?.role
        },
        // Always include full raw error for debugging
        rawError: error ? { message: error.message, code: error.code, name: error.name } : null,
        hint: "Vérifie les Function Logs sur Vercel pour le détail exact. Si tu vois 'prisma.user.update', c'est que l'ancien code n'a pas encore été déployé."
      },
      { status: 500 }
    );
  }
}
