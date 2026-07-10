"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import { formatPrice } from "@/lib/utils";
import {
  Tag,
  Plus,
  X,
  Percent,
  Banknote,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  Gift,
  Sparkles,
} from "lucide-react";

export default function PromotionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "percentage",
    value: "",
    minAmount: "",
    startDate: "",
    endDate: "",
    active: true,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (session?.user?.role && !isAdmin(session.user.role)) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const fetchPromotions = () => {
    fetch("/api/promotions")
      .then((res) => res.json())
      .then((data) => setPromotions(data));
  };

  useEffect(() => {
    if (isAdmin(session?.user?.role)) {
      fetchPromotions();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: parseFloat(form.value),
        minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      }),
    });

    if (res.ok) {
      setForm({
        name: "",
        code: "",
        type: "percentage",
        value: "",
        minAmount: "",
        startDate: "",
        endDate: "",
        active: true,
      });
      setShowForm(false);
      fetchPromotions();
    } else {
      const error = await res.json();
      alert(error.error || "Erreur lors de la création");
    }
  };

  const toggleActive = async (promotion: any) => {
    await fetch(`/api/promotions/${promotion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promotion.active }),
    });
    fetchPromotions();
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    fetchPromotions();
  };

  if (!isAdmin(session?.user?.role)) return null;

  const filteredPromotions = promotions.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Moteur de promotions
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Tag size={16} className="text-[#B87333]" />
              {promotions.length} promotion{sPlural(promotions.length)} créée{sPlural(promotions.length)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Annuler" : "Nouvelle promotion"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Sparkles size={18} className="text-[#B87333]" />
              </span>
              Créer une promotion
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom de la promotion</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Code promo (optionnel)</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    placeholder="SOLDES20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed_amount">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">
                    {form.type === "percentage" ? "Valeur en %" : "Valeur en FCFA"}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Montant minimum d&apos;achat</label>
                  <input
                    type="number"
                    value={form.minAmount}
                    onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                      <Calendar size={14} /> Début
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                      <Calendar size={14} /> Fin
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Créer la promotion
              </button>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher une promotion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Promotions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 perspective-1000">
          {filteredPromotions.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5 tilt-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                    {p.type === "percentage" ? <Percent size={20} className="text-[#B87333]" /> : <Banknote size={20} className="text-[#B87333]" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#3D2B1F]">{p.name}</h3>
                    {p.code && (
                      <p className="text-xs text-[#B87333] font-medium bg-[#D4AF37]/10 px-2 py-0.5 rounded mt-1 inline-block">
                        Code: {p.code}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleActive(p)} className="text-[#B87333] hover:text-[#5C4033] transition-colors">
                  {p.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-2xl font-bold text-[#B87333] font-[family-name:var(--font-playfair)]">
                  {p.type === "percentage" ? `-${p.value}%` : `-${formatPrice(p.value)} FCFA`}
                </p>
                <p className="text-sm text-[#5C4033]">
                  Type: {p.type === "percentage" ? "Pourcentage" : "Montant fixe"}
                </p>
                {p.minAmount > 0 && (
                  <p className="text-sm text-[#5C4033]/70">
                    Minimum: {formatPrice(p.minAmount)} FCFA
                  </p>
                )}
                {(p.startDate || p.endDate) && (
                  <p className="text-xs text-[#5C4033]/60 flex items-center gap-1">
                    <Calendar size={12} />
                    {p.startDate ? new Date(p.startDate).toLocaleDateString("fr-FR") : "Illimité"} → {p.endDate ? new Date(p.endDate).toLocaleDateString("fr-FR") : "Illimité"}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#D4AF37]/10">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.active
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-[#FDF6E3]/80 text-[#5C4033]/60 border border-[#D4AF37]/20"
                }`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => deletePromotion(p.id)}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPromotions.length === 0 && (
          <div className="text-center py-16 text-[#5C4033]/60">
            <Gift size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-lg">Aucune promotion trouvée</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
