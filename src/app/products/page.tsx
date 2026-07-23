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
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    lowStock: "5",
    category: "",
    imageUrl: "",
    supplierId: "",
  });
  const [restockForm, setRestockForm] = useState({
    open: false,
    productId: "",
    productName: "",
    quantity: "",
    note: "",
    supplierId: "",
    unitPrice: "",
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "", description: "", price: "", quantity: "", lowStock: "", category: "", imageUrl: "", supplierId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

    if (!editForm.name.trim()) { alert("Le nom du produit est obligatoire"); return; }
    if (!editForm.price || parseFloat(editForm.price) <= 0) { alert("Le prix doit être supérieur à 0"); return; }

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

  const [searchTerm, setSearchTerm] = useState("");
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Erreur fetch products:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers(Array.isArray(await res.json()) ? await res.json() : []);
    } catch (error) {
      console.error("Erreur fetch suppliers:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Le nom du produit est obligatoire"); return; }
    if (!form.price || parseFloat(form.price) <= 0) { alert("Le prix doit être supérieur à 0"); return; }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le produit "${name}" ?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) { await fetchProducts(); alert("Produit supprimé avec succès"); }
      else alert("Erreur lors de la suppression");
    } catch (error) { alert("Erreur réseau lors de la suppression"); }
  };

  const deleteAllProducts = async () => {
    if (products.length === 0) return;
    const userInput = prompt(`ATTENTION !\n\nVous allez supprimer les ${products.length} produits.\n\nTapez "SUPPRIMER" pour confirmer :`);
    if (userInput !== "SUPPRIMER") { alert("Suppression annulée."); return; }

    setDeletingAll(true);
    try {
      const res = await fetch("/api/products", { method: "DELETE" });
      if (res.ok) {
        const result = await res.json();
        await fetchProducts();
        alert(`✅ ${result.deleted} produit(s) supprimé(s) avec succès !`);
      } else alert("Erreur lors de la suppression en masse");
    } catch (error) { alert("Erreur réseau lors de la suppression"); }
    finally { setDeletingAll(false); }
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
    }
  };

  // ... (le reste du code CSV, import, etc. reste identique)

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                {/* Boutons Importer CSV, Modèle CSV, Ajouter, Tout supprimer */}
                {/* ... (garde les boutons existants) */}
              </>
            )}
          </div>
        </div>

        {/* ... (formulaire création + recherche + grille restent identiques) */}

        {/* ==================== MODAL RÉAPPRO - FOND BLANC + INTELLIGENT ==================== */}
        {restockForm.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-[#E8D9B8]">
              <h3 className="font-semibold mb-2 text-xl text-[#3D2B1F]">Réapprovisionner</h3>
              <p className="text-[#5C4033] mb-4 break-words font-medium">{restockForm.productName}</p>

              <div className="mb-4 p-3 bg-[#FDF6E3] border border-[#D4AF37]/30 rounded-xl text-xs text-[#5C4033]">
                💡 <strong>Conseil :</strong> Pour une meilleure traçabilité (prix d’achat + fournisseur), privilégiez les <span className="font-semibold">Commandes Fournisseurs</span>.
              </div>

              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Quantité à ajouter *</label>
                  <input
                    type="number" min="1" placeholder="Ex: 20"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white text-sm sm:text-base" required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Fournisseur (optionnel)</label>
                    <select
                      value={restockForm.supplierId}
                      onChange={(e) => setRestockForm({ ...restockForm, supplierId: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white text-sm"
                    >
                      <option value="">Aucun / Non précisé</option>
                      {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Prix unitaire d’achat (optionnel)</label>
                    <input
                      type="number" min="0" step="1" placeholder="Ex: 850"
                      value={restockForm.unitPrice}
                      onChange={(e) => setRestockForm({ ...restockForm, unitPrice: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Note (optionnel)</label>
                  <input
                    type="text" placeholder="Livraison express, bon n°123..."
                    value={restockForm.note}
                    onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/30 bg-white text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockForm({ open: false, productId: "", productName: "", quantity: "", note: "", supplierId: "", unitPrice: "" })}
                    className="flex-1 p-3 border border-[#D4AF37]/40 rounded-xl text-sm sm:text-base text-[#5C4033] hover:bg-[#FDF6E3]"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 p-3 btn-luxe text-sm sm:text-base">
                    Valider l'ajout
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== MODAL MODIFIER - FOND BLANC SOLIDE ==================== */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl w-full max-w-[96vw] sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8D9B8]">
              <h3 className="font-semibold mb-2 sm:mb-3 text-lg sm:text-xl">Modifier le produit</h3>
              <p className="text-[#5C4033]/70 mb-3 sm:mb-4 text-xs sm:text-sm break-words">{editingProduct.name}</p>

              <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
                {/* tous les champs du formulaire d'édition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {/* ... (garde tous tes inputs actuels) */}
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 pt-1">
                  <button type="button" onClick={closeEdit} className="flex-1 p-2 sm:p-2.5 border rounded-xl text-xs sm:text-sm">Annuler</button>
                  <button type="submit" disabled={savingEdit} className="flex-1 p-2.5 sm:p-3 btn-luxe text-sm disabled:opacity-70">
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