import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * ============================================================================
 *  ÉTAT D'ACCÈS D'UNE BOUTIQUE (essai gratuit / abonnement / blocage)
 * ============================================================================
 *  Règles :
 *   - BLOCKED        : bloquée par le super admin            -> pas d'accès du tout
 *   - ACTIVE         : abonnement payé et échéance à venir   -> accès complet
 *   - OVERDUE        : abonnement payé mais échéance dépassée-> accès prévenu (bannière)
 *   - TRIAL          : essai gratuit en cours                -> accès complet
 *   - TRIAL_EXPIRED  : essai terminé, pas d'abonnement       -> LECTURE SEULE
 *   - PENDING        : ancienne boutique sans essai ni date  -> accès prévenu
 *
 *  IMPORTANT : seules les boutiques ayant un `trialEndsAt` peuvent passer en
 *  lecture seule. Les boutiques créées avant cette fonctionnalité (champ vide)
 *  ne sont JAMAIS bloquées automatiquement : leur comportement reste identique.
 * ============================================================================
 */

export type AccessState =
  | "TRIAL"
  | "TRIAL_EXPIRED"
  | "ACTIVE"
  | "OVERDUE"
  | "PENDING"
  | "BLOCKED";

export interface AccessInfo {
  state: AccessState;
  /** true = la boutique peut consulter ses données mais plus rien modifier */
  readOnly: boolean;
  /** Jours restants d'essai (arrondi au jour supérieur), null si pas d'essai */
  daysLeft: number | null;
  /** Jours de retard depuis l'échéance d'abonnement, null si pas concerné */
  daysOverdue: number | null;
  trialEndsAt: string | null;
  subscriptionDueDate: string | null;
  subscriptionStatus: string;
  title: string;
  message: string;
  /** Contact affiché sur les bannières (variables d'environnement, sinon null) */
  supportWhatsapp: string | null;
  supportEmail: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Nombre de jours calendaires entre deux instants (et non en heures).
 * Ex. : inscription aujourd'hui à 17h pour un essai de 15 jours finissant à
 * 23h59 dans 15 jours -> 15 jours restants (et non 16).
 */
function calendarDaysUntil(target: number, now: number) {
  const a = new Date(now);
  const b = new Date(target);
  const dayA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const dayB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((dayB - dayA) / DAY_MS);
}

export const DEFAULT_TRIAL_DAYS = 15;

function supportContacts() {
  const whatsapp =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    process.env.SUPPORT_WHATSAPP ||
    null;
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    null;
  return { whatsapp: whatsapp || null, email: email || null };
}

function build(
  state: AccessState,
  data: Partial<AccessInfo> & { title: string; message: string }
): AccessInfo {
  const contacts = supportContacts();
  return {
    state,
    readOnly: false,
    daysLeft: null,
    daysOverdue: null,
    trialEndsAt: null,
    subscriptionDueDate: null,
    subscriptionStatus: "pending",
    supportWhatsapp: contacts.whatsapp,
    supportEmail: contacts.email,
    ...data,
  };
}

export function computeAccess(user: {
  isBlocked?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionDueDate?: Date | string | null;
  trialEndsAt?: Date | string | null;
}): AccessInfo {
  const now = Date.now();
  const status = user.subscriptionStatus || "pending";
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt).getTime() : null;
  const due = user.subscriptionDueDate
    ? new Date(user.subscriptionDueDate).getTime()
    : null;

  const base = {
    trialEndsAt: user.trialEndsAt
      ? new Date(user.trialEndsAt).toISOString()
      : null,
    subscriptionDueDate: user.subscriptionDueDate
      ? new Date(user.subscriptionDueDate).toISOString()
      : null,
    subscriptionStatus: status,
  };

  // 1. Blocage manuel par le super admin
  if (user.isBlocked) {
    return build("BLOCKED", {
      ...base,
      readOnly: true,
      title: "Compte bloqué",
      message:
        "Votre compte est bloqué. Contactez l'administrateur pour régulariser votre abonnement.",
    });
  }

  // 2. Abonné (payé)
  if (status === "paid") {
    if (due && due <= now) {
      const daysOverdue = Math.max(1, Math.ceil((now - due) / DAY_MS));
      return build("OVERDUE", {
        ...base,
        daysOverdue,
        title: "Abonnement à régulariser",
        message: `Votre abonnement a expiré depuis ${daysOverdue} jour${
          daysOverdue > 1 ? "s" : ""
        }. Vos données sont conservées.`,
      });
    }
    return build("ACTIVE", {
      ...base,
      title: "Abonnement actif",
      message: "Votre abonnement est à jour.",
    });
  }

  // 3. Essai en cours
  if (trialEnd !== null) {
    if (now < trialEnd) {
      const daysLeft = Math.max(1, calendarDaysUntil(trialEnd, now));
      return build("TRIAL", {
        ...base,
        daysLeft,
        title: "Essai gratuit",
        message: `Il vous reste ${daysLeft} jour${
          daysLeft > 1 ? "s" : ""
        } d'essai gratuit. Activez votre abonnement pour ne rien perdre.`,
      });
    }

    // 4. Essai terminé sans abonnement -> LECTURE SEULE
    return build("TRIAL_EXPIRED", {
      ...base,
      daysLeft: 0,
      readOnly: true,
      title: "Essai terminé",
      message:
        "Votre essai gratuit est terminé. Vous conservez l'accès à toutes vos données, mais les modifications sont désactivées jusqu'à l'activation de votre abonnement.",
    });
  }

  // 5. Ancienne boutique sans essai : jamais bloquée, simple information
  if (due && due <= now) {
    const daysOverdue = Math.max(1, Math.ceil((now - due) / DAY_MS));
    return build("OVERDUE", {
      ...base,
      daysOverdue,
      title: "Abonnement à régulariser",
      message: `Votre abonnement a expiré depuis ${daysOverdue} jour${
        daysOverdue > 1 ? "s" : ""
      }. Vos données sont conservées.`,
    });
  }

  return build("PENDING", {
    ...base,
    title: "Abonnement en attente",
    message: "Votre abonnement est en attente d'activation.",
  });
}

/* -------------------------------------------------------------------------- */
/*  Cache court (60 s) : évite une requête base à chaque appel d'API          */
/* -------------------------------------------------------------------------- */

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; info: AccessInfo }>();

export function invalidateAccess(userId: string) {
  cache.delete(userId);
}

export async function getAccessForUser(userId: string): Promise<AccessInfo> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.info;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isBlocked: true,
      subscriptionStatus: true,
      subscriptionDueDate: true,
      trialEndsAt: true,
    },
  });

  const info = user
    ? computeAccess(user)
    : build("BLOCKED", {
        title: "Boutique introuvable",
        message: "Cette boutique n'existe plus.",
        readOnly: true,
      });

  cache.set(userId, { at: Date.now(), info });
  return info;
}

/**
 * Verrou d'écriture à appeler en tête de chaque route API qui modifie des
 * données. Renvoie une réponse 403 si la boutique est en lecture seule,
 * sinon `null` (la route continue normalement).
 *
 *   const locked = await assertWritable();
 *   if (locked) return locked;
 */
export async function assertWritable(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) return null; // pas connecté : la route gère son propre 401
  if (user.role === "superadmin") return null; // le super admin n'est jamais bridé

  const ownerId = (user.ownerId as string) || user.id;
  const access = await getAccessForUser(ownerId);
  if (!access.readOnly) return null;

  return NextResponse.json(
    {
      error: access.message,
      code: access.state,
      readOnly: true,
      title: access.title,
      action: "activez votre abonnement pour continuer",
    },
    { status: 403 }
  );
}
