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
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto relative overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/70 border border-[#D4AF37]/30 text-[#3D2B1F]"
          >
            <Menu size={22} />
          </button>
          <div className="text-sm font-medium text-[#5C4033]">SamaBoutique</div>
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
