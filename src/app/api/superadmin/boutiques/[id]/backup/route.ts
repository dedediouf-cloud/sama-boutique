import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { creerSauvegarde } from "@/lib/backup/service";
import { blobConfigure, modeStockage } from "@/lib/backup/storage";

export const maxDuration = 60;

/**
 * GET  /api/superadmin/boutiques/[id]/backup  → liste des instants sauvegardés
 * POST /api/superadmin/boutiques/[id]/backup  → crée une sauvegarde maintenant
 *        body : { permanent?: boolean }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const [boutique, backups, reglages] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, shopName: true, shopSlug: true } }),
    prisma.boutiqueBackup.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        kind: true,
        sizeBytes: true,
        counts: true,
        permanent: true,
        createdBy: true,
      },
    }),
    prisma.globalSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!boutique) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    boutique,
    backups,
    stockage: modeStockage(),
    stockageConfigure: blobConfigure(),
    retention: reglages?.backupRetention ?? 30,
    actif: reglages?.backupEnabled ?? true,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const boutique = await prisma.user.findUnique({
      where: { id },
      select: { id: true, shopName: true },
    });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }

    const res = await creerSauvegarde(id, "manual", session.user?.email || "superadmin");

    if (body?.permanent === true) {
      await prisma.boutiqueBackup.updateMany({
        where: { userId: id, permanent: false },
        data: { permanent: false },
      });
      await prisma.boutiqueBackup.update({
        where: { id: res.backupId },
        data: { permanent: true },
      });
    }

    return NextResponse.json({
      message: `Sauvegarde créée pour « ${boutique.shopName} »`,
      backupId: res.backupId,
      taille: res.taille,
      resume: res.resume,
      stockage: modeStockage(),
      stockageConfigure: blobConfigure(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erreur lors de la création de la sauvegarde",
        hint: blobConfigure()
          ? undefined
          : "La variable BLOB_READ_WRITE_TOKEN n'est pas configurée : la sauvegarde a été écrite sur le disque local (valable uniquement en développement).",
      },
      { status: 500 }
    );
  }
}
