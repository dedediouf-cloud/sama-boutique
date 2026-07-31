"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  History,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
} from "lucide-react";

interface CashSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  status: string;
  note: string | null;
  salesCount: number;
  totalSales: number;
  cashSales: number;
}

export default function CashHistoryPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "OPEN" | "CLOSED">("all");
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cash-sessions/history?status=${filter === "all" ? "" : filter}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Impossible de charger l'historique des caisses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDifferenceColor = (diff: number | null) => {
    if (diff === null) return "text-[#5C4033]";
    if (diff === 0) return "text-green-600";
    return diff > 0 ? "text-green-600" : "text-red-600";
  };

  const exportCSV = () => {
    if (sessions.length === 0) return;

    const headers = [
      "Date ouverture", "Date fermeture", "Statut",
      "Ouverture (FCFA)", "Clôture (FCFA)", "Attendu (FCFA)", "Écart (FCFA)",
      "Nb ventes", "Total ventes (FCFA)", "Note"
    ];

    const rows = sessions.map((s) => [
      formatDateTime(s.openedAt),
      s.closedAt ? formatDateTime(s.closedAt) : "-",
      s.status,
      s.openingAmount,
      s.closingAmount ?? "-",
      s.expectedAmount ?? "-",
      s.difference ?? "-",
      s.salesCount,
      s.totalSales,
      s.note || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historique-caisses-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const shopLogo = (session?.user as any)?.logoUrl || null;
  const shopName = session?.user?.shopName || "Ma Boutique";

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header with logo support */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {shopLogo && (
              <img 
                src={shopLogo} 
                alt="Logo" 
                className="w-12 h-12 object-contain rounded-xl border border-[#D4AF37]/20 bg-white p-1" 
              />
            )}
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
                Historique des Caisses
              </h1>
              <p className="text-[#5C4033] mt-1 flex items-center gap-2">
                <History size={16} className="text-[#B87333]" />
                Suivi des ouvertures, clôtures et écarts — {shopName}
              </p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={exportCSV}
              disabled={sessions.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#B87333]/30 text-[#B87333] hover:bg-[#B87333]/5 text-sm font-medium disabled:opacity-50"
            >
              <Download size={16} /> Exporter CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Toutes les sessions" },
            { value: "OPEN", label: "Ouvertes" },
            { value: "CLOSED", label: "Clôturées" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                filter === f.value
                  ? "bg-[#B87333] text-white border-[#B87333]"
                  : "bg-white border-[#D4AF37]/20 text-[#5C4033] hover:bg-[#FDF6E3]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl">
            {error}
          </div>
        )}

        {/* Stats summary */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-[#5C4033]/70">Sessions totales</div>
              <div className="text-2xl font-semibold text-[#3D2B1F]">{sessions.length}</div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-[#5C4033]/70">Sessions clôturées</div>
              <div className="text-2xl font-semibold text-[#3D2B1F]">
                {sessions.filter(s => s.status === "CLOSED").length}
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-[#5C4033]/70">Total espèces encaissées</div>
              <div className="text-2xl font-semibold text-[#B87333]">
                {formatPrice(sessions.reduce((sum, s) => sum + s.cashSales, 0))} FCFA
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-[#5C4033]/70">Écarts cumulés</div>
              <div className="text-2xl font-semibold text-[#3D2B1F]">
                {formatPrice(sessions.reduce((sum, s) => sum + (s.difference || 0), 0))} FCFA
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#D4AF37]/20 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F]">
              Liste des sessions de caisse
            </h2>
            <span className="text-sm text-[#5C4033]/70">{sessions.length} session(s)</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
              <p className="text-[#5C4033]">Chargement de l'historique...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-[#5C4033]/60">
              <History size={48} className="mx-auto mb-4 text-[#D4AF37]/40" />
              <p>Aucune session de caisse trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FDF6E3]/50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-[#5C4033]">Ouverture</th>
                    <th className="px-6 py-4 text-left font-semibold text-[#5C4033]">Clôture</th>
                    <th className="px-6 py-4 text-right font-semibold text-[#5C4033]">Ouverture</th>
                    <th className="px-6 py-4 text-right font-semibold text-[#5C4033]">Clôture</th>
                    <th className="px-6 py-4 text-right font-semibold text-[#5C4033]">Attendu</th>
                    <th className="px-6 py-4 text-right font-semibold text-[#5C4033]">Écart</th>
                    <th className="px-6 py-4 text-center font-semibold text-[#5C4033]">Ventes</th>
                    <th className="px-6 py-4 text-center font-semibold text-[#5C4033]">Statut</th>
                    <th className="px-6 py-4 text-left font-semibold text-[#5C4033]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-[#FDF6E3]/30">
                      <td className="px-6 py-4 text-[#3D2B1F]">
                        {formatDateTime(session.openedAt)}
                      </td>
                      <td className="px-6 py-4 text-[#5C4033]">
                        {session.closedAt ? formatDateTime(session.closedAt) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-[#3D2B1F]">
                        {formatPrice(session.openingAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-[#3D2B1F]">
                        {session.closingAmount !== null ? formatPrice(session.closingAmount) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-[#5C4033]">
                        {session.expectedAmount !== null ? formatPrice(session.expectedAmount) : "—"}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${getDifferenceColor(session.difference)}`}>
                        {session.difference !== null 
                          ? (session.difference > 0 ? "+" : "") + formatPrice(session.difference) 
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          <span className="font-medium">{session.salesCount}</span>
                          <div className="text-[10px] text-[#5C4033]/60">
                            {formatPrice(session.totalSales)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {session.status === "OPEN" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            <Clock size={12} /> OUVERTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[#B87333]/10 text-[#B87333]">
                            <CheckCircle size={12} /> CLÔTURÉE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#5C4033]/80 max-w-[180px] truncate">
                        {session.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs text-[#5C4033]/60 px-1">
          Les écarts positifs signifient un surplus. Les écarts négatifs indiquent un manque.
          Toutes les ventes sont liées à leur session de caisse au moment de la validation.
        </div>
      </div>
    </ProtectedRoute>
  );
}
