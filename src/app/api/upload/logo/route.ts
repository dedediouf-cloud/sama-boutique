// @ts-nocheck
// @vercel/blob is an optional dependency for logo uploads.
// We use dynamic import + @ts-nocheck because Vercel TypeScript
// sometimes fails to resolve its types during `next build`
// (especially with build cache), even when the package is installed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Robust loader for @vercel/blob
// Tries multiple strategies because of Turbopack + Vercel runtime differences
let cachedPutFn: any = null;

async function getBlobPut() {
  if (cachedPutFn) return cachedPutFn;

  const errors: any[] = [];

  // Strategy 1: require (most reliable on Vercel serverless functions)
  try {
    // @ts-ignore
    const blob = require("@vercel/blob");
    if (typeof blob.put === "function") {
      cachedPutFn = blob.put;
      console.log("[upload/logo] ✅ Loaded via require (named)");
      return cachedPutFn;
    }
    if (blob.default && typeof blob.default.put === "function") {
      cachedPutFn = blob.default.put;
      console.log("[upload/logo] ✅ Loaded via require (default)");
      return cachedPutFn;
    }
    errors.push({ method: "require", error: "put function not found after require" });
  } catch (e: any) {
    const errInfo = { 
      name: e?.name || "Error", 
      message: e?.message || String(e), 
      code: e?.code, 
      stack: e?.stack ? e.stack.substring(0, 1500) : undefined 
    };
    errors.push({ method: "require", error: errInfo.message, code: errInfo.code, stack: errInfo.stack });
    (globalThis as any).__lastBlobError = errInfo;
  }

  // Strategy 2: dynamic import (fallback)
  try {
    // @ts-ignore
    const mod = await import("@vercel/blob");
    if (typeof mod.put === "function") {
      cachedPutFn = mod.put;
      console.log("[upload/logo] ✅ Loaded via dynamic import (named)");
      return cachedPutFn;
    }
    if (mod.default && typeof mod.default.put === "function") {
      cachedPutFn = mod.default.put;
      console.log("[upload/logo] ✅ Loaded via dynamic import (default)");
      return cachedPutFn;
    }
    errors.push({ method: "dynamic-import", error: "put function not found" });
  } catch (e: any) {
    const errInfo = { 
      name: e?.name || "Error", 
      message: e?.message || String(e), 
      code: e?.code, 
      stack: e?.stack ? e.stack.substring(0, 1500) : undefined 
    };
    errors.push({ method: "dynamic-import", error: errInfo.message, code: errInfo.code, stack: errInfo.stack });
    (globalThis as any).__lastBlobError = errInfo;
  }

  console.error("[upload/logo] ❌ All loading strategies for @vercel/blob failed", errors);
  (globalThis as any).__lastBlobError = { 
    methods: errors,
    message: "All strategies failed to load @vercel/blob",
    possibleCause: "Package may be ESM-only (ERR_REQUIRE_ESM), bundling issue, build cache, or missing from serverless bundle. Check Function Logs for exact error."
  };
  return null;
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
      const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
      const lastError = (globalThis as any).__lastBlobError;

      console.error("[upload/logo] getBlobPut() returned null. hasToken:", hasToken, "lastError:", lastError);
      console.error("[upload/logo] FULL IMPORT ERROR DETAILS:", JSON.stringify(lastError, null, 2));

      if (hasToken) {
        // Token is present but loading @vercel/blob failed at runtime
        return NextResponse.json(
          {
            error: "Erreur technique avec Vercel Blob (le token est présent mais le module n'a pas pu s'initialiser).",
            tokenPresent: true,
            lastImportError: lastError || null,
            explanation: "Le token BLOB_READ_WRITE_TOKEN est bien lu par le serveur, mais `require('@vercel/blob')` ou `import('@vercel/blob')` a échoué au runtime (dans la fonction serverless).",
            thisIsNotATokenProblem: true,
            important: "Ceci est une erreur de chargement / bundling du package `@vercel/blob` au runtime, PAS du token.",
            whatToDo: [
              "1. Va dans Vercel → Deployments",
              "2. Clique sur le dernier déploiement",
              "3. Ouvre **Function Logs** (PAS Build Logs)",
              "4. Réessaie d'uploader un logo",
              "5. Cherche l'erreur pour `/api/upload/logo`",
              "6. Copie **TOUT** : le nom de l'erreur (name), le message, le code, et la stack complète",
              "7. Colle-la ici (ou dans la réponse)"
            ],
            howToGetTheRealError: [
              "Ouvre les **Function Logs** sur Vercel pour voir le vrai message d'erreur d'import (require ou dynamic import)."
            ],
            recommended: "Redeploy avec 'Clear build cache' (ça résout souvent ce genre de problème de module / cache)",
            recommendedFix: "Après avoir copié l'erreur exacte des Function Logs, envoie-la pour analyse.",
            debugInfo: {
              hasToken: hasToken,
              errorCapturedAt: new Date().toISOString()
            }
          },
          { status: 500 }
        );
      }

      // No token configured at all
      return NextResponse.json(
        {
          error: "Vercel Blob n'est pas activé sur ce projet.",
          tokenPresent: false,
          steps: [
            "1. Ouvre ton projet Vercel",
            "2. Onglet **Storage** (barre latérale)",
            "3. **Create Database** → **Blob**",
            "4. Crée le store",
            "5. Copie la valeur `BLOB_READ_WRITE_TOKEN`",
            "6. **Settings → Environment Variables**",
            "7. Ajoute : Name=BLOB_READ_WRITE_TOKEN + colle le token",
            "8. **Redeploy** + coche **Clear build cache**"
          ]
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
