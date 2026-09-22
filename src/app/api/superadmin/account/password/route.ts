import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import bcrypt from "bcryptjs";

/**
 * ============================================================================
 *  COMPTE SUPER ADMIN — un seul fichier, deux méthodes
 * ============================================================================
 *  ⚠️  NE PAS déplacer ce fichier et NE PAS le fragmenter en plusieurs routes.
 *      Il doit rester à cet emplacement exact :
 *          src/app/api/superadmin/account/route.ts
 *
 *  GET  /api/superadmin/account   → informations du compte connecté
 *  POST /api/superadmin/account   → changement de mot de passe
 *
 *  (Les deux méthodes sont volontairement dans le même fichier : cela évite
 *   tout import entre fichiers de route, que Next.js refuse.)
 * ============================================================================
 */

/** Mots de passe refusés (publics, connus, ou trop proches du mot de passe par défaut) */
const MOTS_DE_PASSE_INTERDITS = [
  "demo123",
  "demo1234",
  "demo",
  "superadmin",
  "super-admin",
  "password",
  "passw0rd",
  "motdepasse",
  "mot de passe",
  "12345678",
  "123456789",
  "1234567890",
  "administrateur",
  "admin123",
  "samaboutique",
  "samaboutique123",
  "qwerty123",
  "azerty123",
  "iloveyou",
  "welcome123",
];

/** Vérifie qu'un mot de passe respecte les règles de sécurité */
function validerMotDePasse(motDePasse: string): { ok: boolean; error?: string } {
  const mdp = String(motDePasse || "");

  if (!mdp) {
    return { ok: false, error: "Le mot de passe est obligatoire" };
  }

  if (mdp.length < 8) {
    return {
      ok: false,
      error: "Le nouveau mot de passe doit contenir au moins 8 caractères",
    };
  }

  const minuscule = mdp.toLowerCase().trim();
  if (
    MOTS_DE_PASSE_INTERDITS.some((interdit) => {
      const mot = interdit.toLowerCase();
      return minuscule === mot || minuscule.includes(mot);
    })
  ) {
    return {
      ok: false,
      error:
        "Ce mot de passe est trop courant (ou proche du mot de passe par défaut). Choisis-en un autre.",
    };
  }

  if (/^[0-9]+$/.test(mdp)) {
    return {
      ok: false,
      error:
        "Choisis un mot de passe moins simple (lettres + chiffres, ou plusieurs mots)",
    };
  }

  if (/^(.)\1+$/.test(mdp)) {
    return {
      ok: false,
      error: "Choisis un mot de passe moins simple (évite les caractères répétés)",
    };
  }

  return { ok: true };
}

/* ========================================================================== */
/*  GET — informations du compte super admin connecté                        */
/* ========================================================================== */

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const compte = await prisma.superAdmin.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });

    if (!compte) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    }

    const usingWeakPassword = await bcrypt.compare("demo123", compte.password);

    return NextResponse.json({
      id: compte.id,
      email: compte.email,
      name: compte.name,
      createdAt: compte.createdAt,
      updatedAt: compte.updatedAt,
      usingWeakPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/* ========================================================================== */
/*  POST — changement du mot de passe                                        */
/*  Body : { currentPassword, newPassword, confirmPassword }                 */
/* ========================================================================== */

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

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Les deux nouveaux mots de passe ne correspondent pas" },
        { status: 400 }
      );
    }

    const validation = validerMotDePasse(newPassword);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
