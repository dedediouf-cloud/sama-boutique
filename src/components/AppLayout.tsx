"use client";

import { Sidebar } from "./Sidebar";
import { Trans } from "./Trans";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FFFBF5]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto relative">
        {/* Subtle warm radial glow */}
        <div className="fixed top-20 right-20 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-20 left-80 w-64 h-64 bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <Trans>{children}</Trans>
        </div>
      </main>
    </div>
  );
}
