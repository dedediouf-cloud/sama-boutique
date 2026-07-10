"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import { isAdmin } from "@/lib/roles";
import {
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  X,
  Archive,
  History,
  TrendingUp,
  Search,
} from "lucide-react";

const productIcons = ["✨", "🎁", "💎", "🛍️", "🌟", "🏺", "🕯️", "🧴", "👜", "🧣"];

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    lowStock: "5",
    category: "",
  });
  const [restockForm, setRestockForm] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    quantity: string;
    note: string;
  }>({
    open: false,
    productId: "",
    productName: "",
    quantity: "",
    note: "",
  });
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = () => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        lowStock: parseInt(form.lowStock),
      }),
    });
    setForm({ name: "", description: "", price: "", quantity: "", lowStock: "5", category: "" });
    setShowForm(false);
    fetchProducts();
  };

  const openRestock = (product: any) => {
    setRestockForm({
      open: true,
      productId: product.id,
      productName: product.name,
      quantity: "",
      note: "",
    });
    setSelectedProduct(product.id);
    fetchStockEntries(product.id);
  };

  const fetchStockEntries = (productId: string) => {
    fetch(`/api/products/${productId}/stock-entries`)
      .then((res) => res.json())
      .then((data) => setStockEntries(data));
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/products/${restockForm.productId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseInt(restockForm.quantity),
        note: restockForm.note,
      }),
    });

    if (res.ok) {
      alert("Réapprovisionnement effectué !");
      setRestockForm({ open: false, productId: "", productName: "", quantity: "", note: "" });
      fetchProducts();
      fetchStockEntries(restockForm.productId);
    } else {
      const error = await res.json();
      alert(error.error || "Erreur lors du réapprovisionnement");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Gestion du stock
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Archive size={16} className="text-[#B87333]" />
              {products.length} produit{sPlural(products.length)} enregistré{sPlural(products.length)}
            </p>
          </div>
          {isAdmin(session?.user?.role) && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
            >
              {showForm ? <X size={18} /> : <Plus size={18} />}
              {showForm ? "Annuler" : "Ajouter un produit"}
            </button>
          )}
        </div>

        {/* Add product form */}
        {showForm && isAdmin(session?.user?.role) && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Package size={18} className="text-[#B87333]" />
              </span>
              Nouveau produit
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom du produit</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Catégorie</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Quantité</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Seuil alerte stock</label>
                  <input
                    type="number"
                    value={form.lowStock}
                    onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  rows={3}
                />
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Enregistrer le produit
              </button>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher un produit ou une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 perspective-1000">
          {filteredProducts.map((p, index) => (
            <div
              key={p.id}
              className="glass rounded-2xl overflow-hidden tilt-card group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="h-40 product-visual flex items-center justify-center relative overflow-hidden">
                <div className="float-3d preserve-3d">
                  <span className="text-5xl filter drop-shadow-lg">
                    {productIcons[index % productIcons.length]}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    p.quantity <= p.lowStock
                      ? "bg-[#B87333]/15 text-[#B87333] border border-[#B87333]/20"
                      : "bg-[#D4AF37]/15 text-[#C5A028] border border-[#D4AF37]/20"
                  }`}>
                    {p.quantity <= p.lowStock ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                    {p.quantity <= p.lowStock ? "Stock faible" : "En stock"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-1">
                  {p.name}
                </h3>
                <p className="text-[#5C4033]/60 text-sm mb-3 line-clamp-2">
                  {p.description || "Aucune description"}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#B87333] font-bold text-lg">{formatPrice(p.price)} FCFA</span>
                  <span className="text-sm text-[#5C4033]/70 flex items-center gap-1">
                    <Archive size={14} />
                    {p.quantity} unités
                  </span>
                </div>
                {isAdmin(session?.user?.role) && (
                  <button
                    onClick={() => openRestock(p)}
                    className="w-full py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#B87333] font-medium hover:bg-[#D4AF37]/10 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={16} />
                    Réapprovisionner
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-[#5C4033]/60">
            <Package size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-lg">Aucun produit trouvé</p>
          </div>
        )}

        {/* Restock modal */}
        {restockForm.open && (
          <div className="fixed inset-0 bg-[#3D2B1F]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-strong rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setRestockForm({ ...restockForm, open: false })}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FDF6E3]/50 hover:bg-[#D4AF37]/20 flex items-center justify-center text-[#5C4033] transition-colors"
              >
                <X size={18} />
              </button>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#3D2B1F] mb-5 pr-8">
                Réapprovisionner
              </h2>
              <p className="text-[#B87333] font-medium mb-4">{restockForm.productName}</p>
              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Quantité à ajouter</label>
                  <input
                    type="number"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Note (optionnel)</label>
                  <input
                    type="text"
                    value={restockForm.note}
                    onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
                    placeholder="Ex: Fournisseur X, lot de juin..."
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRestockForm({ ...restockForm, open: false })}
                    className="flex-1 px-4 py-3 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/10 transition-all duration-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl btn-luxe"
                  >
                    Ajouter au stock
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-3 flex items-center gap-2">
                  <History size={18} className="text-[#B87333]" />
                  Historique des entrées
                </h3>
                {stockEntries.length > 0 ? (
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {stockEntries.map((entry) => (
                      <li key={entry.id} className="p-3 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-[#B87333]">+{entry.quantity} unités</span>
                          <span className="text-[#5C4033]/60">
                            {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        {entry.note && <p className="text-[#5C4033]/70 mt-1">{entry.note}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#5C4033]/60">Aucune entrée de stock pour ce produit</p>
                )}
              </div>
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
