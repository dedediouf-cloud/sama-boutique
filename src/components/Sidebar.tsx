"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  ShoppingCart,
  Globe,
  Bell,
  LogOut,
  UserCog,
  BarChart3,
  TruckIcon,
  Tag,
  Factory,
} from "lucide-react";
import { isAdmin } from "@/lib/roles";
import { Trans } from "@/components/Trans";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const menuItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/products", label: "Stock", icon: Package },
  { href: "/inventory", label: "Inventaire", icon: ClipboardList },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/sales", label: "Ventes", icon: ShoppingCart },
  { href: "/reservations", label: "Réservations", icon: Bell },
  { href: "/deliveries", label: "Livraisons", icon: TruckIcon },
  { href: "/reports", label: "Statistiques", icon: BarChart3 },
  { href: "/promotions", label: "Promotions", icon: Tag },
  { href: "/suppliers", label: "Fournisseurs", icon: Factory },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [catalogUrl, setCatalogUrl] = useState("");

  useEffect(() => {
    if (session?.user?.shopSlug) {
      setCatalogUrl(`${window.location.origin}/catalog/${session.user.shopSlug}`);
    }
  }, [session]);

  return (
    <Trans>
    <aside className="w-64 min-h-screen flex flex-col relative overflow-hidden">
      {/* Champagne gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4A3F3A] via-[#5A4A42] to-[#6B5B55]" />

      {/* Texture overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(247, 231, 206, 0.03) 50px, rgba(247, 231, 206, 0.03) 52px),
            repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(247, 231, 206, 0.02) 80px, rgba(247, 231, 206, 0.02) 82px)
          `,
        }}
      />

      {/* Soft champagne glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#C9A9A6] opacity-20 blur-[80px] rounded-full" />

      <div className="relative z-10 p-6 border-b border-[#C9A9A6]/20">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#F7E7CE] tracking-tight">
            SamaBoutique
          </h1>
          <LanguageSwitcher />
        </div>
        <p className="text-sm text-[#C9A9A6]/80 mt-1 font-medium">
          {session?.user?.shopName || "Bienvenue"}
        </p>
      </div>

      <nav className="relative z-10 flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? "bg-gradient-to-r from-[#C9A9A6]/20 to-[#C9A9A6]/5 text-[#F7E7CE] border border-[#C9A9A6]/30 shadow-lg shadow-[#C9A9A6]/10"
                  : "text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#C9A9A6]/10 hover:border hover:border-[#C9A9A6]/20"
              }`}
            >
              <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-[#C9A9A6]" : ""}`}>
                <Icon size={18} />
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {isAdmin(session?.user?.role) && (
          <Link
            href="/employees"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              pathname === "/employees"
                ? "bg-gradient-to-r from-[#C9A9A6]/20 to-[#C9A9A6]/5 text-[#F7E7CE] border border-[#C9A9A6]/30 shadow-lg shadow-[#C9A9A6]/10"
                : "text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#C9A9A6]/10 hover:border hover:border-[#C9A9A6]/20"
            }`}
          >
            <span className={`transition-transform duration-300 group-hover:scale-110 ${pathname === "/employees" ? "text-[#C9A9A6]" : ""}`}>
              <UserCog size={18} />
            </span>
            <span className="font-medium">Employés</span>
          </Link>
        )}

        {catalogUrl && (
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#C9A9A6]/10 transition-all duration-300 group"
          >
            <span className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Globe size={18} />
            </span>
            <span className="font-medium">Mon catalogue</span>
          </a>
        )}
      </nav>

      <div className="relative z-10 p-4 border-t border-[#C9A9A6]/20">
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/login");
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#C9A9A6]/10 transition-all duration-300 w-full group"
        >
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            <LogOut size={18} />
          </span>
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </aside>
    </Trans>
  );
}
