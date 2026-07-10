import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ownerId = user.ownerId || user.id;
  const { id } = await params;

  try {
    const body = await request.json();

    const customer = await prisma.customer.updateMany({
      where: { id, userId: ownerId },
      data: body,
    });

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
