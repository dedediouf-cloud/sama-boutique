import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import bcrypt from "bcryptjs";

/** Mots de passe refusés pour un compte super administrateur */
export const MOTS_DE_PASSE_INTERDITS = [
  "demo123",
  "superadmin",
  "password",
  "motdepasse",
  "12345678",
  "123456789",
  "administrateur",
  "samaboutique",
];

/**
 * GET /api/superadmin/account
 * Informations sur le compte super admin connecté.
 * `usingWeakPassword` = true si le mot de passe est encore "demo123".
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const compte = await prisma.superAdmin.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true, password: true },
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
