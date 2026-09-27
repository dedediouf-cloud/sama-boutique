import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { lireSauvegarde } from "@/lib/backup/service";
import { decompresser } from "@/lib/backup/export";
import { restaurerBoutique, type ModeRestauration } from "@/lib/backup/restore";

export const maxDuration = 60;

/**
 * POST /api/superadmin/boutiques/[id]/backup/[backupId]/restore
 *
 *   body : { mode: "fusionner" | "remplacer", confirmation?: "Nom de la boutique" }
 *
 *   « fusionner »  → ajoute uniquement ce qui manque (aucune suppression)
 *   « remplacer »  → efface les données de la boutique puis réinstalle l'instantané
 *                    (exige de recopier le nom exact de la boutique)
 *
 * Le mot de passe de la boutique et sa fiche ne sont jamais modifiés.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; backupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, backupId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const mode: ModeRestauration = body?.mode === "remplacer" ? "remplacer" : "fusionner";

    const boutique = await prisma.user.findUnique({
      where: { id },
      select: { id: true, shopName: true, isBlocked: true },
    });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
    }

    // Garde-fou : le mode destructif exige de recopier le nom exact
    if (mode === "remplacer") {
      const attendu = boutique.shopName?.trim();
      const fourni = String(body?.confirmation || "").trim();
      if (!attendu || fourni !== attendu) {
        return NextResponse.json(
          {
            error:
              "Pour utiliser le mode « remplacer », recopie exactement le nom de la boutique dans le champ de confirmation.",
            nomAttendu: attendu,
          },
          { status: 400 }
        );
      }
    }

    // Lecture + décompression de l'instantané
    const { ligne, contenu } = await lireSauvegarde(backupId, id);
    const instantane = decompresser(contenu);

    // Restauration
    const rapport = await restaurerBoutique(id, instantane, mode);

    // Traçabilité : on note l'opération
    await prisma.boutiqueBackup.create({
      data: {
        userId: id,
        kind: mode === "remplacer" ? "restore-replace" : "restore-merge",
        url: ligne.url,
        pathname: ligne.pathname,
        sizeBytes: 0,
        counts: JSON.stringify(rapport.crees),
        createdBy: session.user?.email || "superadmin",
        permanent: true, // trace conservée
      },
    });

    return NextResponse.json({
      success: true,
      message:
        mode === "remplacer"
          ? `Données de « ${boutique.shopName} » remplacées par l'instantané du ${new Date(ligne.createdAt).toLocaleString("fr-FR")}`
          : `Restauration terminée pour « ${boutique.shopName} » (ajout des éléments manquants)`,
      rapport,
      instantaneDu: ligne.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la restauration" },
      { status: 500 }
    );
  }
}
