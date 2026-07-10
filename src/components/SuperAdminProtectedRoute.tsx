"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isSuperAdmin } from "@/lib/roles";
import { Trans } from "@/components/Trans";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/superadmin/login");
    }
    if (status === "authenticated" && !isSuperAdmin(session?.user?.role)) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <p className="text-[#B87333] font-medium">Chargement...</p>
      </div>
    );
  }

  if (!session || !isSuperAdmin(session?.user?.role)) return null;

  return (
    <Trans>
    <div className="min-h-screen bg-[#FFFBF5] relative overflow-hidden">
      {/* Warm background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="relative z-10 bg-gradient-to-r from-[#3D2B1F] via-[#4A3328] to-[#5C4033] text-white px-8 py-5 flex justify-between items-center border-b border-[#D4AF37]/20">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#FDF6E3]">
            SamaBoutique - Super Admin
          </h1>
          <p className="text-sm text-[#D4AF37]/80 mt-0.5">{session.user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/superadmin/login");
          }}
          className="px-5 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#FDF6E3] hover:bg-[#D4AF37]/10 transition-all duration-300 text-sm font-medium"
        >
          Déconnexion
        </button>
        </div>
      </header>
      <main className="relative z-10 p-8">{children}</main>
    </div>
    </Trans>
  );
}
