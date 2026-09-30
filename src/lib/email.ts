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

/* ══════════════════════════════════════════════════════════════════════════ */
/*  EMAIL DE BIENVENUE  (envoyé à la création du compte)                     */
/* ══════════════════════════════════════════════════════════════════════════ */

export interface BienvenueEmailData {
  shopName: string;
  to: string;
  trialDays: number;
  appUrl: string;
  supportWhatsapp?: string | null;
  supportEmail?: string | null;
}

export function bienvenueEmail(data: BienvenueEmailData) {
  const { shopName, trialDays, appUrl, supportWhatsapp, supportEmail } = data;
  const contact = [
    supportWhatsapp ? `WhatsApp : ${supportWhatsapp}` : null,
    supportEmail ? `Email : ${supportEmail}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    subject: `Bienvenue sur SamaBoutique — votre boutique « ${shopName} » est prête`,
    html: layout(`
      <p>Bonjour,</p>

      <p>Votre boutique <strong>${shopName}</strong> est créée. Bienvenue ! 🎉</p>

      <p>Vous disposez de <strong>${trialDays} jours d'essai gratuit</strong>, sans carte
      bancaire et sans engagement. Profitez-en pour tout essayer.</p>

      <p style="margin:26px 0 10px;">${button(`${appUrl}/login`, "Ouvrir ma boutique")}</p>
      <p style="margin:0 0 22px;font-size:13px;color:#8A7A6D;">
        Connectez-vous avec l'email et le mot de passe que vous venez de choisir.
      </p>

      <div style="background:#FDF6E3;border-radius:12px;padding:16px 18px;margin:22px 0;">
        <p style="margin:0 0 10px;font-weight:600;color:#3D2B1F;">Par où commencer ?</p>
        <ol style="margin:0;padding-left:20px;color:#5C4033;">
          <li style="margin-bottom:6px;">Ajoutez vos premiers produits (menu <strong>Stock</strong>)</li>
          <li style="margin-bottom:6px;">Enregistrez une vente pour voir comment ça marche (menu <strong>Ventes</strong>)</li>
          <li style="margin-bottom:6px;">Partagez le lien de votre catalogue à vos clients (menu <strong>Mon catalogue</strong>)</li>
        </ol>
      </div>

      <p style="margin:22px 0 10px;">📘 <strong>Le guide complet est en ligne</strong>, consultable depuis votre téléphone :</p>
      <p style="margin:0 0 22px;">${button(`${appUrl}/guide`, "Lire le guide utilisateur")}</p>

      <p style="font-size:14px;color:#5C4033;">
        Il couvre tout : le stock, la caisse, les clients et la fidélité, les réservations,
        les livraisons, les promotions, les fournisseurs, les employés, les statistiques,
        le catalogue WhatsApp et les abonnements.
      </p>

      <div style="background:#FFF6E5;border-radius:12px;padding:14px 16px;margin:22px 0;font-size:14px;">
        <strong>Votre essai se termine le ${new Date(
          Date.now() + trialDays * 24 * 60 * 60 * 1000
        ).toLocaleDateString("fr-FR")}.</strong><br />
        Vos données restent conservées après cette date : rien n'est supprimé.
        Nous vous préviendrons quelques jours avant.
      </div>

      ${contact ? `<p style="color:#8A7A6D;font-size:13px;">Une question ? ${contact}</p>` : ""}
    `),
    text:
      `Bienvenue sur SamaBoutique ! Votre boutique « ${shopName} » est créée. ` +
      `Vous avez ${trialDays} jours d'essai gratuit. ` +
      `Connectez-vous : ${appUrl}/login — Guide complet : ${appUrl}/guide`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  EMAIL DE CONFIRMATION D'ABONNEMENT                                        */
/* ══════════════════════════════════════════════════════════════════════════ */

export interface AbonnementEmailData {
  shopName: string;
  to: string;
  montant: number;
  intervalle: "monthly" | "annual";
  periodeFin: Date;
  appUrl: string;
  supportWhatsapp?: string | null;
  supportEmail?: string | null;
}

export function abonnementEmail(data: AbonnementEmailData) {
  const { shopName, montant, intervalle, periodeFin, appUrl, supportWhatsapp, supportEmail } = data;
  const contact = [
    supportWhatsapp ? `WhatsApp : ${supportWhatsapp}` : null,
    supportEmail ? `Email : ${supportEmail}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const libelle = intervalle === "annual" ? "annuel" : "mensuel";
  const montantTexte = Math.round(montant).toLocaleString("fr-FR");
  const finTexte = periodeFin.toLocaleDateString("fr-FR");

  return {
    subject: `Abonnement ${libelle} activé — ${shopName}`,
    html: layout(`
      <p>Bonjour,</p>

      <p>Votre abonnement <strong>${libelle}</strong> est activé. Merci de votre confiance ! ✅</p>

      <div style="background:#FDF6E3;border-radius:12px;padding:18px;margin:22px 0;">
        <table style="width:100%;font-size:15px;color:#5C4033;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;">Boutique</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#3D2B1F;">${shopName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">Formule</td>
            <td style="padding:6px 0;text-align:right;">Abonnement ${libelle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">Montant</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#3D2B1F;">${montantTexte} FCFA</td>
          </tr>
          <tr>
            <td style="padding:6px 0;border-top:1px solid #EAD9BF;">Valable jusqu'au</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#3D2B1F;border-top:1px solid #EAD9BF;">${finTexte}</td>
          </tr>
        </table>
      </div>

      <p style="margin:26px 0;">${button(`${appUrl}/dashboard`, "Retourner dans ma boutique")}</p>

      <p style="font-size:14px;color:#5C4033;">
        Vous recevrez un rappel quelques jours avant l'échéance, pour éviter toute
        interruption. Vos données sont sauvegardées automatiquement chaque nuit.
      </p>

      ${contact ? `<p style="color:#8A7A6D;font-size:13px;">Une question ? ${contact}</p>` : ""}
    `),
    text:
      `Votre abonnement ${libelle} est activé. Montant : ${montantTexte} FCFA, ` +
      `valable jusqu'au ${finTexte}. ${appUrl}/dashboard`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  EMAIL DE RAPPEL D'ÉCHÉANCE                                                */
/* ══════════════════════════════════════════════════════════════════════════ */

export interface RappelEcheanceEmailData {
  shopName: string;
  to: string;
  joursRestants: number;
  montant: number;
  echeance: Date;
  appUrl: string;
  supportWhatsapp?: string | null;
  supportEmail?: string | null;
}

export function rappelEcheanceEmail(data: RappelEcheanceEmailData) {
  const { shopName, joursRestants, montant, echeance, appUrl, supportWhatsapp, supportEmail } = data;
  const contact = [
    supportWhatsapp ? `WhatsApp : ${supportWhatsapp}` : null,
    supportEmail ? `Email : ${supportEmail}` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const montantTexte = Math.round(montant).toLocaleString("fr-FR");
  const urgence =
    joursRestants <= 1
      ? "Votre abonnement arrive à échéance <strong>demain</strong>."
      : `Votre abonnement arrive à échéance dans <strong>${joursRestants} jours</strong>.`;

  return {
    subject:
      joursRestants <= 1
        ? `Dernier rappel — abonnement de ${shopName} demain`
        : `Abonnement de ${shopName} : échéance dans ${joursRestants} jours`,
    html: layout(`
      <p>Bonjour,</p>

      <p>${urgence}</p>

      <div style="background:#FDF6E3;border-radius:12px;padding:18px;margin:22px 0;">
        <table style="width:100%;font-size:15px;color:#5C4033;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;">Boutique</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#3D2B1F;">${shopName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">Échéance</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#3D2B1F;">${echeance.toLocaleDateString("fr-FR")}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;">Montant à régler</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#B87333;">${montantTexte} FCFA</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;color:#5C4033;">
        <strong>Vos données sont conservées</strong> : vos produits, vos clients et votre
        historique de ventes ne seront jamais supprimés, même si vous décidez d'arrêter.
      </p>

      <p style="margin:26px 0;">${button(`${appUrl}/dashboard`, "Ouvrir ma boutique")}</p>

      ${contact ? `<p style="color:#8A7A6D;font-size:13px;">Pour régler, contactez-nous : ${contact}</p>` : ""}
    `),
    text:
      `Votre abonnement arrive à échéance le ${echeance.toLocaleDateString("fr-FR")}. ` +
      `Montant : ${montantTexte} FCFA. Vos données sont conservées. ${appUrl}/dashboard`,
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
