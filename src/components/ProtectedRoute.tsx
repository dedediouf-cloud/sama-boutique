"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppLayout } from "./AppLayout";
import { isSuperAdmin } from "@/lib/roles";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated" && isSuperAdmin(session?.user?.role)) {
      router.push("/superadmin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!session || isSuperAdmin(session?.user?.role)) return null;

  return <AppLayout>{children}</AppLayout>;
}
