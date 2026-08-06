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
  Eye,
  X,
} from "lucide-react";

export default function ReservationsPage() {
  const { data: session } = useSession();
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // === NEW: Detail modal for reservation products ===
  const [detailModal, setDetailModal] = useState<any>(null);

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

  // === Parse reservation to extract product details (supports single + bulk cart) ===
  const parseReservationItems = (reservation: any) => {
    // Bulk reservation from catalog cart
    if (reservation.productName?.startsWith("Panier") && reservation.message) {
      const parts = reservation.message.split(" • ").map((part: string) => {
        const match = part.match(/^(.*) × (\d+)$/);
        if (match) {
          return { name: match[1].trim(), quantity: parseInt(match[2]) };
        }
        return { name: part.trim(), quantity: 1 };
      });
      return parts;
    }

    // Single product reservation
    return [{
      name: reservation.productName,
      quantity: reservation.quantity || 1
    }];
  };

  const openDetail = (reservation: any) => {
    const items = parseReservationItems(reservation);
    setDetailModal({
      ...reservation,
      parsedItems: items,
      totalQty: items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
    });
  };

  const closeDetail = () => setDetailModal(null);

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
                    <h3 className="font-semibold text-[#3D2B1F] flex items-center gap-2">
                      {r.productName}
                      {r.productName?.startsWith("Panier") && (
                        <span className="text-[10px] px-1.5 py-px bg-[#D4AF37]/15 text-[#B87333] rounded font-medium">PANIER</span>
                      )}
                    </h3>
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

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {/* NEW: Détail button for product list */}
                <button
                  onClick={() => openDetail(r)}
                  className="flex-1 py-2 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/10 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye size={15} /> Détail
                </button>

                {r.status === "pending" && isAdmin(session?.user?.role) && (
                  <>
                    <button
                      onClick={() => updateStatus(r.id, "confirmed")}
                      className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      <CheckCircle size={14} /> Confirmer
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "cancelled")}
                      className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                      <XCircle size={14} /> Annuler
                    </button>
                  </>
                )}
              </div>
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

      {/* === NEW: MODAL DÉTAIL PRODUITS RÉSERVÉS === */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={closeDetail}>
          <div 
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b flex items-center justify-between bg-[#FFFBF5]">
              <div>
                <h3 className="font-semibold text-xl text-[#3D2B1F]">Détails de la réservation</h3>
                <p className="text-xs text-[#5C4033]/70 mt-0.5">#{detailModal.id.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={closeDetail} className="text-[#5C4033] hover:text-red-500 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Client info */}
              <div>
                <div className="text-xs font-medium text-[#B87333] uppercase tracking-wider mb-1">Client</div>
                <div className="font-medium text-[#3D2B1F]">{detailModal.customerName}</div>
                {detailModal.customerPhone && (
                  <div className="text-sm text-[#5C4033] mt-0.5 flex items-center gap-1.5">
                    <MessageSquare size={14} /> {detailModal.customerPhone}
                  </div>
                )}
              </div>

              {/* Products list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-[#B87333] uppercase tracking-wider">Produits réservés</div>
                  <div className="text-xs px-2.5 py-0.5 bg-[#D4AF37]/10 text-[#B87333] rounded-full font-medium">
                    {detailModal.totalQty} article{detailModal.totalQty > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-2 max-h-[210px] overflow-auto pr-1">
                  {detailModal.parsedItems?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-[#FDF6E3]/60 border border-[#D4AF37]/20 rounded-2xl px-4 py-3">
                      <div className="font-medium text-[#3D2B1F] flex-1 pr-3 truncate">
                        {item.name}
                      </div>
                      <div className="text-sm font-semibold text-[#B87333] flex items-center gap-1 flex-shrink-0">
                        × {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              {detailModal.message && (
                <div>
                  <div className="text-xs font-medium text-[#B87333] uppercase tracking-wider mb-1">Message du client</div>
                  <div className="text-sm text-[#5C4033] bg-white border border-[#D4AF37]/20 rounded-xl p-3 italic">
                    “{detailModal.message}”
                  </div>
                </div>
              )}

              {/* Status + date */}
              <div className="pt-1 flex justify-between items-center text-sm">
                <div>
                  {statusBadge(detailModal.status)}
                </div>
                <div className="text-[#5C4033]/70 text-xs text-right">
                  {new Date(detailModal.createdAt).toLocaleDateString("fr-FR", { 
                    day: "numeric", month: "short", year: "numeric" 
                  })} 
                  <br />
                  <span className="text-[10px]">{new Date(detailModal.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t bg-white flex gap-3">
              {detailModal.status === "pending" && isAdmin(session?.user?.role) && (
                <>
                  <button
                    onClick={() => {
                      updateStatus(detailModal.id, "confirmed");
                      closeDetail();
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-green-600 text-white font-medium flex items-center justify-center gap-2 text-sm hover:bg-green-700"
                  >
                    <CheckCircle size={16} /> Confirmer
                  </button>
                  <button
                    onClick={() => {
                      updateStatus(detailModal.id, "cancelled");
                      closeDetail();
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-red-50 text-red-600 font-medium flex items-center justify-center gap-2 text-sm hover:bg-red-100"
                  >
                    <XCircle size={16} /> Annuler
                  </button>
                </>
              )}
              <button
                onClick={closeDetail}
                className="flex-1 py-2.5 rounded-2xl border border-[#D4AF37]/30 text-[#5C4033] font-medium text-sm hover:bg-[#F8F1E3]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
