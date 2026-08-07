import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const ownerId = (user as any).ownerId || user.id;

    const currentSession = await prisma.cashSession.findFirst({
      where: {
        userId: ownerId,
        status: "OPEN",
      },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json(currentSession);
  } catch (error: any) {
    console.error("[CASH-GET] Erreur:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération de la caisse" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      console.error("[CASH-POST] Pas d'utilisateur authentifié");
      return NextResponse.json({ error: "Non authentifié. Veuillez vous reconnecter." }, { status: 401 });
    }

    const userId = (user as any).ownerId || user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error("[CASH-POST] Erreur parse body:", e);
      return NextResponse.json({ error: "Format de données invalide" }, { status: 400 });
    }

    const openingAmount = body.openingAmount;
    const note = body.note;

    const amount = parseFloat(openingAmount);

    if (isNaN(amount) || amount < 0) {
      return NextResponse.json({ error: "Montant d'ouverture invalide (doit être un nombre positif)" }, { status: 400 });
    }

    // Close any previous open session (safety)
    try {
      await prisma.cashSession.updateMany({
        where: {
          userId: userId,
          status: "OPEN",
        },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    } catch (e) {
      console.warn("[CASH-POST] Erreur fermeture sessions précédentes (non bloquant)", e);
    }

    const cashSession = await prisma.cashSession.create({
      data: {
        userId: userId,
        openingAmount: amount,
        note: note || null,
        status: "OPEN",
      },
    });

    console.log("[CASH-POST] Caisse ouverte avec succès pour user:", userId);
    return NextResponse.json(cashSession, { status: 201 });

  } catch (error: any) {
    console.error("=== ERREUR API /api/cash-sessions POST ===");
    console.error("Full error:", error);

    // Toujours renvoyer du JSON clair
    return NextResponse.json(
      { 
        error: "Erreur serveur lors de l'ouverture de la caisse",
        details: error.message || String(error),
        code: error.code || null
      },
      { status: 500 }
    );
  }
}
