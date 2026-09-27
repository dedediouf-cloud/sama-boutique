import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { supprimerSauvegarde } from "@/lib/backup/service";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/superadmin/boutiques/[id]/backup/[backupId]
 * Supprime un instantané (fichier + métadonnées).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; backupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, backupId } = await params;

  try {
    await supprimerSauvegarde(backupId, id);
    return NextResponse.json({ message: "Sauvegarde supprimée" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/boutiques/[id]/backup/[backupId]
 * body : { permanent: true|false }
 * Marque un instantané comme « à conserver » (jamais supprimé automatiquement).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; backupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, backupId } = await params;
  const body = await req.json().catch(() => ({}));

  const ligne = await prisma.boutiqueBackup.findFirst({ where: { id: backupId, userId: id } });
  if (!ligne) {
    return NextResponse.json({ error: "Sauvegarde introuvable" }, { status: 404 });
  }

  const maj = await prisma.boutiqueBackup.update({
    where: { id: ligne.id },
    data: { permanent: Boolean(body?.permanent) },
  });

  return NextResponse.json({
    message: maj.permanent
      ? "Sauvegarde marquée comme à conserver"
      : "Sauvegarde à nouveau soumise à la rotation automatique",
    permanent: maj.permanent,
  });
}
