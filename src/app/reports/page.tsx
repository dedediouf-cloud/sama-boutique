"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Package,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const WARM_COLORS = ["#D4AF37", "#B87333", "#C9895B", "#8B7355", "#C5A028"];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Erreur lors du chargement des statistiques");
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [period]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  };

  if (status === "loading" || !session) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
            <p className="text-[#5C4033]">Chargement...</p>
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
              Statistiques avancées
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#B87333]" />
              Analysez vos performances commerciales
            </p>
          </div>
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            {[
              { value: "7d", label: "7 jours" },
              { value: "30d", label: "30 jours" },
              { value: "12m", label: "12 mois" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  period === p.value
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#B87333] text-white shadow-md"
                    : "text-[#5C4033] hover:bg-[#D4AF37]/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 px-5 py-4 rounded-2xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
              <p className="text-[#5C4033]">Chargement des statistiques...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 perspective-1000">
              <StatCard
                title="Chiffre d'affaires"
                value={`${formatPrice(data?.totalRevenue || 0)} FCFA`}
                icon={CreditCard}
                gradient="from-[#D4AF37]/20 to-[#C5A028]/10"
              />
              <StatCard
                title="Nombre de ventes"
                value={data?.totalSales || 0}
                icon={ShoppingBag}
                gradient="from-[#B87333]/20 to-[#C9895B]/10"
              />
              <StatCard
                title="Panier moyen"
                value={`${data?.totalSales > 0 ? formatPrice(Math.round(data.totalRevenue / data.totalSales)) : 0} FCFA`}
                icon={TrendingUp}
                gradient="from-[#C5A028]/20 to-[#D4AF37]/10"
              />
            </div>

            {/* Sales chart */}
            <div className="glass rounded-2xl p-6 tilt-card">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
                Évolution des ventes
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {period === "12m" ? (
                    <BarChart data={data?.monthlyData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.2)" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} stroke="#5C4033" fontSize={12} />
                      <YAxis tickFormatter={(value) => formatPrice(value)} stroke="#5C4033" fontSize={12} />
                      <Tooltip
                        formatter={(value: any) => `${formatPrice(Number(value))} FCFA`}
                        contentStyle={{ backgroundColor: "rgba(255, 252, 248, 0.95)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px" }}
                      />
                      <Bar dataKey="amount" fill="#D4AF37" name="Chiffre d'affaires" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={data?.dailyData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.2)" />
                      <XAxis dataKey="date" tickFormatter={formatDate} stroke="#5C4033" fontSize={12} />
                      <YAxis tickFormatter={(value) => formatPrice(value)} stroke="#5C4033" fontSize={12} />
                      <Tooltip
                        formatter={(value: any) => `${formatPrice(Number(value))} FCFA`}
                        contentStyle={{ backgroundColor: "rgba(255, 252, 248, 0.95)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#D4AF37"
                        strokeWidth={3}
                        dot={{ fill: "#B87333", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#D4AF37" }}
                        name="Chiffre d'affaires"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top products */}
              <div className="glass rounded-2xl p-6 tilt-card">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
                  Top produits
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.topProducts || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.2)" />
                      <XAxis type="number" tickFormatter={(value) => formatPrice(value)} stroke="#5C4033" fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} stroke="#5C4033" fontSize={12} />
                      <Tooltip
                        formatter={(value: any, name: any) =>
                          name === "revenue" || name === "CA" ? `${formatPrice(Number(value))} FCFA` : value
                        }
                        contentStyle={{ backgroundColor: "rgba(255, 252, 248, 0.95)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px" }}
                      />
                      <Bar dataKey="revenue" fill="#B87333" name="CA" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment status pie */}
              <div className="glass rounded-2xl p-6 tilt-card">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
                  Statuts de paiement
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Payé", value: data?.paymentStatus?.paid || 0 },
                          { name: "En attente", value: data?.paymentStatus?.pending || 0 },
                          { name: "Échoué", value: data?.paymentStatus?.failed || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          data?.paymentStatus?.paid || 0,
                          data?.paymentStatus?.pending || 0,
                          data?.paymentStatus?.failed || 0,
                        ].map((_, index) => (
                          <Cell key={`cell-${index}`} fill={WARM_COLORS[index % WARM_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip contentStyle={{ backgroundColor: "rgba(255, 252, 248, 0.95)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top products table */}
            <div className="glass rounded-2xl overflow-hidden tilt-card">
              <div className="p-6 border-b border-[#D4AF37]/20">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <Package size={20} className="text-[#B87333]" />
                  Détail des produits les plus vendus
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FDF6E3]/50 text-left">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Produit</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Quantité vendue</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Chiffre d'affaires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10">
                    {data?.topProducts?.map((p: any) => (
                      <tr key={p.name} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                        <td className="px-6 py-4 font-medium text-[#3D2B1F]">{p.name}</td>
                        <td className="px-6 py-4 text-[#5C4033]">{p.quantity}</td>
                        <td className="px-6 py-4 text-[#B87333] font-semibold">{formatPrice(p.revenue)} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!data?.topProducts || data.topProducts.length === 0) && (
                <div className="p-12 text-center text-[#5C4033]/60">
                  <Package size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
                  <p>Aucune vente sur cette période</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ title, value, icon: Icon, gradient }: { title: string; value: string | number; icon: any; gradient: string }) {
  return (
    <div className={`glass rounded-2xl p-6 tilt-card bg-gradient-to-br ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#5C4033]/80 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-[#3D2B1F] font-[family-name:var(--font-playfair)]">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#FFFBF5]/80 flex items-center justify-center shadow-sm text-[#B87333]">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
