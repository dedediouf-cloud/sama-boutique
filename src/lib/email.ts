/**
 * Envoi d'emails — via l'API HTTP de Resend (aucune dépendance npm).
 *
 * Configuration (Vercel > Settings > Environment Variables) :
 *   RESEND_API_KEY = re_xxxxxxxx      -> sans cette clé, aucun email n'est envoyé
 *   EMAIL_FROM     = "SamaBoutique <contact@ton-domaine.com>"
 *                    (par défaut "SamaBoutique <onboarding@resend.dev>", qui ne
 *                     peut envoyer qu'à ta propre adresse : à remplacer en prod)
 *
 * Le code ne plante JAMAIS si la clé est absente : il trace un log et continue.
 */

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "SamaBoutique <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[EMAIL] ignoré (RESEND_API_KEY absente) -> ${to} : ${subject}`
    );
    return { ok: false, skipped: true, error: "RESEND_API_KEY absente" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[EMAIL] échec ${res.status} -> ${to} : ${body}`);
      return { ok: false, error: `${res.status} ${body}`.slice(0, 300) };
    }

    return { ok: true };
  } catch (error: any) {
    console.error("[EMAIL] erreur réseau :", error?.message || error);
    return { ok: false, error: error?.message || "erreur réseau" };
  }
}

/* -------------------------------------------------------------------------- */
/*  Gabarit HTML (sobre, aux couleurs de SamaBoutique)                        */
/* -------------------------------------------------------------------------- */

function layout(inner: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#FFFBF5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3D2B1F;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EAD9BF;">
    <div style="background:linear-gradient(135deg,#3D2B1F,#5C4033);padding:22px 26px;">
      <div style="color:#FDF6E3;font-size:19px;font-weight:600;">SamaBoutique</div>
      <div style="color:#D4AF37;font-size:12px;margin-top:3px;">Gestion de boutique</div>
    </div>
    <div style="padding:26px;font-size:15px;line-height:1.65;">
      ${inner}
    </div>
    <div style="padding:16px 26px;background:#FFFBF5;color:#8A7A6D;font-size:12px;border-top:1px solid #F0E4D2;">
      Vous recevez cet email car vous avez créé une boutique sur SamaBoutique.
    </div>
  </div>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B87333);color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${label}</a>`;

export interface TrialEmailData {
  shopName: string;
  to: string;
  daysLeft: number;
  kind: string;
  appUrl: string;
  supportWhatsapp?: string | null;
  supportEmail?: string | null;
}

export function trialEmail(data: TrialEmailData) {
  const { shopName, daysLeft, kind, appUrl, supportWhatsapp, supportEmail } = data;
  const contact = [
    supportWhatsapp ? `WhatsApp : ${supportWhatsapp}` : null,
    supportEmail ? `Email : ${supportEmail}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  if (kind === "J0") {
    return {
      subject: `Votre essai gratuit ${shopName} est terminé`,
      html: layout(`
        <p>Bonjour,</p>
        <p>L'essai gratuit de <strong>${shopName}</strong> est arrivé à son terme.</p>
        <p><strong>Vos données sont intactes et restent accessibles</strong> : produits, clients, ventes, historique de caisse. Seules les modifications sont temporairement désactivées (mode lecture seule).</p>
        <p>Activez votre abonnement pour retrouver l'usage complet, sans aucune perte.</p>
        <p style="margin:26px 0;">${button(appUrl, "Activer mon abonnement")}</p>
        ${contact ? `<p style="color:#8A7A6D;font-size:13px;">Une question ? ${contact}</p>` : ""}
      `),
      text: `L'essai gratuit de ${shopName} est terminé. Vos données sont conservées. Activez votre abonnement : ${appUrl}`,
    };
  }

  const urgence =
    daysLeft <= 1
      ? "C'est votre dernier jour d'essai gratuit."
      : `Il vous reste <strong>${daysLeft} jours</strong> d'essai gratuit.`;

  return {
    subject: `Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai — ${shopName}`,
    html: layout(`
      <p>Bonjour,</p>
      <p>${urgence}</p>
      <p>Votre boutique <strong>${shopName}</strong> fonctionne actuellement en essai gratuit. À la fin de l'essai, vos données restent enregistrées, mais les ventes et les modifications seront mises en pause jusqu'à l'activation de l'abonnement.</p>
      <p style="margin:26px 0;">${button(appUrl, "Voir mon compte")}</p>
      ${contact ? `<p style="color:#8A7A6D;font-size:13px;">Une question ? ${contact}</p>` : ""}
    `),
    text: `Il vous reste ${daysLeft} jours d'essai gratuit sur ${shopName}. ${appUrl}`,
  };
}

export function appBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
