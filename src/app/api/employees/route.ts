import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const employees = await prisma.employee.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe obligatoires" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé par un commerçant" }, { status: 400 });
    }

    const existingEmployee = await prisma.employee.findFirst({ where: { email } });
    if (existingEmployee) {
      return NextResponse.json({ error: "Cet email est déjà utilisé par un employé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "seller",
        userId: user.id,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
