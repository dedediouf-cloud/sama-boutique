"use client";

import { Sidebar } from "./Sidebar";
import { TrialBanner } from "./TrialBanner";
import { Trans } from "./Trans";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Est-on sur un écran large ? Sert à NE PAS monter la barre latérale de
  // bureau sur mobile (avant, elle était masquée en CSS mais restait montée :
  // double DOM, double abonnement à la session → travail inutile sur mobile).
  const [estBureau, setEstBureau] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const maj = () => setEstBureau(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  // Empêche la page derrière le menu de défiler quand le tiroir est ouvert
  // (sur mobile, le doigt faisait défiler l'arrière-plan au lieu du menu).
  useEffect(() => {
    if (!sidebarOpen || typeof document === "undefined") return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#FFFBF5]">
      {/* Barre latérale de bureau — montée uniquement sur écran large */}
      {estBureau && (
        <div className="hidden lg:block">
          <Sidebar />
        </div>
      )}

      {/* Mobile Sidebar (Drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60" 
            onClick={() => setSidebarOpen(false)} 
          />
          
          {/* Drawer — colonne flexible : l'en-tête et le pied restent fixes,
              seul le menu défile. C'est ce qui manquait : avant, le tiroir
              coupait le contenu et « Employés » → « Déconnexion » étaient
              inatteignables sur téléphone. */}
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-[#4A3F3A] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-end p-2 shrink-0">
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[#F7E7CE] p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-transform"
                aria-label="Fermer le menu"
              >
                <X size={24} />
              </button>
            </div>
            {/* flex-1 + min-h-0 : donne au menu la hauteur restante, et le
                laisse défiler à l'intérieur du tiroir */}
            <div className="flex-1 min-h-0">
              <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content
          ⚠️  NE JAMAIS remettre `overscroll-contain` (ni overscroll-behavior
          en style) sur cette balise <main>.

          Pourquoi ? Ce <main> a `overflow-auto` mais n'a RIEN à défiler :
          sa hauteur s'adapte exactement à son contenu (flex-1 + min-h-0).
          C'est donc la PAGE qui défile, pas lui.

          Avec `overscroll-contain`, Chrome envoie quand même le geste à ce
          <main> (parce qu'il a `overflow-auto`), constate qu'il ne peut pas
          défiler, puis BLOQUE le geste au lieu de le laisser remonter à la
          page : sur téléphone, l'écran devient impossible à faire défiler.

          Firefox, lui, ignore le réglage car le conteneur n'a rien à
          défiler — c'est pour ça que le bug ne se voyait que sur Chrome.

          Mesuré le 01/10/2026 : 0 px de défilement avec, 780 px sans. */}      <main className="flex-1 p-2.5 sm:p-3 md:p-5 lg:p-8 overflow-auto relative pb-20 lg:pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Mobile Header with Hamburger - optimized for phones */}
        <div className="lg:hidden mb-2 flex items-center justify-between sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-md py-2 -mx-2 px-3 border-b border-[#D4AF37]/10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-3 rounded-xl bg-white/90 border border-[#D4AF37]/30 text-[#3D2B1F] active:scale-[0.96] transition-transform touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#5C4033] truncate px-2">
            <img
              src="/logo-embleme-192.png"
              alt=""
              aria-hidden="true"
              className="w-6 h-6 shrink-0"
            />
            SamaBoutique
          </div>
          <div className="w-10" /> {/* balance */}
        </div>

        {/* Subtle warm radial glow */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none hidden lg:block" />
        <div className="fixed bottom-20 left-80 w-64 h-64 bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none hidden lg:block" />

        <div className="relative z-10">
          {/* État de l'essai gratuit / de l'abonnement */}
          <TrialBanner />
          <Trans>{children}</Trans>
        </div>
      </main>
    </div>
  );
}
