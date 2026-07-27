"use client";

import { Sidebar } from "./Sidebar";
import { Trans } from "./Trans";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FFFBF5]">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60" 
            onClick={() => setSidebarOpen(false)} 
          />
          
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-72 bg-[#4A3F3A] shadow-2xl">
            <div className="flex justify-end p-4">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-[#F7E7CE] p-2"
              >
                <X size={24} />
              </button>
            </div>
            <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-2.5 sm:p-3 md:p-5 lg:p-8 overflow-auto relative overscroll-contain pb-20 lg:pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Mobile Header with Hamburger - optimized for phones */}
        <div className="lg:hidden mb-2 flex items-center justify-between sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-md py-2 -mx-2 px-3 border-b border-[#D4AF37]/10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-3 rounded-xl bg-white/90 border border-[#D4AF37]/30 text-[#3D2B1F] active:scale-[0.96] transition-transform touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
          <div className="text-sm font-semibold text-[#5C4033] truncate px-2">SamaBoutique</div>
          <div className="w-10" /> {/* balance */}
        </div>

        {/* Subtle warm radial glow */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none hidden lg:block" />
        <div className="fixed bottom-20 left-80 w-64 h-64 bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none hidden lg:block" />

        <div className="relative z-10">
          <Trans>{children}</Trans>
        </div>
      </main>
    </div>
  );
}
