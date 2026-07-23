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
  });

  // ✅ Nouveau : Édition complète d'un produit (stock, photo, fournisseur)
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    lowStock: "",
    category: "",
    imageUrl: "",
    supplierId: "",
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
    setEditForm({
      name: "", description: "", price: "", quantity: "", lowStock: "", category: "", imageUrl: "", supplierId: "",
    });
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
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
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
    if (!form.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert("Le prix doit être supérieur à 0");
      return;
    }

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
      console.error("Erreur création produit:", error);
      alert("Erreur réseau lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le produit "${name}" ?`)) return;

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
    }
  };

  // ✅ Supprimer TOUS les produits (admin)
  const deleteAllProducts = async () => {
    if (products.length === 0) {
      alert("Aucun produit à supprimer");
      return;
    }

    const confirmText = `ATTENTION !\n\nVous allez supprimer les ${products.length} produits.\n\nCette action est irréversible.\n\nTapez "SUPPRIMER" pour confirmer :`;

    const userInput = prompt(confirmText);
    if (userInput !== "SUPPRIMER") {
      alert("Suppression annulée.");
      return;
    }

    setDeletingAll(true);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
      });

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
        }),
      });
      setRestockForm({ ...restockForm, open: false });
      await fetchProducts();
    } catch (error) {
      alert("Erreur lors du réapprovisionnement");
    }
  };

  // ===================== CSV ROBUSTE + ACCENTS (TRÈS AMÉLIORÉ) =====================
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Nettoyage puissant des caractères mal encodés (Excel Windows + UTF8 mal géré)
  const cleanText = (text: string): string => {
    if (!text || typeof text !== "string") return "";

    let str = text;

    // 1. Supprime les caractères de remplacement
    str = str.replace(/\uFFFD/g, "");

    // 2. Corrections courantes Windows/Excel
    const replacements: Record<string, string> = {
      "Ã©": "é", "Ã¨": "è", "Ã ": "à", "Ã¢": "â", "Ãª": "ê",
      "Ã®": "î", "Ã´": "ô", "Ã»": "û", "Ã§": "ç",
      "Ã‰": "É", "Ã€": "À", "Ã‚": "Â", "Ã‡": "Ç",
      "Ã¯": "ï", "Ã¼": "ü", "Ã¶": "ö", "Ã¤": "ä",
      "Ã±": "ñ", "Ã£": "ã", "Ãµ": "õ",
      "Ã": "à",   // cas isolé
      "Â": "",    // parfois parasite
    };

    for (const [bad, good] of Object.entries(replacements)) {
      str = str.replace(new RegExp(bad, "g"), good);
    }

    // 3. Nettoyage final
    return str.trim();
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = (event.target?.result as string) || "";

        // Nettoyage global puissant
        text = cleanText(text);

        const lines = text
          .trim()
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          alert("Fichier vide ou invalide");
          setImporting(false);
          return;
        }

        let delimiter = lines[0].includes(";") ? ";" : ",";

        const rawHeaders = parseCSVLine(lines[0], delimiter).map((h) =>
          h
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/"/g, "")
        );

        const getColumnIndex = (possibleNames: string[]): number => {
          for (let i = 0; i < rawHeaders.length; i++) {
            if (possibleNames.some((name) => rawHeaders[i].includes(name))) return i;
          }
          return -1;
        };

        const colIndex = {
          name: getColumnIndex(["nom", "libelle", "produit", "article"]),
          category: getColumnIndex(["categorie", "category", "cat"]),
          price: getColumnIndex(["prix", "price", "montant"]),
          quantity: getColumnIndex(["quantite", "quant", "stock", "qte"]),
          lowStock: getColumnIndex(["seuil", "alerte", "lowstock", "minimum"]),
          description: getColumnIndex(["description", "desc", "detail"]),
        };

        if (colIndex.name === -1) {
          alert("Colonne 'Nom du produit' introuvable.\nColonnes détectées: " + rawHeaders.join(", "));
          setImporting(false);
          e.target.value = "";
          return;
        }

        const items: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i], delimiter);
          const rawName = cols[colIndex.name]?.trim();
          if (!rawName) continue;

          const nameVal = cleanText(rawName);
          if (!nameVal) continue;

          items.push({
            name: nameVal,
            category: colIndex.category >= 0 ? cleanText(cols[colIndex.category] || "") : "",
            price: parseFloat((colIndex.price >= 0 ? cols[colIndex.price] : "0").replace(",", ".")) || 0,
            quantity: parseInt(colIndex.quantity >= 0 ? cols[colIndex.quantity] : "0") || 0,
            lowStock: parseInt(colIndex.lowStock >= 0 ? cols[colIndex.lowStock] : "5") || 5,
            description: colIndex.description >= 0 ? cleanText(cols[colIndex.description] || "") : "",
          });
        }

        if (items.length === 0) {
          alert("Aucun produit valide trouvé dans le fichier.");
          setImporting(false);
          e.target.value = "";
          return;
        }

        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: items }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur serveur");
        }

        const result = await res.json();
        alert(`✅ ${result.imported} produit(s) importé(s) avec succès !`);
        await fetchProducts();
      } catch (err: any) {
        console.error("Erreur import CSV:", err);
        alert("Erreur lors de l'import CSV : " + (err.message || "Vérifiez le fichier"));
      } finally {
        setImporting(false);
        if (e.target) e.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Impossible de lire le fichier");
      setImporting(false);
      e.target.value = "";
    };

    reader.readAsText(file, "UTF-8");
  };
  // ===================== FIN CSV =====================

  // Télécharger modèle CSV avec BOM UTF-8 + accents
  const downloadCSVTemplate = () => {
    const headers = [
      "Nom du produit", "Catégorie", "Prix FCFA", "Quantité", "Seuil alerte stock", "Description", "Photo (URL)", "Fournisseur"
    ];

    const sampleRows = [
      ["Savon artisanal karité", "Hygiène", "1500", "45", "10", "Savon naturel 100% bio à base de beurre de karité", "", ""],
      ["Huile de baobab", "Beauté", "3500", "28", "5", "Huile pure pressée à froid - 100ml", "https://exemple.com/huile.jpg", ""],
      ["Pagne wax authentique", "Textile", "8500", "12", "3", "Tissu 6 yards - Motifs traditionnels", "", "Fournisseur XYZ"],
    ];

    const csvContent =
      "\uFEFF" +
      headers.join(";") +
      "\n" +
      sampleRows.map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "modele_produits_samaboutique.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header - responsive mobile + tablette */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#3D2B1F]">Gestion du stock</h1>
            <p className="text-[#5C4033]/70 text-sm sm:text-base">{products.length} produit(s)</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {isAdmin(session?.user?.role) && (
              <>
                <label className="flex-1 sm:flex-none px-4 py-2.5 sm:py-3 border border-[#D4AF37]/40 text-[#B87333] rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#D4AF37]/10 transition text-sm sm:text-base">
                  <Upload size={18} />
                  {importing ? "Import..." : "Importer CSV"}
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleCSVImport}
                    disabled={importing}
                  />
                </label>

                <button
                  onClick={downloadCSVTemplate}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-3 border border-[#D4AF37]/30 text-[#5C4033] rounded-xl flex items-center justify-center gap-2 hover:bg-white/50 transition text-sm sm:text-base"
                >
                  <Download size={18} />
                  Modèle CSV
                </button>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex-1 sm:flex-none px-5 py-2.5 sm:py-3 btn-luxe flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                  {showForm ? "Annuler" : "Ajouter"}
                </button>

                {products.length > 0 && (
                  <button
                    onClick={deleteAllProducts}
                    disabled={deletingAll}
                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                  >
                    <Trash size={18} />
                    {deletingAll ? "Suppression..." : "Tout supprimer"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="text-xs text-[#5C4033]/60 -mt-2 mb-2 px-1">
          💡 Pour les accents : Enregistrez en <strong>CSV UTF-8</strong> (Excel → Enregistrer sous → CSV UTF-8)
        </div>

        {/* Formulaire création */}
        {showForm && (
          <div className="glass p-5 sm:p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="Nom du produit *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                  required
                />
                <input
                  placeholder="Catégorie"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                />
                <input
                  placeholder="Prix FCFA *"
                  type="number"
                  step="1"
                  min="1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                  required
                />
                <input
                  placeholder="Quantité en stock *"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                  required
                />
                <input
                  placeholder="Seuil alerte stock"
                  type="number"
                  min="0"
                  value={form.lowStock}
                  onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                />
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base"
                >
                  <option value="">Aucun fournisseur</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1">Photo (URL)</label>
                <input
                  placeholder="https://exemple.com/photo-produit.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input-warm p-3 rounded-xl text-sm sm:text-base w-full"
                />
                <p className="text-xs text-[#5C4033]/60 mt-1">Collez l’URL d’une image (optionnel)</p>
              </div>

              <textarea
                placeholder="Description (optionnel)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full input-warm p-3 rounded-xl text-sm sm:text-base"
                rows={2}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border rounded-xl text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-luxe px-8 py-3 disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? "Enregistrement..." : "Enregistrer le produit"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher un produit (nom ou catégorie)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3.5 sm:p-4 rounded-2xl glass text-sm sm:text-base"
        />

        {/* Grille produits responsive */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 sm:p-12 text-center">
            <Package className="mx-auto mb-4 text-[#D4AF37]" size={48} />
            <p className="text-lg">Aucun produit trouvé</p>
            <p className="text-sm text-[#5C4033]/60 mt-2">
              {searchTerm ? "Essayez une autre recherche" : "Ajoutez ou importez des produits"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((p) => {
              const isLowStock = p.quantity <= (p.lowStock || 5);
              return (
                <div key={p.id} className="glass rounded-2xl p-4 sm:p-5 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {p.imageUrl && (
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-10 h-10 object-cover rounded-lg border border-[#D4AF37]/20 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg text-[#3D2B1F] break-words">{p.name}</h3>
                          {p.category && <p className="text-xs sm:text-sm text-[#5C4033]/70 mt-0.5">{p.category}</p>}
                          {p.supplier && (
                            <p className="text-[10px] text-[#B87333] mt-0.5">Fournisseur: {p.supplier.name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[#B87333] font-bold whitespace-nowrap text-sm sm:text-base">
                      {formatPrice(p.price)} FCFA
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs sm:text-sm my-2.5 text-[#5C4033]/80 line-clamp-2">{p.description}</p>
                  )}

                  <div className="mt-auto pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs sm:text-sm font-medium ${isLowStock ? "text-red-600" : ""}`}>
                        Stock : {p.quantity}
                      </span>
                      {isLowStock && <AlertTriangle size={15} className="text-red-500" />}
                    </div>

                    {isAdmin(session?.user?.role) && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openRestock(p)}
                          className="text-xs sm:text-sm px-2.5 py-1 border border-[#D4AF37]/30 rounded-lg hover:bg-[#D4AF37]/10 flex items-center gap-1"
                        >
                          <TrendingUp size={13} /> Réappro
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs sm:text-sm px-2.5 py-1 border border-[#D4AF37]/30 rounded-lg hover:bg-[#D4AF37]/10 flex items-center gap-1"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id, p.name)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Supprimer"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Réappro */}
        {restockForm.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass p-6 rounded-2xl w-full max-w-md">
              <h3 className="font-semibold mb-4 text-xl">Réapprovisionner</h3>
              <p className="text-[#5C4033]/70 mb-4 break-words">{restockForm.productName}</p>

              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Quantité à ajouter</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 20"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Note (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Livraison fournisseur..."
                    value={restockForm.note}
                    onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockForm({ ...restockForm, open: false })}
                    className="flex-1 p-3 border rounded-xl text-sm sm:text-base"
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

        {/* ✅ Modal Édition Produit (Stock + Photo + Fournisseur) */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="glass p-6 rounded-2xl w-full max-w-lg">
              <h3 className="font-semibold mb-4 text-xl">Modifier le produit</h3>
              <p className="text-[#5C4033]/70 mb-4 break-words text-sm">{editingProduct.name}</p>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    placeholder="Nom du produit *"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                    required
                  />
                  <input
                    placeholder="Catégorie"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  />
                  <input
                    placeholder="Prix FCFA *"
                    type="number"
                    step="1"
                    min="1"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                    required
                  />
                  <input
                    placeholder="Quantité en stock"
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  />
                  <input
                    placeholder="Seuil alerte stock"
                    type="number"
                    min="0"
                    value={editForm.lowStock}
                    onChange={(e) => setEditForm({ ...editForm, lowStock: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  />
                  <select
                    value={editForm.supplierId}
                    onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  >
                    <option value="">Aucun fournisseur</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1">Photo (URL)</label>
                  <input
                    placeholder="https://exemple.com/photo.jpg"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  />
                  {editForm.imageUrl && (
                    <img 
                      src={editForm.imageUrl} 
                      alt="Aperçu" 
                      className="mt-2 w-20 h-20 object-cover rounded-lg border" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                <textarea
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#D4AF37]/20 text-sm sm:text-base"
                  rows={2}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="flex-1 p-3 border rounded-xl text-sm sm:text-base"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingEdit}
                    className="flex-1 p-3 btn-luxe text-sm sm:text-base disabled:opacity-70"
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
