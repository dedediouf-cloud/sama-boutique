"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Bell,
  Sparkles,
  Calendar,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return null;
          }
          const text = await res.text();
          throw new Error(text || "Erreur lors du chargement du tableau de bord");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
            <p className="text-[#5C4033] font-medium">Chargement de votre tableau de bord...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Tableau de bord
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Calendar size={16} className="text-[#B87333]" />
              Aujourd&apos;hui, le {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="glass rounded-2xl px-5 py-2.5 flex items-center gap-2 text-sm text-[#5C4033]">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <span>Bienvenue dans votre espace SamaBoutique</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 px-5 py-4 rounded-2xl">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 perspective-1000">
          <StatCard
            title="Ventes du jour"
            value={data?.countToday || 0}
            subtitle={`${formatPrice(data?.totalToday || 0)} FCFA`}
            icon={ShoppingCart}
            gradient="from-[#D4AF37]/20 to-[#C5A028]/10"
            iconColor="text-[#D4AF37]"
          />
          <StatCard
            title="Stock faible"
            value={data?.lowStock?.length || 0}
            subtitle="produits à réapprovisionner"
            icon={AlertTriangle}
            gradient="from-[#B87333]/20 to-[#C9895B]/10"
            iconColor="text-[#B87333]"
          />
          <StatCard
            title="Réservations"
            value={data?.reservationsCount || 0}
            subtitle="en attente de confirmation"
            icon={Bell}
            gradient="from-[#8B7355]/20 to-[#A0826D]/10"
            iconColor="text-[#8B7355]"
          />
          <StatCard
            title="Top produits"
            value={data?.topProducts?.length || 0}
            subtitle="meilleures ventes"
            icon={TrendingUp}
            gradient="from-[#C5A028]/20 to-[#D4AF37]/10"
            iconColor="text-[#C5A028]"
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard title="Produits les plus vendus">
            {data?.topProducts?.length > 0 ? (
              <ul className="space-y-3">
                {data.topProducts.map((p: any, index: number) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#FDF6E3]/50 hover:bg-[#F5E6C8]/50 transition-colors duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center text-sm font-semibold text-[#B87333]">
                        {index + 1}
                      </span>
                      <span className="text-[#3D2B1F] font-medium">{p.name}</span>
                    </div>
                    <span className="font-semibold text-[#B87333]">{p.quantity} vendus</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 text-[#5C4033]/60">
                <ShoppingCart size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
                <p>Aucune vente enregistrée</p>
              </div>
            )}
          </GlassCard>

          <GlassCard title="Alertes stock faible">
            {data?.lowStock?.length > 0 ? (
              <ul className="space-y-3">
                {data.lowStock.map((p: any) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[#B87333]/10 hover:bg-[#B87333]/15 transition-colors duration-300 border border-[#B87333]/20"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-[#B87333]" />
                      <span className="text-[#3D2B1F] font-medium">{p.name}</span>
                    </div>
                    <span className="font-semibold text-[#B87333]">{p.quantity} restant(s)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 text-[#5C4033]/60">
                <Sparkles size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
                <p>Tous les stocks sont au beau fixe</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconColor,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  gradient: string;
  iconColor: string;
}) {
  return (
    <div className={`glass rounded-2xl p-6 tilt-card cursor-default bg-gradient-to-br ${gradient}`}>
      <div className="flex items-start justify-between">
        <div className="preserve-3d">
          <p className="text-sm font-medium text-[#5C4033]/80 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#3D2B1F] font-[family-name:var(--font-playfair)]">{value}</p>
          <p className="text-sm text-[#B87333] mt-1 font-medium">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-[#FFFBF5]/80 flex items-center justify-center shadow-sm ${iconColor}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 tilt-card">
      <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
        {title}
      </h2>
      {children}
    </div>
  );
}
