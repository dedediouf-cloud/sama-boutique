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
  Trash2,
  Upload,
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
  const [importing, setImporting] = useState(false);

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

    if (!form.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          quantity: parseInt(form.quantity) || 0,
          lowStock: parseInt(form.lowStock) || 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      setForm({ name: "", description: "", price: "", quantity: "", lowStock: "5", category: "" });
      setShowForm(false);
      fetchProducts();
    } catch (error: any) {
      alert(error.message || "Une erreur est survenue lors de l'enregistrement");
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer le produit "${name}" ?`)) return;

    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchProducts();
    } else {
      alert("Erreur lors de la suppression");
    }
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
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.trim().split("\n");
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());

        const productsToImport = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          if (!values[0]) continue;

          const p: any = {};
          headers.forEach((h, idx) => {
            const val = values[idx] || "";
            if (h.includes("nom")) p.name = val;
            else if (h.includes("cat")) p.category = val;
            else if (h.includes("prix")) p.price = val;
            else if (h.includes("quant")) p.quantity = val;
            else if (h.includes("seuil") || h.includes("alerte")) p.lowStock = val;
            else if (h.includes("desc")) p.description = val;
          });

          if (p.name) {
            productsToImport.push({
              name: p.name,
              category: p.category || "",
              price: parseFloat(p.price) || 0,
              quantity: parseInt(p.quantity) || 0,
              lowStock: parseInt(p.lowStock) || 5,
              description: p.description || "",
            });
          }
        }

        if (productsToImport.length === 0) {
          alert("Aucun produit valide dans le CSV");
          setImporting(false);
          return;
        }

        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: productsToImport }),
        });

        const result = await res.json();
        if (res.ok) {
          alert(`${result.imported} produit(s) importé(s) !`);
          fetchProducts();
        } else {
          alert(result.error || "Erreur import");
        }
      } catch {
        alert("Erreur lecture CSV");
      }
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Gestion du stock
            </h1>
            <p className="text-[#5C4033] mt-1">
              {products.length} produit(s) enregistré(s)
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin(session?.user?.role) && (
              <>
                <label className="px-5 py-3 rounded-xl border border-[#D4AF37]/40 text-[#B87333] font-medium hover:bg-[#D4AF37]/10 flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  {importing ? "Import..." : "Importer CSV"}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={importing} />
                </label>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
                >
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                  {showForm ? "Annuler" : "Ajouter un produit"}
                </button>
              </>
            )}
          </div>
        </div>

        {showForm && isAdmin(session?.user?.role) && (
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5">Nouveau produit</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom du produit</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Catégorie</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Prix (FCFA)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Quantité</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Seuil alerte</label>
                  <input type="number" value={form.lowStock} onChange={(e) => setForm({ ...form, lowStock: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" rows={3} />
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Enregistrer le produit
              </button>
            </form>
          </div>
        )}

        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent border-none outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p, index) => (
            <div key={p.id} className="glass rounded-2xl overflow-hidden tilt-card">
              <div className="h-40 product-visual flex items-center justify-center relative">
                <span className="text-5xl">{productIcons[index % productIcons.length]}</span>
                <div className="absolute top-3 right-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.quantity <= p.lowStock ? "bg-[#B87333]/15 text-[#B87333]" : "bg-[#D4AF37]/15 text-[#C5A028]"}`}>
                    {p.quantity <= p.lowStock ? "Stock faible" : "En stock"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#3D2B1F] mb-1">{p.name}</h3>
                <p className="text-[#5C4033]/60 text-sm mb-3 line-clamp-2">{p.description || "Aucune description"}</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#B87333] font-bold text-lg">{formatPrice(p.price)} FCFA</span>
                  <span className="text-sm text-[#5C4033]/70">{p.quantity} unités</span>
                </div>

                {isAdmin(session?.user?.role) && (
                  <div className="flex gap-2">
                    <button onClick={() => openRestock(p)} className="flex-1 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#B87333] font-medium flex items-center justify-center gap-2">
                      <TrendingUp size={16} /> Réapprovisionner
                    </button>
                    <button onClick={() => deleteProduct(p.id, p.name)} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-[#5C4033]/60">
            <Package size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p>Aucun produit trouvé</p>
          </div>
        )}

        {restockForm.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="glass-strong rounded-3xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-semibold mb-4">Réapprovisionner {restockForm.productName}</h2>
              <form onSubmit={handleRestock} className="space-y-4">
                <input type="number" value={restockForm.quantity} onChange={(e) => setRestockForm({...restockForm, quantity: e.target.value})} className="w-full p-3 rounded-xl" placeholder="Quantité" required />
                <input type="text" value={restockForm.note} onChange={(e) => setRestockForm({...restockForm, note: e.target.value})} className="w-full p-3 rounded-xl" placeholder="Note (optionnel)" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRestockForm({...restockForm, open: false})} className="flex-1 py-3 border rounded-xl">Annuler</button>
                  <button type="submit" className="flex-1 py-3 btn-luxe">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
