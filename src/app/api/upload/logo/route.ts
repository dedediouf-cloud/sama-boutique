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
// NOTE: We now try dynamic import FIRST because @vercel/blob is ESM-only in recent versions
// and `require()` often throws ERR_REQUIRE_ESM on Vercel serverless.
let cachedPutFn: any = null;

// We will return both the put function (if successful) AND the last error object
async function getBlobPut(): Promise<{ putFn: any; error: any }> {
  if (cachedPutFn) {
    return { putFn: cachedPutFn, error: null };
  }

  const errors: any[] = [];
  let lastError: any = null;

  // Strategy 1: Dynamic import FIRST (ESM-only package)
  try {
    // @ts-ignore
    const mod = await import("@vercel/blob");
    if (typeof mod.put === "function") {
      cachedPutFn = mod.put;
      console.log("[upload/logo] ✅ Loaded via dynamic import (named)");
      return { putFn: cachedPutFn, error: null };
    }
    if (mod.default && typeof mod.default.put === "function") {
      cachedPutFn = mod.default.put;
      console.log("[upload/logo] ✅ Loaded via dynamic import (default)");
      return { putFn: cachedPutFn, error: null };
    }
    errors.push({ method: "dynamic-import", message: "put function not found" });
  } catch (e: any) {
    lastError = {
      name: e?.name || "DynamicImportError",
      message: e?.message || String(e),
      code: e?.code,
      stack: e?.stack?.substring(0, 2200)
    };
    errors.push({ method: "dynamic-import", ...lastError });
    console.error("[upload/logo] ❌ Dynamic import failed:", lastError);
  }

  // Strategy 2: require (often fails with ERR_REQUIRE_ESM)
  try {
    // @ts-ignore
    const blob = require("@vercel/blob");
    if (typeof blob.put === "function") {
      cachedPutFn = blob.put;
      console.log("[upload/logo] ✅ Loaded via require (named)");
      return { putFn: cachedPutFn, error: null };
    }
    if (blob.default && typeof blob.default.put === "function") {
      cachedPutFn = blob.default.put;
      console.log("[upload/logo] ✅ Loaded via require (default)");
      return { putFn: cachedPutFn, error: null };
    }
    errors.push({ method: "require", message: "put function not found" });
  } catch (e: any) {
    lastError = {
      name: e?.name || "RequireError",
      message: e?.message || String(e),
      code: e?.code,
      stack: e?.stack?.substring(0, 2200)
    };
    errors.push({ method: "require", ...lastError });
    console.error("[upload/logo] ❌ Require failed:", lastError);
  }

  const fullError = {
    name: lastError?.name || "BlobModuleLoadError",
    message: lastError?.message || "Failed to load @vercel/blob",
    code: lastError?.code,
    stack: lastError?.stack,
    methods: errors,
    possibleCause: lastError?.code === "ERR_REQUIRE_ESM" 
      ? "ERR_REQUIRE_ESM: @vercel/blob is ESM-only. Dynamic import should have worked but failed in serverless bundle."
      : "Build cache / Turbopack / missing module in serverless function."
  };

  console.error("[upload/logo] ❌❌ ALL STRATEGIES FAILED:", fullError);
  return { putFn: null, error: fullError };
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

    const result = await getBlobPut();
    const put = result.putFn;
    const loadError = result.error;

    if (!put) {
      const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
      const lastError = loadError || (globalThis as any).__lastBlobError || {};

      console.error("[upload/logo] getBlobPut() returned no putFn. hasToken:", hasToken);
      console.error("[upload/logo] LOAD ERROR OBJECT:", JSON.stringify(lastError, null, 2));
      if (lastError.stack) {
        console.error("[upload/logo] STACK:", lastError.stack);
      }

      if (hasToken) {
        // Token is present but loading @vercel/blob failed at runtime
        return NextResponse.json(
          {
            error: "Erreur technique avec Vercel Blob (le token est présent mais le module n'a pas pu s'initialiser).",
            tokenPresent: true,
            lastImportError: lastError,
            rawError: lastError,
            explanation: "Le token BLOB_READ_WRITE_TOKEN est bien lu par le serveur, mais `require('@vercel/blob')` ou `import('@vercel/blob')` a échoué au runtime (dans la fonction serverless).",
            thisIsNotATokenProblem: true,
            important: "Ceci est une erreur de chargement / bundling du package `@vercel/blob` au runtime, PAS du token.",
            whatToDo: [
              "1. Va dans Vercel → Deployments",
              "2. Clique sur le dernier déploiement",
              "3. Ouvre **Function Logs** (PAS Build Logs)",
              "4. Réessaie d'uploader un logo",
              "5. Cherche l'erreur pour `/api/upload/logo`",
              "6. Copie **TOUT** l'erreur (name, message, code, stack)",
              "7. Colle-la ici"
            ],
            howToGetTheRealError: [
              "Ouvre les **Function Logs** sur Vercel (pas les Build Logs) pour voir le vrai message d'erreur."
            ],
            recommended: "Redeploy avec 'Clear build cache'",
            recommendedFix: "Copie l'erreur complète des Function Logs et colle-la ici.",
            debugInfo: {
              hasToken: hasToken,
              errorCapturedAt: new Date().toISOString(),
              methodsTried: lastError.methods || ["dynamic-import", "require"]
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
