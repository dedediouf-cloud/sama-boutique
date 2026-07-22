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
  Download,
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
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchProducts();
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
        }),
      });

      if (res.ok) {
        setForm({ name: "", description: "", price: "", quantity: "", lowStock: "5", category: "" });
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

  // ===================== ROBUST CSV IMPORT =====================
  // Gère ; ou , + guillemets + accents + colonnes flexibles (Excel FR)
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

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string) || "";
        const lines = text
          .trim()
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          alert("Fichier vide ou invalide (au moins 1 ligne d'en-têtes + 1 produit)");
          setImporting(false);
          return;
        }

        // Détection robuste du délimiteur (priorité ;)
        let delimiter = ",";
        if (lines[0].includes(";")) delimiter = ";";

        // Parse en-têtes (normalisation FR)
        const rawHeaders = parseCSVLine(lines[0], delimiter).map((h) =>
          h
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/"/g, "")
        );

        // Mapping flexible des colonnes (gère toutes les variantes)
        const getColumnIndex = (possibleNames: string[]): number => {
          for (let i = 0; i < rawHeaders.length; i++) {
            const h = rawHeaders[i];
            if (possibleNames.some((name) => h.includes(name))) {
              return i;
            }
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
          alert(
            "Colonne 'Nom du produit' introuvable.\nColonnes détectées: " +
              rawHeaders.join(", ") +
              "\n\nUtilisez le modèle CSV fourni."
          );
          setImporting(false);
          e.target.value = "";
          return;
        }

        const items: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i], delimiter);
          if (!cols[colIndex.name] || cols[colIndex.name].trim() === "") continue;

          const item = {
            name: cols[colIndex.name]?.trim() || "",
            category: colIndex.category >= 0 ? (cols[colIndex.category] || "").trim() : "",
            price: colIndex.price >= 0 ? cols[colIndex.price] : "0",
            quantity: colIndex.quantity >= 0 ? cols[colIndex.quantity] : "0",
            lowStock: colIndex.lowStock >= 0 ? cols[colIndex.lowStock] : "5",
            description: colIndex.description >= 0 ? (cols[colIndex.description] || "").trim() : "",
          };

          // Validation minimale
          if (item.name) {
            items.push({
              name: item.name,
              category: item.category || "",
              price: parseFloat(item.price.replace(",", ".")) || 0,
              quantity: parseInt(item.quantity) || 0,
              lowStock: parseInt(item.lowStock) || 5,
              description: item.description || "",
            });
          }
        }

        if (items.length === 0) {
          alert("Aucun produit valide trouvé dans le fichier.\nVérifiez les colonnes et les données.");
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
        alert("Erreur lors de l'import CSV : " + (err.message || "Vérifiez le format du fichier"));
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
  // ===================== END ROBUST CSV =====================

  // Télécharger un modèle CSV prêt à l'emploi
  const downloadCSVTemplate = () => {
    const headers = [
      "Nom du produit",
      "Catégorie",
      "Prix FCFA",
      "Quantité",
      "Seuil alerte stock",
      "Description",
    ];

    const sampleRows = [
      ["Savon artisanal", "Hygiène", "1500", "45", "10", "Savon naturel à base de karité"],
      ["Huile de baobab", "Beauté", "3500", "28", "5", "Huile pure pressée à froid"],
      ["Pagne wax", "Textile", "8500", "12", "3", "Tissu authentique 6 yards"],
    ];

    const csvContent = [
      headers.join(";"),
      ...sampleRows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

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
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-[#3D2B1F]">Gestion du stock</h1>
            <p className="text-[#5C4033]/70">{products.length} produit(s)</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {isAdmin(session?.user?.role) && (
              <>
                {/* Bouton Importer CSV */}
                <label className="px-5 py-3 border border-[#D4AF37]/40 text-[#B87333] rounded-xl flex items-center gap-2 cursor-pointer hover:bg-[#D4AF37]/10 transition btn-luxe">
                  <Upload size={18} />
                  {importing ? "Import en cours..." : "Importer CSV"}
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleCSVImport}
                    disabled={importing}
                  />
                </label>

                {/* Bouton Modèle CSV */}
                <button
                  onClick={downloadCSVTemplate}
                  className="px-5 py-3 border border-[#D4AF37]/30 text-[#5C4033] rounded-xl flex items-center gap-2 hover:bg-white/50 transition"
                >
                  <Download size={18} />
                  Modèle CSV
                </button>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="px-6 py-3 btn-luxe flex items-center gap-2"
                >
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                  {showForm ? "Annuler" : "Ajouter un produit"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulaire création produit - CORRIGÉ */}
        {showForm && (
          <div className="glass p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Nom du produit *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-warm p-3 rounded-xl"
                  required
                />
                <input
                  placeholder="Catégorie"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-warm p-3 rounded-xl"
                />
                <input
                  placeholder="Prix FCFA *"
                  type="number"
                  step="1"
                  min="1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input-warm p-3 rounded-xl"
                  required
                />
                <input
                  placeholder="Quantité en stock *"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="input-warm p-3 rounded-xl"
                  required
                />
                <input
                  placeholder="Seuil alerte stock"
                  type="number"
                  min="0"
                  value={form.lowStock}
                  onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                  className="input-warm p-3 rounded-xl"
                />
              </div>
              <textarea
                placeholder="Description (optionnel)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full input-warm p-3 rounded-xl"
                rows={2}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-luxe px-8 py-3 disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "Enregistrer le produit"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="Rechercher un produit (nom ou catégorie)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 rounded-2xl glass"
        />

        {/* Liste des produits */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Package className="mx-auto mb-4 text-[#D4AF37]" size={48} />
            <p className="text-lg">Aucun produit trouvé</p>
            <p className="text-sm text-[#5C4033]/60 mt-2">
              {searchTerm ? "Essayez une autre recherche" : "Ajoutez votre premier produit ou importez un CSV"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => {
              const isLowStock = p.quantity <= (p.lowStock || 5);
              return (
                <div key={p.id} className="glass rounded-2xl p-5 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-[#3D2B1F]">{p.name}</h3>
                      {p.category && (
                        <p className="text-sm text-[#5C4033]/70">{p.category}</p>
                      )}
                    </div>
                    <span className="text-[#B87333] font-bold whitespace-nowrap">
                      {formatPrice(p.price)} FCFA
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-sm my-3 text-[#5C4033]/80 line-clamp-2">{p.description}</p>
                  )}

                  <div className="mt-auto pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isLowStock ? "text-red-600" : ""}`}>
                        Stock : {p.quantity}
                      </span>
                      {isLowStock && <AlertTriangle size={16} className="text-red-500" />}
                    </div>

                    {isAdmin(session?.user?.role) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openRestock(p)}
                          className="text-sm px-3 py-1 border border-[#D4AF37]/30 rounded-lg hover:bg-[#D4AF37]/10 flex items-center gap-1"
                          title="Réapprovisionner"
                        >
                          <TrendingUp size={14} /> Réappro
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id, p.name)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Supprimer le produit"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Réapprovisionnement */}
        {restockForm.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="glass p-6 rounded-2xl w-full max-w-md">
              <h3 className="font-semibold mb-4 text-xl">Réapprovisionner</h3>
              <p className="text-[#5C4033]/70 mb-4">{restockForm.productName}</p>

              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Quantité à ajouter</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 20"
                    value={restockForm.quantity}
                    onChange={(e) =>
                      setRestockForm({ ...restockForm, quantity: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20"
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
                    className="w-full p-3 rounded-xl border border-[#D4AF37]/20"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockForm({ ...restockForm, open: false })}
                    className="flex-1 p-3 border rounded-xl"
                  >
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 p-3 btn-luxe">
                    Valider l'ajout
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
