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
    const { billingInterval } = await req.json();
    const interval = billingInterval === "annual" ? "annual" : "monthly";

    const updated = await prisma.user.update({
      where: { id },
      data: { billingInterval: interval },
    });

    return NextResponse.json({
      message: `Intervalle mis à jour : ${interval === "annual" ? "annuel" : "mensuel"}`,
      boutique: {
        id: updated.id,
        billingInterval: updated.billingInterval,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
