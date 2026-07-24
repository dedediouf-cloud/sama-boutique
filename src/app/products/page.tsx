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
  X,
  TrendingUp,
  Trash2,
  Upload,
  Download,
  Trash,
} from "lucide-react";

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", price: "", quantity: "", lowStock: "5", category: "", imageUrl: "", supplierId: "",
  });

  const [restockForm, setRestockForm] = useState({
    open: false, productId: "", productName: "", quantity: "", note: "", supplierId: "", unitPrice: "",
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "", description: "", price: "", quantity: "", lowStock: "", category: "", imageUrl: "", supplierId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [restocking, setRestocking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erreur lors du chargement des produits");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Fetch products error:", err);
      setError("Impossible de charger les produits. Veuillez réessayer.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fetch suppliers error:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      quantity: product.quantity?.toString() || "",
      lowStock: (product.lowStock || 5).toString(),
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      supplierId: product.supplierId || "",
    });
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setEditForm({ name: "", description: "", price: "", quantity: "", lowStock: "", category: "", imageUrl: "", supplierId: "" });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editForm.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }
    if (!editForm.price || parseFloat(editForm.price) <= 0) {
      alert("Le prix doit être supérieur à 0");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          price: parseFloat(editForm.price),
          quantity: parseInt(editForm.quantity) || 0,
          lowStock: parseInt(editForm.lowStock) || 5,
          category: editForm.category,
          imageUrl: editForm.imageUrl || null,
          supplierId: editForm.supplierId || null,
        }),
      });

      if (res.ok) {
        await fetchProducts();
        closeEdit();
        alert("✅ Produit mis à jour avec succès !");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      alert("Erreur réseau lors de la modification");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert("Le prix doit être supérieur à 0");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          quantity: parseInt(form.quantity) || 0,
          lowStock: parseInt(form.lowStock) || 5,
          imageUrl: form.imageUrl || null,
          supplierId: form.supplierId || null,
        }),
      });

      if (res.ok) {
        setForm({ name: "", description: "", price: "", quantity: "", lowStock: "5", category: "", imageUrl: "", supplierId: "" });
        setShowForm(false);
        await fetchProducts();
        alert("Produit enregistré avec succès !");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Erreur lors de l'enregistrement: ${errorData.error || "Vérifiez les données"}`);
      }
    } catch (error) {
      alert("Erreur réseau lors de l'enregistrement");
    } finally {
      setCreating(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le produit "${name}" ?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchProducts();
        alert("Produit supprimé avec succès");
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (error) {
      alert("Erreur réseau lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllProducts = async () => {
    if (products.length === 0) {
      alert("Aucun produit à supprimer");
      return;
    }

    const userInput = prompt(`ATTENTION !\n\nVous allez supprimer les ${products.length} produits.\n\nTapez "SUPPRIMER" pour confirmer :`);
    if (userInput !== "SUPPRIMER") {
      alert("Suppression annulée.");
      return;
    }

    setDeletingAll(true);
    try {
      const res = await fetch("/api/products", { method: "DELETE" });
      if (res.ok) {
        const result = await res.json();
        await fetchProducts();
        alert(`✅ ${result.deleted} produit(s) supprimé(s) avec succès !`);
      } else {
        alert("Erreur lors de la suppression en masse");
      }
    } catch (error) {
      alert("Erreur réseau lors de la suppression");
    } finally {
      setDeletingAll(false);
    }
  };

  const openRestock = (product: any) => {
    setRestockForm({
      open: true,
      productId: product.id,
      productName: product.name,
      quantity: "",
      note: "",
      supplierId: "",
      unitPrice: "",
    });
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.quantity || parseInt(restockForm.quantity) <= 0) {
      alert("Quantité invalide");
      return;
    }

    setRestocking(true);
    try {
      await fetch(`/api/products/${restockForm.productId}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseInt(restockForm.quantity),
          note: restockForm.note,
          supplierId: restockForm.supplierId || null,
          unitPrice: restockForm.unitPrice ? parseFloat(restockForm.unitPrice) : null,
        }),
      });
      setRestockForm({ open: false, productId: "", productName: "", quantity: "", note: "", supplierId: "", unitPrice: "" });
      await fetchProducts();
    } catch (error) {
      alert("Erreur lors du réapprovisionnement");
    } finally {
      setRestocking(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string) || "";
        const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert("Fichier vide ou invalide");
          setImporting(false);
          return;
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

        const findIndex = (possible: string[]) => {
          for (let i = 0; i < headers.length; i++) {
            if (possible.some((p) => headers[i].includes(p))) return i;
          }
          return -1;
        };

        const nameIdx = findIndex(["nom", "produit", "libelle"]);
        if (nameIdx === -1) {
          alert("Colonne 'Nom du produit' introuvable");
          setImporting(false);
          return;
        }

        const items: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter);
          const rawName = cols[nameIdx]?.trim().replace(/"/g, "");
          if (!rawName) continue;

          items.push({
            name: rawName,
            category: cols[findIndex(["categorie", "cat"])] || "",
            price: parseFloat((cols[findIndex(["prix"])] || "0").replace(",", ".") || "0") || 0,
            quantity: parseInt(cols[findIndex(["quantite", "stock"])] || "0") || 0,
            lowStock: parseInt(cols[findIndex(["seuil", "alerte"])] || "5") || 5,
            description: cols[findIndex(["description"])] || "",
          });
        }

        if (items.length === 0) {
          alert("Aucun produit valide trouvé");
          setImporting(false);
          return;
        }

        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: items }),
        });

        if (res.ok) {
          const result = await res.json();
          alert(`✅ ${result.imported} produit(s) importé(s) avec succès !`);
          await fetchProducts();
        } else {
          alert("Erreur lors de l'import");
        }
      } catch (err) {
        alert("Erreur lors de l'import CSV");
      } finally {
        setImporting(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const downloadCSVTemplate = () => {
    const headers = ["Nom du produit", "Catégorie", "Prix FCFA", "Quantité", "Seuil alerte stock", "Description"];
    const sample = ["Savon artisanal karité", "Hygiène", "1500", "45", "10", "Savon naturel 100% bio"];
    const csv = "\uFEFF" + headers.join(";") + "\n" + sample.map((c) => `"${c}"`).join(";");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modele_stock.csv";
    link.click();
  };

  const filtered = products.filter((p) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-6 overflow-x-hidden w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#3D2B1F]">Gestion du stock</h1>
            <p className="text-[#5C4033]/70 text-sm sm:text-base">{products.length} produit(s)</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {isAdmin(session?.user?.role) && (
              <>
                <label className={`flex-1 sm:flex-none px-4 py-2.5 border border-[#D4AF37]/40 text-[#B87333] rounded-xl flex items-center justify-center gap-2 text-sm ${importing || creating || restocking || deletingAll ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Upload size={18} />
                  {importing ? "Import..." : "Importer CSV"}
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    className="hidden" 
                    onChange={handleCSVImport} 
                    disabled={importing || creating || restocking || deletingAll} 
                  />
                </label>

                <button 
                  onClick={downloadCSVTemplate} 
                  disabled={importing || creating || restocking || deletingAll}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-[#D4AF37]/30 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-[0.985] transition-all"
                >
                  <Download size={18} /> Modèle CSV
                </button>

                <button 
                  onClick={() => setShowForm(!showForm)} 
                  disabled={creating || restocking || deletingAll}
                  className="flex-1 sm:flex-none px-5 py-2.5 btn-luxe flex items-center justify-center gap-2 text-sm disabled:opacity-70 active:scale-[0.985] transition-all"
                >
                  {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? "Annuler" : "Ajouter"}
                </button>

                {products.length > 0 && (
                  <button 
                    onClick={deleteAllProducts} 
                    disabled={deletingAll || deletingId !== null || restocking || creating} 
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-red-300 text-red-600 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.985] transition-all"
                  >
                    <Trash size={18} /> {deletingAll ? "Suppression..." : "Tout supprimer"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="text-xs text-[#5C4033]/60 -mt-2 mb-2 px-1">
          💡 Pour les accents : Enregistrez en <strong>CSV UTF-8</strong>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="glass p-5 sm:p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder="Nom du produit *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base" required />
                <input placeholder="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base" />
                <input placeholder="Prix FCFA *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base" required />
                <input placeholder="Quantité en stock *" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base" required />
                <input placeholder="Seuil alerte stock" type="number" value={form.lowStock} onChange={(e) => setForm({ ...form, lowStock: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base" />
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="input-warm p-3 rounded-xl text-sm sm:text-base">
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1">Photo (URL)</label>
                <input 
                  placeholder="https://exemple.com/photo.jpg" 
                  value={form.imageUrl} 
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} 
                  className="input-warm p-3 rounded-xl text-sm sm:text-base w-full" 
                />
                {form.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={form.imageUrl} 
                      alt="Aperçu" 
                      className="w-16 h-16 object-cover rounded-lg border border-[#D4AF37]/20" 
                      onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                    />
                  </div>
                )}
              </div>

              <textarea placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full input-warm p-3 rounded-xl text-sm sm:text-base" rows={2} />

              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-3 border rounded-xl text-sm sm:text-base">Annuler</button>
                <button 
                  type="submit" 
                  disabled={creating} 
                  className="flex-1 btn-luxe px-8 py-3 disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.985] transition-all"
                >
                  {creating ? "Enregistrement..." : "Enregistrer le produit"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3.5 sm:p-4 rounded-2xl glass text-sm sm:text-base"
        />

        {/* Content — loading / error / empty / grid */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full mx-auto mb-4"></div>
            <p className="text-[#5C4033]">Chargement des produits...</p>
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchProducts} disabled={loading} className="px-6 py-2 border rounded-xl bg-white hover:bg-gray-50 disabled:opacity-60">Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 sm:p-12 text-center">
            <Package className="mx-auto mb-4 text-[#D4AF37]" size={48} />
            <p className="text-lg">Aucun produit trouvé</p>
            <p className="text-sm text-[#5C4033]/60 mt-1">{searchTerm ? "Essayez une autre recherche" : "Ajoutez ou importez des produits"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5">
            {filtered.map((p) => {
              const isLowStock = (p.quantity || 0) <= (p.lowStock || 5);
              return (
                <div key={p.id} className="glass rounded-2xl p-2 sm:p-2.5 flex flex-col overflow-hidden min-w-0">
                  <div className="flex gap-1.5 items-start">
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-6 h-6 sm:w-7 sm:h-7 object-cover rounded-lg border border-[#D4AF37]/20 flex-shrink-0 mt-0.5" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-1">
                        <h3 className="font-semibold text-[10.5px] sm:text-xs text-[#3D2B1F] leading-tight line-clamp-2 break-words min-w-0">{p.name}</h3>
                        <span className="text-[#B87333] font-bold text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">{formatPrice(p.price)}</span>
                      </div>
                      {p.category && <p className="text-[9px] text-[#5C4033]/70 truncate">{p.category}</p>}
                      {p.supplier && <p className="text-[8px] text-[#B87333] truncate">Fourn. : {p.supplier.name}</p>}
                    </div>
                  </div>

                  {p.description && <p className="text-[9.5px] text-[#5C4033]/75 mt-1.5 line-clamp-2 leading-tight">{p.description}</p>}

                  <div className="mt-auto pt-2">
                    <div className="flex items-center text-[10px] mb-1">
                      <span className={`font-medium ${isLowStock ? "text-red-600" : "text-[#5C4033]"}`}>Stock : {p.quantity}</span>
                      {isLowStock && <AlertTriangle size={11} className="ml-1 text-red-500" />}
                    </div>

                    {isAdmin(session?.user?.role) && (
                      <div className="flex gap-0.5">
                        <button 
                          onClick={() => openRestock(p)} 
                          disabled={restocking}
                          className="flex-1 text-[9px] px-1.5 py-1 border border-[#D4AF37]/25 rounded-md hover:bg-[#D4AF37]/10 flex items-center justify-center gap-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <TrendingUp size={10} /> Réappro
                        </button>
                        <button 
                          onClick={() => openEdit(p)} 
                          disabled={savingEdit}
                          className="flex-1 text-[9px] px-1.5 py-1 border border-[#D4AF37]/25 rounded-md hover:bg-[#D4AF37]/10 flex items-center justify-center gap-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Modifier
                        </button>
                        <button 
                          onClick={() => deleteProduct(p.id, p.name)} 
                          disabled={deletingId === p.id}
                          className="px-1 flex items-center justify-center text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === p.id ? "..." : <Trash2 size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Réappro Modal - bg-white + intelligent fields */}
        {restockForm.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-[#E8D9B8]">
              <h3 className="font-semibold mb-2 text-xl text-[#3D2B1F]">Réapprovisionner</h3>
              <p className="text-[#5C4033] mb-4 break-words font-medium">{restockForm.productName}</p>

              <div className="mb-4 p-3 bg-[#FDF6E3] border border-[#D4AF37]/30 rounded-xl text-xs text-[#5C4033]">
                💡 Privilégiez les <strong>Commandes Fournisseurs</strong> pour la traçabilité.
              </div>

              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Quantité à ajouter *</label>
                  <input type="number" min="1" placeholder="Ex: 20" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Fournisseur (optionnel)</label>
                    <select value={restockForm.supplierId} onChange={(e) => setRestockForm({ ...restockForm, supplierId: e.target.value })} className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white">
                      <option value="">Aucun</option>
                      {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Prix unitaire d’achat (optionnel)</label>
                    <input type="number" min="0" step="1" placeholder="Ex: 850" value={restockForm.unitPrice} onChange={(e) => setRestockForm({ ...restockForm, unitPrice: e.target.value })} className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Note (optionnel)</label>
                  <input type="text" placeholder="Livraison..." value={restockForm.note} onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })} className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setRestockForm({ open: false, productId: "", productName: "", quantity: "", note: "", supplierId: "", unitPrice: "" })} 
                    disabled={restocking}
                    className="flex-1 p-3 border border-[#D4AF37]/40 rounded-xl disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={restocking} 
                    className="flex-1 p-3 btn-luxe disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {restocking ? "Validation..." : "Valider l'ajout"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal - bg-white */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl w-full max-w-[96vw] sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8D9B8]">
              <h3 className="font-semibold mb-3 text-lg">Modifier le produit</h3>
              <p className="text-[#5C4033]/70 mb-4 text-sm break-words">{editingProduct.name}</p>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input placeholder="Nom du produit *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" required />
                  <input placeholder="Catégorie" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" />
                  <input placeholder="Prix FCFA *" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" required />
                  <input placeholder="Quantité" type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" />
                  <input placeholder="Seuil alerte" type="number" value={editForm.lowStock} onChange={(e) => setEditForm({ ...editForm, lowStock: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" />
                  <select value={editForm.supplierId} onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20">
                    <option value="">Aucun fournisseur</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4033] mb-1">Photo (URL)</label>
                  <input placeholder="https://..." value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" />
                  {editForm.imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={editForm.imageUrl} 
                        alt="Aperçu" 
                        className="w-16 h-16 object-cover rounded-lg border border-[#D4AF37]/20" 
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
                      />
                    </div>
                  )}
                </div>

                <textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full p-2.5 rounded-xl border border-[#D4AF37]/20" rows={2} />

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button type="button" onClick={closeEdit} className="flex-1 p-2.5 border rounded-xl text-sm">Annuler</button>
                  <button 
                  type="submit" 
                  disabled={savingEdit} 
                  className="flex-1 p-2.5 btn-luxe text-sm disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.985] transition-all"
                >
                  {savingEdit ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
