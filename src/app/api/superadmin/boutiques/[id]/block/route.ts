import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user?.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { isBlocked } = await req.json();

    const boutique = await prisma.user.update({
      where: { id },
      data: { isBlocked: !!isBlocked },
    });

    return NextResponse.json({
      message: isBlocked ? "Boutique bloquée" : "Boutique débloquée",
      boutique: {
        id: boutique.id,
        isBlocked: boutique.isBlocked,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
