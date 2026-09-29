/**
 * ============================================================================
 *  LIMITEUR DE DÉBIT (protection contre la force brute et le spam)
 * ============================================================================
 *  Pourquoi ? Sans limite, un attaquant peut tester des milliers de mots de
 *  passe en quelques minutes. C'est la façon la plus courante de casser un
 *  compte commerçant.
 *
 *  Comment ça marche : on compte les tentatives par clé (email, IP) dans une
 *  fenêtre de temps. Au-delà de la limite, on refuse pendant un moment.
 *
 *  ⚠️  Stockage en mémoire : chaque instance de serveur a son propre compteur.
 *      C'est suffisant pour arrêter un attaquant qui martèle UN compte
 *      (il tombe forcément sur la même instance). Pour une protection
 *      parfaite à grande échelle, il faudrait un stockage partagé (Redis).
 * ============================================================================
 */

interface Compteur {
  tentatives: number;
  premierEssai: number;
  bloqueJusqua: number | null;
}

const compteurs = new Map<string, Compteur>();

/** Nettoyage périodique pour éviter que la mémoire ne grossisse sans fin */
function nettoyer() {
  const maintenant = Date.now();
  for (const [cle, c] of compteurs) {
    const expire = c.bloqueJusqua ? c.bloqueJusqua : c.premierEssai + 60 * 60 * 1000;
    if (maintenant > expire) compteurs.delete(cle);
  }
}
setInterval(nettoyer, 10 * 60 * 1000).unref?.();

export interface ResultatLimite {
  autorise: boolean;
  restant: number;
  retryAfterSecondes?: number;
}

/**
 * Enregistre une tentative et dit si elle est autorisée.
 *
 * @param cle        identifiant (ex. « login:email@exemple.com »)
 * @param max        nombre de tentatives autorisées dans la fenêtre
 * @param fenetreMs  durée de la fenêtre (ex. 15 minutes)
 * @param blocageMs  durée du blocage une fois la limite atteinte
 */
export function verifierLimite(
  cle: string,
  max = 5,
  fenetreMs = 15 * 60 * 1000,
  blocageMs = 15 * 60 * 1000
): ResultatLimite {
  const maintenant = Date.now();
  const c = compteurs.get(cle);

  /* Déjà bloqué ? */
  if (c?.bloqueJusqua && maintenant < c.bloqueJusqua) {
    return {
      autorise: false,
      restant: 0,
      retryAfterSecondes: Math.ceil((c.bloqueJusqua - maintenant) / 1000),
    };
  }

  /* Fenêtre expirée → on repart de zéro */
  if (!c || maintenant - c.premierEssai > fenetreMs) {
    compteurs.set(cle, { tentatives: 1, premierEssai: maintenant, bloqueJusqua: null });
    return { autorise: true, restant: max - 1 };
  }

  /* Dans la fenêtre */
  c.tentatives += 1;

  if (c.tentatives > max) {
    c.bloqueJusqua = maintenant + blocageMs;
    return { autorise: false, restant: 0, retryAfterSecondes: Math.ceil(blocageMs / 1000) };
  }

  return { autorise: true, restant: max - c.tentatives };
}

/** Réinitialise le compteur (à appeler après une connexion réussie) */
export function reinitialiserLimite(cle: string) {
  compteurs.delete(cle);
}

/** Combien de tentatives restent avant blocage ? (pour informer l'utilisateur) */
export function tentativesRestantes(cle: string, max = 5): number {
  const c = compteurs.get(cle);
  if (!c) return max;
  if (c.bloqueJusqua && Date.now() < c.bloqueJusqua) return 0;
  return Math.max(0, max - c.tentatives);
}
