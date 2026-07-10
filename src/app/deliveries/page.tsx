"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import {
  Truck,
  Plus,
  X,
  MapPin,
  Phone,
  Package,
  User,
  Calendar,
  Search,
  Clock,
  CheckCircle2,
  ChefHat,
  Send,
  Ban,
  ClipboardList,
} from "lucide-react";

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: "En attente", icon: Clock, color: "text-[#B87333]", bg: "bg-[#B87333]/10", border: "border-[#B87333]/20" },
  preparing: { label: "En préparation", icon: ChefHat, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/20" },
  shipped: { label: "Expédiée", icon: Send, color: "text-[#8B7355]", bg: "bg-[#8B7355]/10", border: "border-[#8B7355]/20" },
  delivered: { label: "Livrée", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  cancelled: { label: "Annulée", icon: Ban, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [salesWithoutDelivery, setSalesWithoutDelivery] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    saleId: "",
    address: "",
    phone: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeliveries = () => {
    fetch("/api/deliveries")
      .then((res) => res.json())
      .then((data) => setDeliveries(data));
  };

  const fetchSales = () => {
    fetch("/api/sales")
      .then((res) => res.json())
      .then((data) => {
        const withoutDelivery = data.filter((sale: any) => !sale.delivery && sale.customer);
        setSalesWithoutDelivery(withoutDelivery);
      });
  };

  useEffect(() => {
    fetchDeliveries();
    fetchSales();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm({ saleId: "", address: "", phone: "", notes: "" });
      setShowForm(false);
      fetchDeliveries();
      fetchSales();
    } else {
      const error = await res.json();
      alert(error.error || "Erreur lors de la création");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDeliveries();
  };

  const filteredDeliveries = deliveries.filter((d) =>
    d.sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.status.includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Livraisons
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Truck size={16} className="text-[#B87333]" />
              {deliveries.length} livraison{sPlural(deliveries.length)} enregistrée{sPlural(deliveries.length)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Annuler" : "Nouvelle livraison"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Truck size={18} className="text-[#B87333]" />
              </span>
              Planifier une livraison
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Vente à livrer</label>
                <select
                  value={form.saleId}
                  onChange={(e) => setForm({ ...form, saleId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  required
                >
                  <option value="">Choisir une vente</option>
                  {salesWithoutDelivery.map((sale) => (
                    <option key={sale.id} value={sale.id}>
                      {sale.customer?.name || "Client de passage"} - {formatPrice(sale.total)} FCFA -{" "}
                      {new Date(sale.createdAt).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} /> Adresse de livraison
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} /> Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                    <ClipboardList size={14} /> Notes
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ex: Livrer avant 18h"
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Créer la livraison
              </button>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher une livraison..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Deliveries cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 perspective-1000">
          {filteredDeliveries.map((d) => {
            const status = statusConfig[d.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={d.id} className="glass rounded-2xl p-5 tilt-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${status.bg} ${status.border} border flex items-center justify-center`}>
                      <Truck size={20} className={status.color} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#3D2B1F] flex items-center gap-2">
                        <User size={14} className="text-[#B87333]" />
                        {d.sale.customer?.name || "Client de passage"}
                      </h3>
                      <p className="text-xs text-[#5C4033]/60 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
                    <StatusIcon size={12} /> {status.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-[#5C4033] flex items-start gap-2">
                    <MapPin size={16} className="text-[#B87333] mt-0.5 shrink-0" />
                    <span>{d.address}</span>
                  </p>
                  {d.phone && (
                    <p className="text-sm text-[#5C4033] flex items-center gap-2">
                      <Phone size={14} className="text-[#B87333]" />
                      {d.phone}
                    </p>
                  )}
                  <p className="text-sm text-[#5C4033] flex items-center gap-2">
                    <Package size={14} className="text-[#B87333]" />
                    {d.sale.items.length} article(s) • {formatPrice(d.sale.finalTotal || d.sale.total)} FCFA
                  </p>
                  {d.notes && (
                    <p className="text-sm text-[#5C4033]/70 bg-[#FDF6E3]/50 p-2 rounded-lg">
                      {d.notes}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#5C4033]/70 mb-1.5">Mettre à jour le statut</label>
                  <select
                    value={d.status}
                    onChange={(e) => updateStatus(d.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl input-warm text-[#3D2B1F] text-sm"
                  >
                    <option value="pending">En attente</option>
                    <option value="preparing">En préparation</option>
                    <option value="shipped">Expédiée</option>
                    <option value="delivered">Livrée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDeliveries.length === 0 && (
          <div className="text-center py-16 text-[#5C4033]/60">
            <Truck size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-lg">Aucune livraison en cours</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
