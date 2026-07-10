"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import {
  Users,
  Plus,
  X,
  Search,
  Gift,
  ShoppingBag,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Bookmark,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", dateOfBirth: "", notes: "" });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [editForm, setEditForm] = useState({ fidelityPoints: "", notes: "", dateOfBirth: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCustomers = () => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => setCustomers(data));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
      }),
    });
    setForm({ name: "", phone: "", email: "", address: "", dateOfBirth: "", notes: "" });
    setShowForm(false);
    fetchCustomers();
  };

  const openCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setEditForm({
      fidelityPoints: customer.fidelityPoints.toString(),
      notes: customer.notes || "",
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split("T")[0] : "",
    });
    fetch(`/api/customers/${customer.id}/activity`)
      .then((res) => res.json())
      .then((data) => setActivity(data));
  };

  const updateCustomer = async () => {
    await fetch(`/api/customers/${selectedCustomer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fidelityPoints: parseInt(editForm.fidelityPoints),
        notes: editForm.notes,
        dateOfBirth: editForm.dateOfBirth ? new Date(editForm.dateOfBirth).toISOString() : null,
      }),
    });
    fetchCustomers();
    if (selectedCustomer) {
      openCustomerDetails({ ...selectedCustomer, fidelityPoints: parseInt(editForm.fidelityPoints), notes: editForm.notes });
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Clients (CRM 360°)
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Users size={16} className="text-[#B87333]" />
              {customers.length} client{sPlural(customers.length)} enregistré{sPlural(customers.length)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Annuler" : "Ajouter un client"}
          </button>
        </div>

        {/* Add customer form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Users size={18} className="text-[#B87333]" />
              </span>
              Nouveau client
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom du client</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Téléphone</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Adresse</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Date de naissance</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                    <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" rows={3} />
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Enregistrer le client
              </button>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher un client par nom, téléphone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Customers table */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FDF6E3]/50 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Nom</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Téléphone</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Email</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Points fidélité</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Ventes</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300 cursor-pointer" onClick={() => openCustomerDetails(c)}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#3D2B1F]">{c.name}</div>
                    </td>
                    <td className="px-6 py-4 text-[#5C4033]">{c.phone || "-"}</td>
                    <td className="px-6 py-4 text-[#5C4033]">{c.email || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#B87333] text-sm font-medium">
                        <Gift size={14} /> {c.fidelityPoints} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5C4033]">{c._count.sales}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openCustomerDetails(c)} className="text-[#B87333] hover:text-[#5C4033] text-sm font-medium transition-colors flex items-center gap-1">
                        <Edit3 size={14} /> Voir détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length === 0 && (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Users size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
              <p className="text-lg">Aucun client trouvé</p>
            </div>
          )}
        </div>

        {/* Customer details modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-[#3D2B1F]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-strong rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FDF6E3]/50 hover:bg-[#D4AF37]/20 flex items-center justify-center text-[#5C4033] transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#3D2B1F]">{selectedCustomer.name}</h2>
                <p className="text-[#5C4033] mt-1 flex items-center gap-2">
                  {selectedCustomer.phone && <><Phone size={14} /> {selectedCustomer.phone}</>}
                  {selectedCustomer.email && <><Mail size={14} /> {selectedCustomer.email}</>}
                </p>
              </div>

              {activity && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass rounded-2xl p-4 text-center">
                      <p className="text-sm text-[#5C4033]/70 mb-1">Total dépensé</p>
                      <p className="text-2xl font-bold text-[#B87333] font-[family-name:var(--font-playfair)]">{formatPrice(activity.totalSpent)} FCFA</p>
                    </div>
                    <div className="glass rounded-2xl p-4 text-center">
                      <p className="text-sm text-[#5C4033]/70 mb-1">Achats</p>
                      <p className="text-2xl font-bold text-[#D4AF37] font-[family-name:var(--font-playfair)]">{activity.totalSales}</p>
                    </div>
                    <div className="glass rounded-2xl p-4 text-center">
                      <p className="text-sm text-[#5C4033]/70 mb-1">Points fidélité</p>
                      <p className="text-2xl font-bold text-[#C5A028] font-[family-name:var(--font-playfair)]">{activity.customer.fidelityPoints}</p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-4 flex items-center gap-2">
                      <Edit3 size={18} className="text-[#B87333]" />
                      Modifier les informations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-[#5C4033] mb-1.5">Points fidélité</label>
                        <input type="number" value={editForm.fidelityPoints} onChange={(e) => setEditForm({ ...editForm, fidelityPoints: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#5C4033] mb-1.5">Date de naissance</label>
                        <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                      </div>
                    </div>
                    <textarea placeholder="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] mb-4" rows={3} />
                    <button onClick={updateCustomer} className="px-6 py-2.5 rounded-xl btn-luxe text-sm font-medium">
                      Mettre à jour
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass rounded-2xl p-5">
                      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-4 flex items-center gap-2">
                        <ShoppingBag size={18} className="text-[#B87333]" />
                        Historique des achats
                      </h3>
                      {activity.sales.length > 0 ? (
                        <ul className="space-y-2">
                          {activity.sales.map((sale: any) => (
                            <li key={sale.id} className="p-3 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10">
                              <div className="flex justify-between">
                                <span className="font-medium text-[#3D2B1F]">{new Date(sale.createdAt).toLocaleDateString("fr-FR")}</span>
                                <span className="font-semibold text-[#B87333]">{formatPrice(sale.finalTotal || sale.total)} FCFA</span>
                              </div>
                              <p className="text-sm text-[#5C4033]/60">{sale.items.length} article(s)</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#5C4033]/60">Aucun achat</p>
                      )}
                    </div>

                    <div className="glass rounded-2xl p-5">
                      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-4 flex items-center gap-2">
                        <Bookmark size={18} className="text-[#B87333]" />
                        Réservations
                      </h3>
                      {activity.reservations.length > 0 ? (
                        <ul className="space-y-2">
                          {activity.reservations.map((res: any) => (
                            <li key={res.id} className="p-3 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10">
                              <div className="flex justify-between">
                                <span className="font-medium text-[#3D2B1F]">{res.productName}</span>
                                <span className={`text-sm ${res.status === "confirmed" ? "text-green-600" : res.status === "pending" ? "text-[#B87333]" : "text-red-600"}`}>
                                  {res.status === "confirmed" ? <CheckCircle size={14} className="inline mr-1" /> : <Clock size={14} className="inline mr-1" />}
                                  {res.status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#5C4033]/60">Aucune réservation</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
