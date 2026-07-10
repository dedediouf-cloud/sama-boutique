"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  return (
    <div className={`flex items-center gap-1 rounded-xl border border-[#C9A9A6]/30 p-1 ${className}`}>
      <button
        onClick={() => setLang("fr")}
        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          lang === "fr" ? "bg-[#C9A9A6]/20 text-[#F7E7CE]" : "text-[#F7E7CE]/60 hover:text-[#F7E7CE]"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          lang === "en" ? "bg-[#C9A9A6]/20 text-[#F7E7CE]" : "text-[#F7E7CE]/60 hover:text-[#F7E7CE]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
