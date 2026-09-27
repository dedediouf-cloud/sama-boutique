"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * ============================================================================
 *  CHAMP MOT DE PASSE AVEC BOUTON « AFFICHER / MASQUER »
 * ============================================================================
 *  Pourquoi ? Sur un clavier de téléphone, les fautes de frappe sont
 *  fréquentes et les « •••••• » ne montrent pas où est l'erreur : on ne
 *  découvre le problème qu'après l'échec de la connexion.
 *
 *  Le mot de passe reste masqué par défaut — c'est l'utilisateur qui choisit
 *  de l'afficher.
 *
 *  Détails techniques importants :
 *   - le bouton est en type="button" : il ne déclenche JAMAIS l'envoi du
 *     formulaire (bug classique sur mobile)
 *   - après le basculement, on redonne le focus au champ et on replace le
 *     curseur à la fin : sur Android, changer le type fait perdre le focus
 *     et ferme le clavier, ce qui rend la saisie pénible
 *   - la zone tactile fait au moins 44 px (recommandation Apple/Google)
 * ============================================================================
 */

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** classes du champ (identiques à ce qui est utilisé sur la page) */
  className?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  name?: string;
  id?: string;
  autoFocus?: boolean;
  /** désactive le bouton (pendant l'envoi du formulaire) */
  disabled?: boolean;
  /** couleur de l'icône, si le fond n'est pas clair */
  iconeClassName?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PasswordInput({
  value,
  onChange,
  className = "",
  placeholder = "••••••••",
  required,
  autoComplete = "current-password",
  name,
  id,
  autoFocus,
  disabled,
  iconeClassName = "text-[#B87333]/70 hover:text-[#B87333]",
  onKeyDown,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const basculer = () => {
    const champ = ref.current;
    const position = champ?.selectionStart ?? null;

    setVisible((v) => !v);

    // On redonne le focus juste après le rendu (Android perd le focus
    // lorsqu'on change le type d'un champ).
    if (champ) {
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        if (position !== null) {
          try {
            el.setSelectionRange(position, position);
          } catch {
            /* certains navigateurs refusent sur type=password : sans gravité */
          }
        }
      });
    }
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        name={name}
        // pr-12 : laisse la place à l'icône pour que le texte ne passe pas dessous
        className={`${className} pr-12`}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        // empêche le correcteur orthographique de s'activer sur le mot de passe
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />

      <button
        type="button"
        onClick={basculer}
        disabled={disabled}
        // zone tactile suffisante sur mobile
        className={`password-toggle absolute right-1 top-1/2 -translate-y-1/2 rounded-lg transition-colors hover:bg-black/5 active:scale-95 disabled:opacity-40 flex items-center justify-center min-w-[44px] min-h-[44px] ${iconeClassName}`}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
