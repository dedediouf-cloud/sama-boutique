import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { exporterBoutique, compresser, nomFichierTelechargement } from "@/lib/backup/export";
import { lireSauvegarde } from "@/lib/backup/service";
import { blobConfigure, modeStockage } from "@/lib/backup/storage";

export const maxDuration = 60;

/**
 * GET /api/superadmin/boutiques/[id]/backup/download
 *
 *   (sans paramètre)        → export FRAIS des données actuelles (niveau 1)
 *   ?backupId=xxxx          → télécharge un instantané déjà stocké
 *   ?format=json            → non compressé (lisible dans un éditeur de texte)
 *
 * Réservé au super admin. C'est le filet de sécurité : même sans Vercel Blob,
 * le patron peut télécharger la sauvegarde de n'importe quelle boutique.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const backupId = url.searchParams.get("backupId");
  const enJson = url.searchParams.get("format") === "json";

  const boutique = await prisma.user.findUnique({
    where: { id },
    select: { shopName: true, shopSlug: true },
  });
  if (!boutique) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  try {
    let contenu: Buffer;
    let nom: string;

    if (backupId) {
      // Instantané déjà stocké
      const { ligne, contenu: brut } = await lireSauvegarde(backupId, id);
      nom = nomFichierTelechargement(boutique.shopSlug, new Date(ligne.createdAt));
      if (enJson) {
        const { gunzipSync } = await import("zlib");
        contenu = gunzipSync(brut);
        nom = nom.replace(/\.gz$/, "");
      } else {
        contenu = brut;
      }
    } else {
      // Export frais
      const instantane = await exporterBoutique(id);
      nom = nomFichierTelechargement(boutique.shopSlug);
      if (enJson) {
        contenu = Buffer.from(JSON.stringify(instantane, null, 2), "utf-8");
        nom = nom.replace(/\.gz$/, "");
      } else {
        contenu = compresser(instantane);
      }
    }

    return new NextResponse(new Uint8Array(contenu), {
      status: 200,
      headers: {
        "Content-Type": enJson ? "application/json; charset=utf-8" : "application/gzip",
        "Content-Disposition": `attachment; filename="${nom}"`,
        "Content-Length": String(contenu.length),
        "Cache-Control": "no-store",
        "X-Stockage": modeStockage(),
        "X-Blob-Configure": blobConfigure() ? "oui" : "non",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la préparation de l'export" },
      { status: 500 }
    );
  }
}
