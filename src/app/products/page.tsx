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
  const [restockForm, setRestockForm] = useState({
    open: false,
    productId: "",
    productName: "",
    quantity: "",
    note: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [importing, setImporting] = useState(false);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Le nom est obligatoire");
      return;
    }

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

    if (res.ok) {
      setForm({ name: "", description: "", price: "", quantity: "", lowStock: "5", category: "" });
      setShowForm(false);
      fetchProducts();
    } else {
      alert("Erreur lors de l'enregistrement");
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
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
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/products/${restockForm.productId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseInt(restockForm.quantity),
        note: restockForm.note,
      }),
    });
    setRestockForm({ ...restockForm, open: false });
    fetchProducts();
  };

  // ===================== CSV IMPORT AMÉLIORÉ =====================
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split(/\r?\n/);

        if (lines.length < 2) {
          alert("Fichier CSV vide ou mal formaté");
          setImporting(false);
          return;
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";

        const headers = lines[0]
          .split(delimiter)
          .map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

        const items = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map(c => c.trim());
          if (!cols[0]) continue;

          const item: any = {};
          headers.forEach((h, idx) => {
            const v = cols[idx] || "";
            if (h.includes("nom")) item.name = v;
            else if (h.includes("cat")) item.category = v;
            else if (h.includes("prix")) item.price = v;
            else if (h.includes("quant")) item.quantity = v;
            else if (h.includes("seuil") || h.includes("alerte")) item.lowStock = v;
            else if (h.includes("desc")) item.description = v;
          });

          if (item.name && item.name.length > 2) {
            items.push({
              name: item.name,
              category: item.category || "",
              price: parseFloat(item.price) || 0,
              quantity: parseInt(item.quantity) || 0,
              lowStock: parseInt(item.lowStock) || 5,
              description: item.description || "",
            });
          }
        }

        if (items.length === 0) {
          alert("Aucun produit valide. Vérifie les colonnes du CSV.");
          setImporting(false);
          return;
        }

        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: items }),
        });

        const result = await res.json();
        alert(`${result.imported} produit(s) importé(s) !`);
        fetchProducts();
      } catch (err) {
        alert("Erreur de lecture du CSV");
      }
      setImporting(false);
      e.target.value = "";
    };

    reader.readAsText(file, "UTF-8");
  };
  // ===================== FIN CSV =====================

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-[#3D2B1F]">Gestion du stock</h1>
            <p>{products.length} produit(s)</p>
          </div>
          <div className="flex gap-3">
            {isAdmin(session?.user?.role) && (
              <>
                <label className="px-5 py-3 border border-[#D4AF37]/40 text-[#B87333] rounded-xl flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  {importing ? "Import..." : "Importer CSV"}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={importing} />
                </label>
                <button onClick={() => setShowForm(!showForm)} className="px-6 py-3 btn-luxe flex items-center gap-2">
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                  {showForm ? "Annuler" : "Ajouter"}
                </button>
              </>
            )}
          </div>
        </div>

        {showForm && (
          <div className="glass p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nom" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-warm p-3 rounded-xl" required />
                <input placeholder="Catégorie" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-warm p-3 rounded-xl" />
                <input placeholder="Prix" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-warm p-3 rounded-xl" required />
                <input placeholder="Quantité" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="input-warm p-3 rounded-xl" required />
                <input placeholder="Seuil alerte" type="number" value={form.lowStock} onChange={e => setForm({...form, lowStock: e.target.value})} className="input-warm p-3 rounded-xl" />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full input-warm p-3 rounded-xl" rows={2} />
              <button className="btn-luxe px-8 py-3">Enregistrer</button>
            </form>
          </div>
        )}

        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-4 rounded-2xl glass"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p, i) => (
            <div key={p.id} className="glass rounded-2xl p-5">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-[#5C4033]/70">{p.category}</p>
                </div>
                <span className="text-[#B87333] font-bold">{formatPrice(p.price)} FCFA</span>
              </div>

              <p className="text-sm my-2 line-clamp-2">{p.description}</p>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm">Stock : {p.quantity}</span>
                {isAdmin(session?.user?.role) && (
                  <div className="flex gap-2">
                    <button onClick={() => openRestock(p)} className="text-sm px-3 py-1 border rounded">Réappro</button>
                    <button onClick={() => deleteProduct(p.id, p.name)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {restockForm.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="glass p-6 rounded-2xl w-full max-w-md">
              <h3 className="font-semibold mb-4">Réapprovisionner {restockForm.productName}</h3>
              <form onSubmit={handleRestock} className="space-y-4">
                <input type="number" placeholder="Quantité" value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: e.target.value})} className="w-full p-3 rounded" required />
                <input type="text" placeholder="Note" value={restockForm.note} onChange={e => setRestockForm({...restockForm, note: e.target.value})} className="w-full p-3 rounded" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRestockForm({...restockForm, open: false})} className="flex-1 p-3 border rounded">Annuler</button>
                  <button type="submit" className="flex-1 p-3 btn-luxe">Valider</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}