import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  try {
    await prisma.employee.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}

// === NOUVEAU : Réinitialiser le mot de passe d'un employé ===
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 4 caractères" }, { status: 400 });
    }

    // Vérifier que l'employé appartient bien à cette boutique
    const employee = await prisma.employee.findFirst({
      where: { id, userId: user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.employee.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Mot de passe réinitialisé avec succès" 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la réinitialisation du mot de passe" }, { status: 500 });
  }
}
