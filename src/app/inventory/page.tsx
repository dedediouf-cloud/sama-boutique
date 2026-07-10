"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import {
  ClipboardList,
  Search,
  Package,
  Calculator,
  Archive,
  AlertTriangle,
  CheckCircle,
  History,
  TrendingUp,
  Filter,
  Save,
  X,
  Boxes,
} from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"count" | "history" | "valuation">("count");
  const [editingCounts, setEditingCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    try {
      const [productsRes, countsRes, valuationRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/counts"),
        fetch("/api/inventory/valuation"),
      ]);

      const productsData = await productsRes.json();
      const countsData = await countsRes.json();
      const valuationData = await valuationRes.json();

      if (productsRes.ok && Array.isArray(productsData)) setProducts(productsData);
      if (countsRes.ok && Array.isArray(countsData)) setCounts(countsData);
      if (valuationRes.ok && valuationData && !valuationData.error) setValuation(valuationData);
    } catch (err) {
      console.error("Erreur chargement inventaire:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category || "Sans catégorie"))).sort();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || (p.category || "Sans catégorie") === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCountChange = (productId: string, value: string) => {
    setEditingCounts({ ...editingCounts, [productId]: value });
  };

  const handleSaveCount = async (product: any) => {
    const value = editingCounts[product.id];
    if (value === undefined || value === "") return;

    const countedQty = parseInt(value);
    if (isNaN(countedQty) || countedQty < 0) {
      alert("La quantité doit être un nombre positif");
      return;
    }

    setSaving({ ...saving, [product.id]: true });

    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        countedQty,
        note: "Inventaire physique",
      }),
    });

    if (res.ok) {
      setMessage(`Stock de « ${product.name} » mis à jour : ${countedQty} unités`);
      const newEditing = { ...editingCounts };
      delete newEditing[product.id];
      setEditingCounts(newEditing);
      fetchData();
      setTimeout(() => setMessage(""), 3000);
    } else {
      const error = await res.json();
      alert(error.error || "Erreur lors de l'enregistrement");
    }

    setSaving({ ...saving, [product.id]: false });
  };

  const cancelEdit = (productId: string) => {
    const newEditing = { ...editingCounts };
    delete newEditing[productId];
    setEditingCounts(newEditing);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#C9A9A6]/30 border-t-[#C9A9A6] animate-spin" />
            <p className="text-[#6B5B55]">Chargement de l&apos;inventaire...</p>
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
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#4A3F3A]">
              Inventaire
            </h1>
            <p className="text-[#6B5B55] mt-1 flex items-center gap-2">
              <ClipboardList size={16} className="text-[#B76E79]" />
              Comptage, ajustements et valorisation du stock
            </p>
          </div>
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            {[
              { id: "count", label: "Comptage", icon: Boxes },
              { id: "history", label: "Historique", icon: History },
              { id: "valuation", label: "Valorisation", icon: Calculator },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#D4A5A5] to-[#B76E79] text-white shadow-md"
                    : "text-[#6B5B55] hover:bg-[#C9A9A6]/10"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className="bg-green-50/80 border border-green-200 text-green-700 px-5 py-4 rounded-2xl flex items-center gap-2">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {/* Valuation summary always visible */}
        {valuation && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 perspective-1000">
            <SummaryCard
              title="Valeur totale"
              value={`${formatPrice(valuation.totalValue)} FCFA`}
              icon={Calculator}
              gradient="from-[#D4A5A5]/20 to-[#C9A9A6]/10"
            />
            <SummaryCard
              title="Articles en stock"
              value={valuation.totalItems}
              icon={Archive}
              gradient="from-[#B76E79]/20 to-[#C9A9A6]/10"
            />
            <SummaryCard
              title="Produits"
              value={valuation.productCount}
              icon={Package}
              gradient="from-[#C9A9A6]/20 to-[#D4A5A5]/10"
            />
            <SummaryCard
              title="Stock faible"
              value={valuation.lowStockCount}
              icon={AlertTriangle}
              gradient="from-[#B76E79]/20 to-[#D4A5A5]/10"
            />
          </div>
        )}

        {activeTab === "count" && (
          <>
            {/* Filters */}
            <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Search size={20} className="text-[#B76E79]" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[#4A3F3A] placeholder-[#B76E79]/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-[#B76E79]" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border border-[#C9A9A6]/30 rounded-xl px-4 py-2 text-[#4A3F3A] outline-none focus:border-[#B76E79]"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products count table */}
            <div className="glass rounded-2xl overflow-hidden tilt-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F7E7CE]/50 text-left">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55]">Produit</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55]">Catégorie</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Stock système</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Stock physique</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Écart</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9A9A6]/10">
                    {filteredProducts.map((p) => {
                      const editedValue = editingCounts[p.id];
                      const countedQty = editedValue !== undefined ? parseInt(editedValue) : p.quantity;
                      const difference = editedValue !== undefined ? countedQty - p.quantity : 0;
                      const isEdited = editedValue !== undefined;

                      return (
                        <tr key={p.id} className="hover:bg-[#F7E7CE]/30 transition-colors duration-300">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-[#4A3F3A]">{p.name}</div>
                            <div className="text-xs text-[#6B5B55]/70">{formatPrice(p.price)} FCFA / unité</div>
                          </td>
                          <td className="px-6 py-4 text-[#6B5B55]">{p.category || "-"}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                              p.quantity <= p.lowStock
                                ? "bg-[#B76E79]/10 text-[#B76E79] border border-[#B76E79]/20"
                                : "bg-[#F7E7CE]/80 text-[#6B5B55] border border-[#C9A9A6]/20"
                            }`}>
                              {p.quantity <= p.lowStock && <AlertTriangle size={12} />}
                              {p.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={editedValue ?? p.quantity}
                              onChange={(e) => handleCountChange(p.id, e.target.value)}
                              className="w-24 px-3 py-2 rounded-xl input-warm text-[#4A3F3A] text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isEdited ? (
                              <span className={`font-semibold ${
                                difference > 0 ? "text-green-600" : difference < 0 ? "text-[#B76E79]" : "text-[#6B5B55]"
                              }`}>
                                {difference > 0 ? `+${difference}` : difference}
                              </span>
                            ) : (
                              <span className="text-[#6B5B55]/50">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEdited ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveCount(p)}
                                  disabled={saving[p.id]}
                                  className="px-4 py-2 rounded-xl btn-luxe text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Save size={14} />
                                  {saving[p.id] ? "..." : "Valider"}
                                </button>
                                <button
                                  onClick={() => cancelEdit(p.id)}
                                  className="px-4 py-2 rounded-xl border border-[#C9A9A6]/30 text-[#6B5B55] hover:bg-[#C9A9A6]/10 transition-all duration-300"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#6B5B55]/60">
                                {p._count.inventoryCounts > 0 ? `${p._count.inventoryCounts} inventaire(s)` : "Aucun inventaire"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <div className="p-12 text-center text-[#6B5B55]/60">
                  <Boxes size={64} className="mx-auto mb-4 text-[#C9A9A6]/40" />
                  <p>Aucun produit trouvé</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="glass rounded-2xl overflow-hidden tilt-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F7E7CE]/50 text-left">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55]">Date</th>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55]">Produit</th>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Système</th>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Compté</th>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Écart</th>
                    <th className="px-6 py-4 font-semibold text-[#6B5B55]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A9A6]/10">
                  {counts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F7E7CE]/30 transition-colors duration-300">
                      <td className="px-6 py-4 text-[#6B5B55]">
                        {new Date(c.countedAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#4A3F3A]">{c.product.name}</div>
                        <div className="text-xs text-[#6B5B55]/60">{c.product.category || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-[#6B5B55]">{c.systemQty}</td>
                      <td className="px-6 py-4 text-center font-semibold text-[#4A3F3A]">{c.countedQty}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-semibold ${
                          c.difference > 0 ? "text-green-600" : c.difference < 0 ? "text-[#B76E79]" : "text-[#6B5B55]"
                        }`}>
                          {c.difference > 0 ? `+${c.difference}` : c.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#6B5B55]">{c.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {counts.length === 0 && (
              <div className="p-12 text-center text-[#6B5B55]/60">
                <History size={64} className="mx-auto mb-4 text-[#C9A9A6]/40" />
                <p>Aucun inventaire enregistré</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "valuation" && valuation && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 tilt-card">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#4A3F3A] mb-5 flex items-center gap-2">
                <TrendingUp size={20} className="text-[#B76E79]" />
                Valorisation par catégorie
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F7E7CE]/50 text-left">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55]">Catégorie</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Produits</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55] text-center">Articles</th>
                      <th className="px-6 py-4 font-semibold text-[#6B5B55]">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9A9A6]/10">
                    {valuation.byCategory.map((cat: any) => (
                      <tr key={cat.name} className="hover:bg-[#F7E7CE]/30 transition-colors duration-300">
                        <td className="px-6 py-4 font-medium text-[#4A3F3A]">{cat.name}</td>
                        <td className="px-6 py-4 text-center text-[#6B5B55]">{cat.products}</td>
                        <td className="px-6 py-4 text-center text-[#6B5B55]">{cat.items}</td>
                        <td className="px-6 py-4 font-semibold text-[#B76E79]">{formatPrice(cat.value)} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function SummaryCard({ title, value, icon: Icon, gradient }: { title: string; value: string | number; icon: any; gradient: string }) {
  return (
    <div className={`glass rounded-2xl p-5 tilt-card bg-gradient-to-br ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#6B5B55]/80 mb-1">{title}</p>
          <p className="text-2xl font-bold text-[#4A3F3A] font-[family-name:var(--font-playfair)]">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-[#FDF8F3]/80 flex items-center justify-center shadow-sm text-[#B76E79]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
