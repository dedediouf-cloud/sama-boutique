import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;

  const reservations = await prisma.reservation.findMany({
    where: { userId: ownerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reservations);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const body = await request.json();
    const ownerId = user.ownerId || user.id;
    const reservation = await prisma.reservation.create({
      data: {
        ...body,
        userId: ownerId,
      },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const { id, status } = await request.json();
    const ownerId = user.ownerId || user.id;
    const reservation = await prisma.reservation.updateMany({
      where: { id, userId: ownerId },
      data: { status },
    });
    return NextResponse.json(reservation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
