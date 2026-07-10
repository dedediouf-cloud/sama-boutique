"use client";

import { useEffect, useState } from "react";
import { SuperAdminProtectedRoute } from "@/components/SuperAdminProtectedRoute";
import {
  Store,
  Mail,
  Phone,
  Package,
  Users,
  ShoppingCart,
  ExternalLink,
  KeyRound,
  Crown,
  Sparkles,
  Trash2,
  Lock,
  Unlock,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertCircle,
  Coins,
  CheckCircle,
  Plus,
  Tag,
  Gift,
  X,
  Banknote,
  Settings,
  Link as LinkIcon,
  Repeat,
  UserPlus,
  Search,
} from "lucide-react";
import { getAnnualAmount } from "@/lib/subscription";

interface Boutique {
  id: string;
  name: string | null;
  email: string;
  shopName: string;
  shopSlug: string;
  phone: string | null;
  isBlocked: boolean;
  subscriptionAmount: number;
  subscriptionStatus: string;
  subscriptionDueDate: string | null;
  lastPaidAt: string | null;
  billingInterval: string;
  referralCode: string;
  referredById: string | null;
  createdAt: string;
  _count: {
    products: number;
    customers: number;
    sales: number;
    referralsMade: number;
    referralRewards: number;
  };
}

interface GlobalSettings {
  id: string;
  annualSubscriptionDiscount: number;
  referralRewardMonths: number;
  defaultMonthlyAmount: number;
}

interface SubscriptionPromotion {
  id: string;
  name: string;
  code: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  monthsFree: number;
  active: boolean;
}

interface SubscriptionPayment {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  promotionName: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  user: {
    shopName: string;
    shopSlug: string;
    email: string;
  };
}

export default function SuperAdminDashboard() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [promotions, setPromotions] = useState<SubscriptionPromotion[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
    shopSlug: "",
    phone: "",
    subscriptionAmount: "10000",
    billingInterval: "monthly",
  });
  const [promoForm, setPromoForm] = useState({
    name: "",
    code: "",
    discountPercent: "",
    discountAmount: "",
    monthsFree: "0",
  });
  const [settingsForm, setSettingsForm] = useState({
    annualSubscriptionDiscount: "0",
    referralRewardMonths: "1",
    defaultMonthlyAmount: "10000",
  });
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBoutiques = boutiques.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.shopName.toLowerCase().includes(term) ||
      b.shopSlug.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term) ||
      (b.phone || "").toLowerCase().includes(term) ||
      b.referralCode.toLowerCase().includes(term)
    );
  });

  const fetchBoutiques = async () => {
    try {
      const res = await fetch("/api/superadmin/boutiques");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setBoutiques(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch("/api/superadmin/subscription-promotions");
      if (!res.ok) throw new Error("Erreur promotions");
      const data = await res.json();
      setPromotions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/superadmin/subscription-payments");
      if (!res.ok) throw new Error("Erreur paiements");
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/superadmin/settings");
      if (!res.ok) throw new Error("Erreur paramètres");
      const data = await res.json();
      setSettings(data);
      setSettingsForm({
        annualSubscriptionDiscount: (data.annualSubscriptionDiscount || 0).toString(),
        referralRewardMonths: (data.referralRewardMonths || 1).toString(),
        defaultMonthlyAmount: (data.defaultMonthlyAmount || 10000).toString(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchBoutiques(), fetchPromotions(), fetchPayments(), fetchSettings()]).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage("");

    const res = await fetch("/api/superadmin/boutiques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();
    setCreating(false);

    if (res.ok) {
      setMessage("Boutique créée avec succès");
      setForm({ name: "", email: "", password: "", shopName: "", shopSlug: "", phone: "", subscriptionAmount: "10000", billingInterval: "monthly" });
      fetchBoutiques();
    } else {
      setMessage(result.error || "Erreur lors de la création");
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPromo(true);
    setMessage("");

    const res = await fetch("/api/superadmin/subscription-promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: promoForm.name,
        code: promoForm.code || null,
        discountPercent: promoForm.discountPercent || null,
        discountAmount: promoForm.discountAmount || null,
        monthsFree: promoForm.monthsFree || "0",
      }),
    });

    const result = await res.json();
    setCreatingPromo(false);

    if (res.ok) {
      setMessage("Promotion créée avec succès");
      setPromoForm({ name: "", code: "", discountPercent: "", discountAmount: "", monthsFree: "0" });
      setShowPromoForm(false);
      fetchPromotions();
    } else {
      setMessage(result.error || "Erreur lors de la création de la promotion");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage("");

    const res = await fetch("/api/superadmin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annualSubscriptionDiscount: settingsForm.annualSubscriptionDiscount,
        referralRewardMonths: settingsForm.referralRewardMonths,
        defaultMonthlyAmount: settingsForm.defaultMonthlyAmount,
      }),
    });

    const result = await res.json();
    setSavingSettings(false);

    if (res.ok) {
      setMessage("Paramètres mis à jour");
      setShowSettingsForm(false);
      fetchSettings();
    } else {
      setMessage(result.error || "Erreur lors de la mise à jour des paramètres");
    }
  };

  const resetPassword = async (id: string) => {
    const newPassword = prompt("Nouveau mot de passe :");
    if (!newPassword) return;

    const res = await fetch(`/api/superadmin/boutiques/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });

    const result = await res.json();
    alert(result.message || result.error || "Mot de passe mis à jour");
  };

  const toggleBlock = async (id: string, current: boolean) => {
    const action = current ? "débloquer" : "bloquer";
    if (!confirm(`Voulez-vous vraiment ${action} cette boutique ?`)) return;

    const res = await fetch(`/api/superadmin/boutiques/${id}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: !current }),
    });

    const result = await res.json();
    if (res.ok) {
      setMessage(result.message);
      fetchBoutiques();
    } else {
      alert(result.error || "Erreur lors du blocage");
    }
  };

  const deleteBoutique = async (id: string, shopName: string) => {
    if (!confirm(`ATTENTION : la suppression est définitive.\n\nVoulez-vous vraiment supprimer la boutique « ${shopName} » et toutes ses données ?`)) return;

    const res = await fetch(`/api/superadmin/boutiques/${id}`, {
      method: "DELETE",
    });

    const result = await res.json();
    if (res.ok) {
      setMessage(result.message);
      fetchBoutiques();
      fetchPayments();
    } else {
      alert(result.error || "Erreur lors de la suppression");
    }
  };

  const paySubscription = async (id: string, shopName: string) => {
    const boutique = boutiques.find((b) => b.id === id);
    const code = prompt("Code promo (optionnel) :");
    const promotion = promotions.find((p) => p.code === code && p.active);

    if (code && !promotion) {
      alert("Code promo non trouvé ou inactif.");
      return;
    }

    if (!confirm(`Marquer l'abonnement de « ${shopName} » comme payé${promotion ? ` avec la promotion « ${promotion.name} »` : ""} ?`)) return;

    const res = await fetch(`/api/superadmin/boutiques/${id}/pay-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotionId: promotion?.id }),
    });

    const result = await res.json();
    if (res.ok) {
      setMessage(result.message);
      fetchBoutiques();
      fetchPayments();
    } else {
      alert(result.error || "Erreur lors du paiement");
    }
  };

  const changeBillingInterval = async (id: string, current: string) => {
    const next = current === "annual" ? "monthly" : "annual";
    if (!confirm(`Passer cette boutique en abonnement ${next === "annual" ? "annuel" : "mensuel"} ?`)) return;

    const res = await fetch(`/api/superadmin/boutiques/${id}/billing-interval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingInterval: next }),
    });

    const result = await res.json();
    if (res.ok) {
      setMessage(result.message);
      fetchBoutiques();
    } else {
      alert(result.error || "Erreur lors du changement d'intervalle");
    }
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("Lien de parrainage copié : " + link);
    });
  };

  // Statistiques
  const totalBoutiques = boutiques.length;
  const activeBoutiques = boutiques.filter((b) => !b.isBlocked).length;
  const blockedBoutiques = boutiques.filter((b) => b.isBlocked).length;
  const totalProducts = boutiques.reduce((sum, b) => sum + (b._count?.products || 0), 0);
  const totalCustomers = boutiques.reduce((sum, b) => sum + (b._count?.customers || 0), 0);
  const totalSales = boutiques.reduce((sum, b) => sum + (b._count?.sales || 0), 0);
  const totalRecurring = boutiques
    .filter((b) => !b.isBlocked)
    .reduce((sum, b) => sum + (b.subscriptionAmount || 0), 0);
  const totalSubscriptionRevenue = payments.reduce((sum, p) => sum + (p.finalAmount || 0), 0);
  const paidCount = boutiques.filter((b) => b.subscriptionStatus === "paid" && !b.isBlocked).length;
  const overdueCount = boutiques.filter((b) => {
    if (b.isBlocked) return false;
    if (!b.subscriptionDueDate) return true;
    return new Date(b.subscriptionDueDate) < new Date();
  }).length;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("fr-FR");
  };

  const formatDateTime = (date: string) => new Date(date).toLocaleString("fr-FR");

  const isOverdue = (boutique: Boutique) => {
    if (boutique.isBlocked) return false;
    if (!boutique.subscriptionDueDate) return true;
    return new Date(boutique.subscriptionDueDate) < new Date();
  };

  const formatDiscount = (promo: SubscriptionPromotion) => {
    if (promo.discountPercent) return `${promo.discountPercent}%`;
    if (promo.discountAmount) return `${promo.discountAmount.toLocaleString("fr-FR")} FCFA`;
    if (promo.monthsFree > 0) return `${promo.monthsFree} mois gratuit${promo.monthsFree > 1 ? "s" : ""}`;
    return "-";
  };

  return (
    <SuperAdminProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#3D2B1F]">
                Tableau de bord Super Admin
              </h1>
              <p className="text-[#5C4033] text-sm">Suivi complet de vos boutiques, abonnements et campagnes promotionnelles</p>
            </div>
          </div>
          <div className="glass rounded-2xl px-5 py-2.5 flex items-center gap-2 text-sm text-[#5C4033]">
            <Sparkles size={16} className="text-[#D4AF37]" />
            <span>{totalBoutiques} boutique{sPlural(totalBoutiques)}</span>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl mb-6 text-sm ${message.includes("succès") || message.includes("payé") || message.includes("bloquée") || message.includes("débloquée") || message.includes("créée") ? "bg-green-50/80 border border-green-200 text-green-700" : "bg-red-50/80 border border-red-200 text-red-600"}`}>
            {message}
          </div>
        )}

        {/* Dashboard stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={Store} label="Boutiques totales" value={totalBoutiques} gradient="from-[#D4AF37]/20 to-[#B87333]/10" />
          <StatCard icon={CheckCircle} label="Boutiques actives" value={activeBoutiques} gradient="from-green-100/50 to-green-50/30" />
          <StatCard icon={Lock} label="Boutiques bloquées" value={blockedBoutiques} gradient="from-red-100/50 to-red-50/30" />
          <StatCard icon={Package} label="Produits enregistrés" value={totalProducts} gradient="from-[#B87333]/20 to-[#D4AF37]/10" />
          <StatCard icon={Users} label="Clients" value={totalCustomers} gradient="from-[#C9A9A6]/20 to-[#D4AF37]/10" />
          <StatCard icon={ShoppingCart} label="Ventes" value={totalSales} gradient="from-[#D4AF37]/20 to-[#C9A9A6]/10" />
          <StatCard icon={Coins} label="MRR abonnements" value={`${totalRecurring.toLocaleString("fr-FR")} FCFA`} gradient="from-[#B76E79]/20 to-[#D4A5A5]/10" />
          <StatCard icon={Banknote} label="CA abonnements" value={`${totalSubscriptionRevenue.toLocaleString("fr-FR")} FCFA`} gradient="from-[#B87333]/20 to-[#D4AF37]/10" />
          <StatCard icon={AlertCircle} label="Abonnements en retard" value={overdueCount} gradient="from-orange-100/50 to-orange-50/30" />
          <StatCard icon={Gift} label="Promotions actives" value={promotions.filter((p) => p.active).length} gradient="from-[#D4AF37]/20 to-[#B87333]/10" />
        </div>

        {/* Global settings card */}
        <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Settings size={18} className="text-[#B87333]" />
              </span>
              Paramètres globaux
            </h2>
            <button
              onClick={() => setShowSettingsForm(!showSettingsForm)}
              className="px-4 py-2 rounded-xl btn-luxe text-sm font-medium flex items-center gap-2"
            >
              {showSettingsForm ? <X size={16} /> : <Settings size={16} />}
              {showSettingsForm ? "Annuler" : "Modifier"}
            </button>
          </div>

          {showSettingsForm ? (
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Réduction abonnement annuel (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={settingsForm.annualSubscriptionDiscount}
                  onChange={(e) => setSettingsForm({ ...settingsForm, annualSubscriptionDiscount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Mois gratuits offerts par parrainage</label>
                <input
                  type="number"
                  min="0"
                  placeholder="1"
                  value={settingsForm.referralRewardMonths}
                  onChange={(e) => setSettingsForm({ ...settingsForm, referralRewardMonths: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Montant mensuel par défaut (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={settingsForm.defaultMonthlyAmount}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultMonthlyAmount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 rounded-xl btn-luxe font-medium disabled:opacity-60"
                >
                  {savingSettings ? "Enregistrement..." : "Enregistrer les paramètres"}
                </button>
              </div>
            </form>
          ) : settings ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="rounded-xl bg-[#FDF8F3]/60 p-4 border border-[#D4AF37]/10">
                <p className="text-xs text-[#5C4033]/70 mb-1">Réduction annuelle</p>
                <p className="text-lg font-semibold text-[#3D2B1F]">{settings.annualSubscriptionDiscount}%</p>
              </div>
              <div className="rounded-xl bg-[#FDF8F3]/60 p-4 border border-[#D4AF37]/10">
                <p className="text-xs text-[#5C4033]/70 mb-1">Récompense parrainage</p>
                <p className="text-lg font-semibold text-[#3D2B1F]">{settings.referralRewardMonths} mois gratuit</p>
              </div>
              <div className="rounded-xl bg-[#FDF8F3]/60 p-4 border border-[#D4AF37]/10">
                <p className="text-xs text-[#5C4033]/70 mb-1">Montant mensuel par défaut</p>
                <p className="text-lg font-semibold text-[#3D2B1F]">{settings.defaultMonthlyAmount.toLocaleString("fr-FR")} FCFA</p>
              </div>
            </div>
          ) : (
            <p className="text-[#5C4033]/60 text-sm">Chargement des paramètres...</p>
          )}
        </div>

        {/* Create boutique card */}
        <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
              <Store size={18} className="text-[#B87333]" />
            </span>
            Créer une nouvelle boutique
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom du gérant</label>
              <input
                type="text"
                placeholder="Aminata Diop"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Email de connexion</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                <input
                  type="email"
                  placeholder="boutique@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="Mot de passe temporaire"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom de la boutique</label>
              <input
                type="text"
                placeholder="Boutique Élégance"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Slug</label>
              <input
                type="text"
                placeholder="beauty-dakar"
                value={form.shopSlug}
                onChange={(e) => setForm({ ...form, shopSlug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">WhatsApp</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                <input
                  type="tel"
                  placeholder="+221771234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Abonnement mensuel (FCFA)</label>
              <div className="relative">
                <Coins size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                <input
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={form.subscriptionAmount}
                  onChange={(e) => setForm({ ...form, subscriptionAmount: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Intervalle de facturation</label>
              <select
                value={form.billingInterval}
                onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              >
                <option value="monthly">Mensuel</option>
                <option value="annual">Annuel</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-8 py-3.5 rounded-xl btn-luxe font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Création..." : "Créer la boutique"}
              </button>
            </div>
          </form>
        </div>

        {/* Boutiques list */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="p-6 border-b border-[#D4AF37]/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
                Suivi des boutiques
              </h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-xs text-[#5C4033]/70">
                  {filteredBoutiques.length} / {boutiques.length} boutique{sPlural(filteredBoutiques.length)}
                </span>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                  <input
                    type="text"
                    placeholder="Rechercher une boutique..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-xl input-warm text-sm text-[#3D2B1F] w-full sm:w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
              <p className="text-[#5C4033]">Chargement des boutiques...</p>
            </div>
          ) : error ? (
            <p className="p-6 text-red-600">{error}</p>
          ) : filteredBoutiques.length === 0 ? (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Store size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
              <p>{searchTerm ? "Aucune boutique ne correspond à votre recherche" : "Aucune boutique pour le moment"}</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead className="bg-[#FDF6E3]/50 text-left">
                    <tr>
                    <th className="sticky left-0 z-10 bg-[#FDF6E3]/95 px-6 py-4 font-semibold text-[#5C4033] shadow-sm">Boutique</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Intervalle</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Parrainage</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Abonnement</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033] text-center">Produits</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033] text-center">Clients</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033] text-center">Ventes</th>
                      <th className="px-6 py-4 font-semibold text-[#5C4033]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10">
                    {filteredBoutiques.map((boutique) => (
                      <tr key={`desktop-${boutique.id}`} className="group hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                        <td className="sticky left-0 z-10 bg-white/95 group-hover:bg-[#FDF6E3]/95 px-6 py-5 shadow-sm">
                          <div className="font-semibold text-[#3D2B1F]">{boutique.shopName}</div>
                          <div className="text-[#B87333] text-xs font-medium">{boutique.shopSlug}</div>
                          <div className="text-xs text-[#5C4033]/70 mt-1">{boutique.email}</div>
                          <div className="text-xs text-[#5C4033]/60">{boutique.phone || "-"}</div>
                          {boutique.isBlocked && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                              <Lock size={10} /> Bloquée
                            </span>
                          )}
                          {isOverdue(boutique) && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100 ml-2">
                              <AlertCircle size={10} /> En retard
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            boutique.billingInterval === "annual"
                              ? "bg-[#D4AF37]/10 text-[#B87333] border border-[#D4AF37]/20"
                              : "bg-[#B87333]/10 text-[#B87333] border border-[#B87333]/20"
                          }`}>
                            <Repeat size={12} />
                            {boutique.billingInterval === "annual" ? "Annuel" : "Mensuel"}
                          </span>
                          <button
                            onClick={() => changeBillingInterval(boutique.id, boutique.billingInterval)}
                            className="block mt-2 text-xs text-[#B87333] hover:text-[#5C4033] font-medium transition-colors"
                          >
                            Changer
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs text-[#5C4033]/70">Code</div>
                          <div className="font-mono text-sm font-medium text-[#3D2B1F] mb-1">{boutique.referralCode}</div>
                          <div className="flex items-center gap-3 text-xs text-[#5C4033]/80">
                            <span className="inline-flex items-center gap-1">
                              <UserPlus size={12} /> {boutique._count.referralsMade} filleul
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Gift size={12} /> {boutique._count.referralRewards} récompense
                            </span>
                          </div>
                          <button
                            onClick={() => copyReferralLink(boutique.referralCode)}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-[#B87333] hover:text-[#5C4033] font-medium transition-colors"
                          >
                            <LinkIcon size={12} />
                            Copier le lien
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-[#3D2B1F]">
                            {boutique.subscriptionAmount.toLocaleString("fr-FR")} FCFA/mois
                          </div>
                          {boutique.billingInterval === "annual" && settings && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              Annuel : {getAnnualAmount(boutique.subscriptionAmount, settings.annualSubscriptionDiscount).toLocaleString("fr-FR")} FCFA
                              {settings.annualSubscriptionDiscount > 0 && (
                                <span className="ml-1 text-[#5C4033]/70">(-{settings.annualSubscriptionDiscount}%)</span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-[#5C4033]/70 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            Échéance : {formatDate(boutique.subscriptionDueDate)}
                          </div>
                          <div className="text-xs text-[#5C4033]/70 flex items-center gap-1 mt-0.5">
                            <CreditCard size={12} />
                            Statut :
                            <span className={`font-medium ${
                              boutique.subscriptionStatus === "paid" ? "text-green-600" : "text-orange-600"
                            }`}>
                              {boutique.subscriptionStatus === "paid" ? "Payé" : "En attente"}
                            </span>
                          </div>
                          {boutique.lastPaidAt && (
                            <div className="text-xs text-[#5C4033]/60 mt-0.5">
                              Dernier paiement : {formatDate(boutique.lastPaidAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#B87333] font-medium">
                            <Package size={14} /> {boutique._count.products}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B87333]/10 text-[#B87333] font-medium">
                            <Users size={14} /> {boutique._count.customers}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C5A028]/10 text-[#C5A028] font-medium">
                            <ShoppingCart size={14} /> {boutique._count.sales}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => paySubscription(boutique.id, boutique.shopName)}
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium transition-colors"
                            >
                              <TrendingUp size={14} />
                              Payer
                            </button>
                            <button
                              onClick={() => toggleBlock(boutique.id, boutique.isBlocked)}
                              className={`inline-flex items-center gap-1 font-medium transition-colors ${
                                boutique.isBlocked
                                  ? "text-green-600 hover:text-green-700"
                                  : "text-amber-600 hover:text-amber-700"
                              }`}
                            >
                              {boutique.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                              {boutique.isBlocked ? "Débloquer" : "Bloquer"}
                            </button>
                            <button
                              onClick={() => resetPassword(boutique.id)}
                              className="inline-flex items-center gap-1 text-[#B87333] hover:text-[#5C4033] font-medium transition-colors"
                            >
                              <KeyRound size={14} />
                              Mot de passe
                            </button>
                            <a
                              href={`/catalog/${boutique.shopSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#B87333] hover:text-[#5C4033] font-medium transition-colors"
                            >
                              <ExternalLink size={14} />
                              Catalogue
                            </a>
                            <button
                              onClick={() => deleteBoutique(boutique.id, boutique.shopName)}
                              className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 font-medium transition-colors"
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {filteredBoutiques.map((boutique) => (
                  <div key={`mobile-${boutique.id}`} className="glass rounded-2xl p-4 bg-white/50 border border-[#D4AF37]/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#3D2B1F]">{boutique.shopName}</h3>
                        <p className="text-xs text-[#B87333] font-medium">{boutique.shopSlug}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isOverdue(boutique) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">
                            <AlertCircle size={10} /> En retard
                          </span>
                        )}
                        {boutique.isBlocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                            <Lock size={10} /> Bloquée
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#FDF8F3]/60 p-3 border border-[#D4AF37]/10">
                        <div className="text-xs text-[#5C4033]/70 mb-1">Intervalle</div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            boutique.billingInterval === "annual"
                              ? "bg-[#D4AF37]/10 text-[#B87333] border border-[#D4AF37]/20"
                              : "bg-[#B87333]/10 text-[#B87333] border border-[#B87333]/20"
                          }`}>
                            <Repeat size={12} />
                            {boutique.billingInterval === "annual" ? "Annuel" : "Mensuel"}
                          </span>
                          <button
                            onClick={() => changeBillingInterval(boutique.id, boutique.billingInterval)}
                            className="text-xs text-[#B87333] hover:text-[#5C4033] font-medium"
                          >
                            Changer
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#FDF8F3]/60 p-3 border border-[#D4AF37]/10">
                        <div className="text-xs text-[#5C4033]/70 mb-1">Parrainage</div>
                        <div className="font-mono text-sm font-medium text-[#3D2B1F]">{boutique.referralCode}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#5C4033]/80">
                          <span className="inline-flex items-center gap-1">
                            <UserPlus size={12} /> {boutique._count.referralsMade}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Gift size={12} /> {boutique._count.referralRewards}
                          </span>
                        </div>
                        <button
                          onClick={() => copyReferralLink(boutique.referralCode)}
                          className="mt-2 text-xs text-[#B87333] hover:text-[#5C4033] font-medium inline-flex items-center gap-1"
                        >
                          <LinkIcon size={12} /> Copier le lien
                        </button>
                      </div>

                      <div className="rounded-xl bg-[#FDF8F3]/60 p-3 border border-[#D4AF37]/10 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#5C4033]/70">Abonnement</span>
                          <span className="font-semibold text-[#3D2B1F] text-sm">
                            {boutique.subscriptionAmount.toLocaleString("fr-FR")} FCFA/mois
                          </span>
                        </div>
                        {boutique.billingInterval === "annual" && settings && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            Annuel : {getAnnualAmount(boutique.subscriptionAmount, settings.annualSubscriptionDiscount).toLocaleString("fr-FR")} FCFA
                            {settings.annualSubscriptionDiscount > 0 && (
                              <span className="ml-1 text-[#5C4033]/70">(-{settings.annualSubscriptionDiscount}%)</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-[#5C4033]/70 flex items-center gap-1">
                            <Calendar size={12} /> Échéance : {formatDate(boutique.subscriptionDueDate)}
                          </span>
                          <span className={`font-medium ${
                            boutique.subscriptionStatus === "paid" ? "text-green-600" : "text-orange-600"
                          }`}>
                            {boutique.subscriptionStatus === "paid" ? "Payé" : "En attente"}
                          </span>
                        </div>
                        {boutique.lastPaidAt && (
                          <div className="text-xs text-[#5C4033]/60 mt-1">
                            Dernier paiement : {formatDate(boutique.lastPaidAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-[#D4AF37]/10 p-2 text-center">
                        <Package size={16} className="mx-auto text-[#B87333] mb-1" />
                        <div className="text-sm font-semibold text-[#3D2B1F]">{boutique._count.products}</div>
                        <div className="text-[10px] text-[#5C4033]/70">Produits</div>
                      </div>
                      <div className="rounded-xl bg-[#B87333]/10 p-2 text-center">
                        <Users size={16} className="mx-auto text-[#B87333] mb-1" />
                        <div className="text-sm font-semibold text-[#3D2B1F]">{boutique._count.customers}</div>
                        <div className="text-[10px] text-[#5C4033]/70">Clients</div>
                      </div>
                      <div className="rounded-xl bg-[#C5A028]/10 p-2 text-center">
                        <ShoppingCart size={16} className="mx-auto text-[#C5A028] mb-1" />
                        <div className="text-sm font-semibold text-[#3D2B1F]">{boutique._count.sales}</div>
                        <div className="text-[10px] text-[#5C4033]/70">Ventes</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-[#5C4033]/70">
                      <div>{boutique.email}</div>
                      <div>{boutique.phone || "-"}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => paySubscription(boutique.id, boutique.shopName)}
                        className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium border border-green-100 inline-flex items-center gap-1"
                      >
                        <TrendingUp size={12} /> Payer
                      </button>
                      <button
                        onClick={() => toggleBlock(boutique.id, boutique.isBlocked)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1 ${
                          boutique.isBlocked
                            ? "bg-green-50 text-green-600 border-green-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                      >
                        {boutique.isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                        {boutique.isBlocked ? "Débloquer" : "Bloquer"}
                      </button>
                      <button
                        onClick={() => resetPassword(boutique.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#FDF8F3] text-[#B87333] text-xs font-medium border border-[#D4AF37]/20 inline-flex items-center gap-1"
                      >
                        <KeyRound size={12} /> Mot de passe
                      </button>
                      <a
                        href={`/catalog/${boutique.shopSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#FDF8F3] text-[#B87333] text-xs font-medium border border-[#D4AF37]/20 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Catalogue
                      </a>
                      <button
                        onClick={() => deleteBoutique(boutique.id, boutique.shopName)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium border border-red-100 inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Subscription promotions */}
        <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <Tag size={18} className="text-[#B87333]" />
              </span>
              Campagnes promotionnelles abonnements
            </h2>
            <button
              onClick={() => setShowPromoForm(!showPromoForm)}
              className="px-4 py-2 rounded-xl btn-luxe text-sm font-medium flex items-center gap-2"
            >
              {showPromoForm ? <X size={16} /> : <Plus size={16} />}
              {showPromoForm ? "Annuler" : "Nouvelle promotion"}
            </button>
          </div>

          {showPromoForm && (
            <form onSubmit={handleCreatePromotion} className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 p-5 rounded-2xl bg-[#FDF8F3]/60 border border-[#D4AF37]/10">
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom de la promotion</label>
                <input
                  type="text"
                  placeholder="Offre de lancement"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Code promo (optionnel)</label>
                <input
                  type="text"
                  placeholder="PROMO20"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Remise en % (optionnel)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="20"
                  value={promoForm.discountPercent}
                  onChange={(e) => setPromoForm({ ...promoForm, discountPercent: e.target.value, discountAmount: "" })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Remise en FCFA (optionnel)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="1000"
                  value={promoForm.discountAmount}
                  onChange={(e) => setPromoForm({ ...promoForm, discountAmount: e.target.value, discountPercent: "" })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Mois gratuits</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={promoForm.monthsFree}
                  onChange={(e) => setPromoForm({ ...promoForm, monthsFree: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="px-6 py-3 rounded-xl btn-luxe font-medium disabled:opacity-60"
                >
                  {creatingPromo ? "Création..." : "Créer la promotion"}
                </button>
              </div>
            </form>
          )}

          {promotions.length === 0 ? (
            <p className="text-[#5C4033]/60 text-sm">Aucune promotion pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FDF6E3]/50 text-left">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Promotion</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Code</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Avantage</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                      <td className="px-6 py-4 font-medium text-[#3D2B1F]">{promo.name}</td>
                      <td className="px-6 py-4 text-[#5C4033]">{promo.code || "-"}</td>
                      <td className="px-6 py-4 text-[#5C4033]">{formatDiscount(promo)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          promo.active ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-50 text-gray-500 border border-gray-100"
                        }`}>
                          {promo.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subscription payments history */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="p-6 border-b border-[#D4AF37]/20">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#B87333]" />
              Historique des paiements d'abonnements
            </h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Banknote size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
              <p>Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FDF6E3]/50 text-left">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Date</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Boutique</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Montant</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Remise</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Payé</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Promotion</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Période</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                      <td className="px-6 py-4 text-[#5C4033]">{formatDateTime(p.paidAt)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#3D2B1F]">{p.user.shopName}</div>
                        <div className="text-xs text-[#5C4033]/60">{p.user.email}</div>
                      </td>
                      <td className="px-6 py-4 text-[#5C4033]">{p.amount.toLocaleString("fr-FR")} FCFA</td>
                      <td className="px-6 py-4 text-[#5C4033]">{p.discount > 0 ? `-${p.discount.toLocaleString("fr-FR")} FCFA` : "-"}</td>
                      <td className="px-6 py-4 font-semibold text-[#B87333]">{p.finalAmount.toLocaleString("fr-FR")} FCFA</td>
                      <td className="px-6 py-4 text-[#5C4033]">{p.promotionName || "-"}</td>
                      <td className="px-6 py-4 text-[#5C4033]">
                        {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <div className={`glass rounded-2xl p-5 bg-gradient-to-br ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#5C4033]/80 mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#3D2B1F] font-[family-name:var(--font-playfair)]">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#FDF8F3]/80 flex items-center justify-center shadow-sm text-[#B87333]">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
