"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import {
  Bookmark,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  Package,
  Calendar,
  Search,
  Bell,
} from "lucide-react";

export default function ReservationsPage() {
  const { data: session } = useSession();
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReservations = () => {
    fetch("/api/reservations")
      .then((res) => res.json())
      .then((data) => setReservations(data));
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchReservations();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B87333]/10 text-[#B87333] text-sm font-medium border border-[#B87333]/20">
            <Clock size={14} /> En attente
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-sm font-medium border border-green-200">
            <CheckCircle size={14} /> Confirmée
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm font-medium border border-red-200">
            <XCircle size={14} /> Annulée
          </span>
        );
      default:
        return <span className="text-[#5C4033]">{status}</span>;
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesFilter = filter === "all" || r.status === filter;
    const matchesSearch =
      r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerPhone && r.customerPhone.includes(searchTerm));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = reservations.filter((r) => r.status === "pending").length;

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Réservations et commandes
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Bell size={16} className="text-[#B87333]" />
              {reservations.length} réservation{sPlural(reservations.length)} • {pendingCount} en attente
            </p>
          </div>
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            {["all", "pending", "confirmed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === f
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#B87333] text-white shadow-md"
                    : "text-[#5C4033] hover:bg-[#D4AF37]/10"
                }`}
              >
                {f === "all" ? "Toutes" : f === "pending" ? "En attente" : f === "confirmed" ? "Confirmées" : "Annulées"}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher par produit, client ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Reservations cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 perspective-1000">
          {filteredReservations.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-5 tilt-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                    <Bookmark size={20} className="text-[#B87333]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3D2B1F]">{r.productName}</h3>
                    <p className="text-xs text-[#5C4033]/60 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(r.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                {statusBadge(r.status)}
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-[#5C4033] flex items-center gap-2">
                  <User size={14} className="text-[#B87333]" />
                  {r.customerName}
                </p>
                {r.customerPhone && (
                  <p className="text-sm text-[#5C4033] flex items-center gap-2">
                    <MessageSquare size={14} className="text-[#B87333]" />
                    {r.customerPhone}
                  </p>
                )}
                <p className="text-sm text-[#5C4033] flex items-center gap-2">
                  <Package size={14} className="text-[#B87333]" />
                  Quantité : {r.quantity}
                </p>
                {r.message && (
                  <p className="text-sm text-[#5C4033]/70 bg-[#FDF6E3]/50 p-2 rounded-lg">
                    &ldquo;{r.message}&rdquo;
                  </p>
                )}
              </div>

              {r.status === "pending" && isAdmin(session?.user?.role) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(r.id, "confirmed")}
                    className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={14} /> Confirmer
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "cancelled")}
                    className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle size={14} /> Annuler
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredReservations.length === 0 && (
          <div className="text-center py-16 text-[#5C4033]/60">
            <Bookmark size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-lg">Aucune réservation trouvée</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
