"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import { formatPrice } from "@/lib/utils";
import {
  Factory,
  Plus,
  X,
  Truck,
  Phone,
  Mail,
  MapPin,
  Package,
  Trash2,
  CheckCircle,
  Search,
  ClipboardList,
  Building2,
} from "lucide-react";

const orderStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "En attente", color: "text-[#B87333]", bg: "bg-[#B87333]/10", border: "border-[#B87333]/20" },
  received: { label: "Reçue", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  cancelled: { label: "Annulée", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

export default function SuppliersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [orderForm, setOrderForm] = useState<{
    supplierId: string;
    notes: string;
    items: { productId: string; productName: string; quantity: string; unitPrice: string }[];
  }>({ supplierId: "", notes: "", items: [] });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (session?.user?.role && !isAdmin(session.user.role)) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const fetchSuppliers = () => {
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data));
  };

  const fetchOrders = () => {
    fetch("/api/supplier-orders")
      .then((res) => res.json())
      .then((data) => setOrders(data));
  };

  const fetchProducts = () => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  };

  useEffect(() => {
    if (isAdmin(session?.user?.role)) {
      fetchSuppliers();
      fetchOrders();
      fetchProducts();
    }
  }, [session]);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierForm),
    });
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setShowSupplierForm(false);
    fetchSuppliers();
  };

  const addOrderItem = () => {
    setOrderForm({ ...orderForm, items: [...orderForm.items, { productId: "", productName: "", quantity: "", unitPrice: "" }] });
  };

  const updateOrderItem = (index: number, field: string, value: string) => {
    const items = [...orderForm.items];
    items[index] = { ...items[index], [field]: value };
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        items[index].productName = product.name;
        items[index].unitPrice = product.price.toString();
      }
    }
    setOrderForm({ ...orderForm, items });
  };

  const removeOrderItem = (index: number) => {
    const items = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items });
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // === INSTANT FEEDBACK ===
    setCreatingOrder(true);

    if (!orderForm.supplierId) {
      alert("Veuillez choisir un fournisseur.");
      setCreatingOrder(false);
      return;
    }

    const validItems = orderForm.items.filter(
      (item) =>
        item.productName.trim() &&
        parseInt(item.quantity) > 0 &&
        parseFloat(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      alert("Veuillez ajouter au moins un article avec une quantité et un prix valides.");
      setCreatingOrder(false);
      return;
    }

    const res = await fetch("/api/supplier-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: orderForm.supplierId,
        notes: orderForm.notes,
        items: validItems.map((item) => ({
          productId: item.productId || null,
          productName: item.productName,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      }),
    });

    setCreatingOrder(false);

    if (res.ok) {
      setOrderForm({ supplierId: "", notes: "", items: [] });
      setShowOrderForm(false);
      fetchOrders();
    } else {
      const error = await res.json().catch(() => ({}));
      alert(error.error || "Erreur lors de la création");
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await fetch(`/api/supplier-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  if (!isAdmin(session?.user?.role)) return null;

  const filteredOrders = orders.filter((o) =>
    o.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Gestion des fournisseurs
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Factory size={16} className="text-[#B87333]" />
              {suppliers.length} fournisseur{sPlural(suppliers.length)} • {orders.length} commande{sPlural(orders.length)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSupplierForm(!showSupplierForm)}
              className="px-5 py-3 rounded-xl border border-[#D4AF37]/40 text-[#B87333] font-medium hover:bg-[#D4AF37]/10 transition-all duration-300 flex items-center gap-2"
            >
              {showSupplierForm ? <X size={18} /> : <Building2 size={18} />}
              {showSupplierForm ? "Annuler" : "Fournisseur"}
            </button>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={creatingOrder}
              className="px-5 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium active:scale-[0.985] transition-all disabled:opacity-70"
            >
              {showOrderForm ? <X size={18} /> : <Plus size={18} />}
              {showOrderForm ? "Annuler" : "Créer une commande"}
            </button>
          </div>
        </div>

        {/* Supplier form */}
        {showSupplierForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <Building2 size={20} className="text-[#B87333]" />
              Nouveau fournisseur
            </h2>
            <form onSubmit={handleSupplierSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom du fournisseur</label>
                  <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5"><Phone size={14} /> Téléphone</label>
                  <input type="tel" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5"><Mail size={14} /> Email</label>
                  <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5"><MapPin size={14} /> Adresse</label>
                  <input type="text" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" />
                </div>
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">Enregistrer le fournisseur</button>
            </form>
          </div>
        )}

        {/* Order form */}
        {showOrderForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <Truck size={20} className="text-[#B87333]" />
              Nouvelle commande fournisseur
            </h2>
            <form onSubmit={handleOrderSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Fournisseur</label>
                <select value={orderForm.supplierId} onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" required>
                  <option value="">Choisir un fournisseur</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5"><ClipboardList size={14} /> Notes</label>
                <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]" rows={2} />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#5C4033]">Articles</label>
                {orderForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-4 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10">
                    <div className="md:col-span-2">
                      <select value={item.productId} onChange={(e) => updateOrderItem(index, "productId", e.target.value)} className="w-full px-3 py-2 rounded-xl input-warm text-[#3D2B1F] text-sm">
                        <option value="">Produit</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="text" placeholder="Nom article" value={item.productName} onChange={(e) => updateOrderItem(index, "productName", e.target.value)} className="w-full px-3 py-2 rounded-xl input-warm text-[#3D2B1F] text-sm" required />
                    </div>
                    <div>
                      <input type="number" min="1" placeholder="Qté" value={item.quantity} onChange={(e) => updateOrderItem(index, "quantity", e.target.value)} className="w-full px-3 py-2 rounded-xl input-warm text-[#3D2B1F] text-sm" required />
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min="0" placeholder="Prix unitaire" value={item.unitPrice} onChange={(e) => updateOrderItem(index, "unitPrice", e.target.value)} className="w-full px-3 py-2 rounded-xl input-warm text-[#3D2B1F] text-sm" required />
                    </div>
                    <button type="button" onClick={() => removeOrderItem(index)} className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                      <Trash2 size={14} /> Retirer
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={addOrderItem} className="px-5 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/10 transition-all duration-300 flex items-center gap-2">
                  <Plus size={16} /> Ajouter un article
                </button>
                <button 
                  type="submit" 
                  disabled={creatingOrder} 
                  className="px-8 py-2.5 rounded-xl btn-luxe font-medium disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.985] transition-all flex items-center justify-center gap-2"
                >
                  {creatingOrder ? "Création en cours..." : "Créer la commande"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Orders */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="p-6 border-b border-[#D4AF37]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
              <Truck size={20} className="text-[#B87333]" />
              Commandes fournisseurs
            </h2>
            <div className="glass rounded-xl p-2 flex items-center gap-2">
              <Search size={16} className="text-[#B87333]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-[#3D2B1F] placeholder-[#B87333]/50"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FDF6E3]/50 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Date</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Fournisseur</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Articles</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Total</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Statut</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {filteredOrders.map((o) => {
                  const status = orderStatusConfig[o.status] || orderStatusConfig.pending;
                  return (
                    <tr key={o.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                      <td className="px-6 py-4 text-[#5C4033]">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-6 py-4 font-medium text-[#3D2B1F]">{o.supplier.name}</td>
                      <td className="px-6 py-4 text-[#5C4033]">{o.items.length} article(s)</td>
                      <td className="px-6 py-4 font-semibold text-[#B87333]">{formatPrice(o.total)} FCFA</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {o.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateOrderStatus(o.id, "received")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors">
                              <CheckCircle size={12} /> Reçue
                            </button>
                            <button onClick={() => updateOrderStatus(o.id, "cancelled")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
                              <X size={12} /> Annuler
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Truck size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
              <p>Aucune commande fournisseur</p>
            </div>
          )}
        </div>

        {/* Suppliers list */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="p-6 border-b border-[#D4AF37]/20">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
              <Building2 size={20} className="text-[#B87333]" />
              Fournisseurs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FDF6E3]/50 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Nom</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Téléphone</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Email</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Adresse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                          <Building2 size={18} className="text-[#B87333]" />
                        </div>
                        <span className="font-semibold text-[#3D2B1F]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#5C4033]">{s.phone || "-"}</td>
                    <td className="px-6 py-4 text-[#5C4033]">{s.email || "-"}</td>
                    <td className="px-6 py-4 text-[#5C4033]">{s.address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {suppliers.length === 0 && (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Building2 size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
              <p>Aucun fournisseur enregistré</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
