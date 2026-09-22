import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { MOTS_DE_PASSE_INTERDITS } from "../route";

/**
 * POST /api/superadmin/account/password
 * { currentPassword, newPassword, confirmPassword }
 *
 * Permet au super administrateur connecté de changer SON propre mot de passe
 * depuis l'interface, sans passer par un script en local.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");

    /* ── Contrôles ─────────────────────────────────────────────────────── */
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Tous les champs sont obligatoires" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Les deux nouveaux mots de passe ne correspondent pas" },
        { status: 400 }
      );
    }

    const minuscule = newPassword.toLowerCase();
    if (MOTS_DE_PASSE_INTERDITS.some((m) => minuscule === m || minuscule.includes(m))) {
      return NextResponse.json(
        {
          error:
            "Ce mot de passe est trop courant (ou proche du mot de passe par défaut). Choisis-en un autre.",
        },
        { status: 400 }
      );
    }

    if (/^(.)\1+$/.test(newPassword) || /^[0-9]+$/.test(newPassword)) {
      return NextResponse.json(
        { error: "Choisis un mot de passe moins simple (mélange lettres, chiffres, symboles)" },
        { status: 400 }
      );
    }

    /* ── Vérification du mot de passe actuel ───────────────────────────── */
    const compte = await prisma.superAdmin.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, password: true },
    });

    if (!compte) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    }

    const actuelValide = await bcrypt.compare(currentPassword, compte.password);
    if (!actuelValide) {
      return NextResponse.json(
        { error: "Le mot de passe actuel est incorrect" },
        { status: 400 }
      );
    }

    const etaitFaible = await bcrypt.compare("demo123", compte.password);

    if (await bcrypt.compare(newPassword, compte.password)) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe est identique à l'actuel" },
        { status: 400 }
      );
    }

    /* ── Enregistrement ────────────────────────────────────────────────── */
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.superAdmin.update({
      where: { id: compte.id },
      data: { password: hashed },
    });

    /* ── Vérification réelle : on relit la base ────────────────────────── */
    const relu = await prisma.superAdmin.findUnique({
      where: { id: compte.id },
      select: { password: true },
    });
    const ok = relu ? await bcrypt.compare(newPassword, relu.password) : false;

    if (!ok) {
      return NextResponse.json(
        { error: "Le mot de passe n'a pas pu être enregistré. Réessaie." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: etaitFaible
        ? "Mot de passe changé avec succès. Votre compte utilisait le mot de passe par défaut : la faille est maintenant fermée."
        : "Mot de passe changé avec succès.",
      comptaitMdpParDefaut: etaitFaible,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
