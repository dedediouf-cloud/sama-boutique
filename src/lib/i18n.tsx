"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";

export type Lang = "fr" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    // ⚠️ localStorage peut LEVER UNE EXCEPTION sur mobile (Chrome en navigation
    // privée, stockage saturé, contexte Android restreint). Sans try/catch, cela
    // faisait planter TOUTE la page (« This page couldn't load »).
    let saved: string | null = null;
    try {
      saved = typeof window !== "undefined" ? window.localStorage.getItem("lang") : null;
    } catch {
      saved = null; // on reste en français par défaut
    }
    if (saved === "fr" || saved === "en") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lang", l);
        document.documentElement.lang = l;
      }
    } catch {
      // stockage indisponible : le changement de langue reste actif pour la
      // session en cours, simplement il ne sera pas mémorisé.
    }
  };

  const t = (key: string) => {
    // double sécurité : si une langue ou une clé venait à manquer,
    // on affiche la clé au lieu de faire planter la page
    const dictionnaire = translations[lang] || translations.fr;
    return dictionnaire?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
