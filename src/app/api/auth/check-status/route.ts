import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAccessForUser } from "@/lib/access";

/**
 * GET /api/user/access
 * Renvoie l'état d'accès de la boutique connectée (essai, abonnement, lecture
 * seule). Utilisé par la bannière affichée en haut de l'application.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (user.role === "superadmin") {
    return NextResponse.json({
      state: "SUPERADMIN",
      readOnly: false,
      daysLeft: null,
      title: "Super Admin",
      message: "",
    });
  }

  const ownerId = (user.ownerId as string) || user.id;
  const access = await getAccessForUser(ownerId);

  // Le vendeur (employé) ne voit pas les informations d'abonnement du patron
  if (user.role !== "admin") {
    return NextResponse.json({
      ...access,
      state: access.state,
      readOnly: access.readOnly,
      daysLeft: null,
      title: access.readOnly ? "Boutique en lecture seule" : "",
      message: access.readOnly ? access.message : "",
    });
  }

  return NextResponse.json(access);
}
