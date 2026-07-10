import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      return NextResponse.json({
        blocked: user.isBlocked,
        message: user.isBlocked
          ? "Votre compte est bloqué. Veuillez contacter l'administrateur pour régulariser votre abonnement."
          : null,
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });

    if (employee) {
      const blocked = employee.user.isBlocked;
      return NextResponse.json({
        blocked,
        message: blocked
          ? "Cette boutique est bloquée. Veuillez contacter l'administrateur."
          : null,
      });
    }

    return NextResponse.json({ blocked: false, message: null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
