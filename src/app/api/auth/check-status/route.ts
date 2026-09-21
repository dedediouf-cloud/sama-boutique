import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAccess } from "@/lib/access";

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
      const access = computeAccess(user);

      // IMPORTANT : l'essai terminé n'empêche PAS la connexion (mode lecture
      // seule). Seul un blocage manuel du super admin empêche l'accès.
      if (access.state === "BLOCKED") {
        return NextResponse.json({
          blocked: true,
          message: access.message,
          access,
        });
      }

      return NextResponse.json({
        blocked: false,
        message: access.readOnly ? access.message : null,
        access,
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: { user: true },
    });

    if (employee) {
      const access = computeAccess(employee.user);
      if (access.state === "BLOCKED") {
        return NextResponse.json({
          blocked: true,
          message: "Cette boutique est bloquée. Veuillez contacter l'administrateur.",
          access,
        });
      }
      return NextResponse.json({ blocked: false, message: null, access });
    }

    return NextResponse.json({ blocked: false, message: null, access: null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
