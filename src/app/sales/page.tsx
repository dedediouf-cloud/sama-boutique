"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/lib/utils";
import { isAdmin } from "@/lib/roles";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  Tag,
  CreditCard,
  Smartphone,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Package,
  History,
} from "lucide-react";

const paymentLabels: Record<string, string> = {
  cash: "Espèces",
  orange_money: "Orange Money",
  wave: "Wave",
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-[#B87333]" },
  paid: { label: "Payé", color: "text-green-600" },
  failed: { label: "Échoué", color: "text-red-600" },
  cancelled: { label: "Annulée", color: "text-red-600" },
};

const productIcons = ["✨", "🎁", "💎", "🛍️", "🌟", "🏺", "🕯️", "🧴", "👜", "🧣"];

export default function SalesPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedPromotion, setSelectedPromotion] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [cart, setCart] = useState<{ productId: string; quantity: number; price: number; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [submittingSale, setSubmittingSale] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchSales();
    fetchPromotions();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setProducts(data);
      else setError(data.error || "Erreur lors du chargement des produits");
    } catch (err) {
      setError("Erreur de connexion");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error("Erreur clients:", err);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSales(data);
    } catch (err) {
      console.error("Erreur ventes:", err);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setPromotions(data.filter((p: any) => p.active));
    } catch (err) {
      console.error("Erreur promotions:", err);
    }
  };

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = cart.find((item) => item.productId === productId);
    if (existing) {
      setCart(cart.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { productId, quantity: 1, price: product.price, name: product.name }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
    } else {
      setCart(cart.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const promotion = promotions.find((p) => p.id === selectedPromotion);
  let discount = 0;
  if (promotion && subtotal > 0) {
    const now = new Date();
    const start = promotion.startDate ? new Date(promotion.startDate) : null;
    const end = promotion.endDate ? new Date(promotion.endDate) : null;
    const valid = (!start || now >= start) && (!end || now <= end) && (!promotion.minAmount || subtotal >= promotion.minAmount);
    if (valid) {
      if (promotion.type === "percentage") discount = subtotal * (promotion.value / 100);
      else if (promotion.type === "fixed_amount") discount = promotion.value;
      discount = Math.min(discount, subtotal);
    }
  }

  const total = subtotal - discount;

  const verifyPayment = async (saleId: string) => {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId }),
    });
    const result = await res.json();
    if (result.success) {
      alert(result.message);
      fetchSales();
    } else {
      alert(result.error || "Erreur lors de la vérification");
    }
  };

  // ✅ Annuler une vente (ADMIN SEULEMENT) - Optimistic UI pour instantanéité
  const cancelSale = async (saleId: string, customerName: string) => {
    if (!isAdmin(session?.user?.role)) {
      alert("Seuls les administrateurs peuvent annuler une vente");
      return;
    }

    if (!confirm(`Annuler la vente de ${customerName} ?\n\nLes stocks seront restaurés.`)) {
      return;
    }

    // Optimistic update : statut change INSTANTANÉMENT
    setSales(prev => 
      prev.map(s => 
        s.id === saleId ? { ...s, paymentStatus: "cancelled" } : s
      )
    );

    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
      });

      const raw = await res.text().catch(() => "");
      let data: any = {};
      if (raw && raw.trim()) {
        try { data = JSON.parse(raw); } catch { data = { error: raw }; }
      }

      if (res.ok) {
        alert("✅ Vente annulée et stocks restaurés");
        fetchProducts(); // rafraîchir les stocks
        // Pas besoin de fetchSales() car mise à jour optimiste
      } else {
        alert(data.error || "Erreur lors de l'annulation");
        // Rollback en cas d'erreur
        fetchSales();
      }
    } catch (error) {
      alert("Erreur réseau lors de l'annulation");
      fetchSales(); // rollback
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    // === MAXIMUM PERCEIVED SPEED ===
    // 1. Save backup in case of error
    const backup = {
      cart: [...cart],
      customer: selectedCustomer,
      promotion: selectedPromotion,
      method: paymentMethod,
      phone: paymentPhone,
    };

    // 2. Clear UI + show loading **IMMEDIATELY** (before any network)
    setCart([]);
    setSelectedCustomer("");
    setSelectedPromotion("");
    setPaymentMethod("cash");
    setPaymentPhone("");
    setSubmittingSale(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: backup.cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          customerId: backup.customer || null,
          paymentMethod: backup.method,
          paymentPhone: backup.phone || null,
          promotionId: backup.promotion || null,
        }),
      });

      const raw = await res.text().catch(() => "");
      let data: any = {};
      if (raw && raw.trim()) {
        try { data = JSON.parse(raw); } catch { data = { error: raw }; }
      } else {
        data = { error: `Erreur serveur (${res.status})` };
      }

      if (!res.ok) {
        // Rollback only on real failure
        setCart(backup.cart);
        setSelectedCustomer(backup.customer);
        setSelectedPromotion(backup.promotion);
        setPaymentMethod(backup.method);
        setPaymentPhone(backup.phone);
        throw new Error(data.error || "Erreur lors de la vente");
      }

      // Success: refresh data in background
      fetchProducts();
      fetchSales();

      // Defer PDF (heavy) so the button feels super fast
      setTimeout(() => generateInvoice(data), 15);

    } catch (err: any) {
      console.error("Erreur validation vente:", err);
      alert(err.message || "Erreur lors de la validation de la vente");
    } finally {
      setSubmittingSale(false);
    }
  };

  const generateInvoice = (sale: any) => {
    const doc = new jsPDF();
    const shopName = session?.user?.shopName || "Ma Boutique";
    const shopPhone = session?.user?.phone || "";
    const shopEmail = session?.user?.email || "";
    const saleDate = new Date(sale.createdAt);
    const dateStr = saleDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const shortId = sale.id.slice(-4).toUpperCase();
    const invoiceNumber = `FACT-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, "0")}${String(saleDate.getDate()).padStart(2, "0")}-${shortId}`;
    const customerName = sale.customer?.name || "Client de passage";
    const customerPhone = sale.customer?.phone || "";

    doc.setFillColor(197, 160, 40);
    doc.rect(0, 0, 210, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(shopName, 20, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (shopPhone) doc.text(`Téléphone : ${shopPhone}`, 20, 33);
    if (shopEmail) doc.text(`Email : ${shopEmail}`, 20, 39);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", 190, 25, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${invoiceNumber}`, 190, 33, { align: "right" });
    doc.text(`Date : ${dateStr}`, 190, 39, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Facturé à", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(customerName, 20, 67);
    if (customerPhone) doc.text(`Téléphone : ${customerPhone}`, 20, 74);

    doc.setFont("helvetica", "bold");
    doc.text("Paiement", 20, 84);
    doc.setFont("helvetica", "normal");
    doc.text(paymentLabels[sale.paymentMethod] || "Espèces", 20, 91);

    const body = sale.items.map((item: any) => [
      item.product.name,
      item.quantity,
      `${formatPrice(item.price)} FCFA`,
      `${formatPrice(item.price * item.quantity)} FCFA`,
    ]);

    const foot: any[] = [["", "", "Sous-total", `${formatPrice(sale.total)} FCFA`]];
    if (sale.discount > 0) {
      foot.push(["", "", "Remise", `-${formatPrice(sale.discount)} FCFA`]);
      if (sale.promotion?.name) {
        foot.push(["", "", `Promotion (${sale.promotion.name})`, ""]);
      }
    }
    foot.push(["", "", "TOTAL", `${formatPrice(sale.finalTotal)} FCFA`]);

    autoTable(doc, {
      startY: 100,
      head: [["Produit", "Quantité", "Prix unitaire", "Total"]],
      body,
      foot,
      headStyles: { fillColor: [197, 160, 40], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [253, 246, 227], textColor: [61, 43, 31], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 140;
    doc.setFontSize(10);
    doc.setTextColor(92, 64, 51);
    doc.text("Merci pour votre confiance !", 105, finalY + 15, { align: "center" });
    doc.text("Les produits vendus ne sont ni repris ni échangés.", 105, finalY + 21, { align: "center" });

    doc.save(`facture-${invoiceNumber}.pdf`);
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
            {/* DEBUG: Si tu vois "Gestion du stock" ici au lieu de ce titre, le problème est dans le build Vercel */}
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Caisse & Ventes ✅ (PAGE VENTES)
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#B87333]" />
              Enregistrez vos ventes et générez des factures
            </p>
          </div>
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTab("pos")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "pos" ? "bg-gradient-to-r from-[#D4AF37] to-[#B87333] text-white shadow-md" : "text-[#5C4033] hover:bg-[#D4AF37]/10"
              }`}
            >
              Caisse
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "history" ? "bg-gradient-to-r from-[#D4AF37] to-[#B87333] text-white shadow-md" : "text-[#5C4033] hover:bg-[#D4AF37]/10"
              }`}
            >
              Historique
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50/80 border border-red-200 text-red-700 px-5 py-4 rounded-2xl">{error}</div>}

        {activeTab === "pos" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products selection */}
            <div className="glass rounded-2xl p-6 tilt-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <Package size={20} className="text-[#B87333]" />
                  Produits disponibles
                </h2>
                <span className="text-sm text-[#5C4033]/70">{filteredProducts.length} produit{sPlural(filteredProducts.length)}</span>
              </div>

              <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {Array.isArray(filteredProducts) && filteredProducts.length > 0 ? (
                  filteredProducts.map((p, index) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p.id)}
                      disabled={p.quantity <= 0}
                      className="p-4 rounded-xl border border-[#D4AF37]/20 bg-[#FDF6E3]/30 text-left hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{productIcons[index % productIcons.length]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#3D2B1F] truncate">{p.name}</p>
                          <p className="text-sm text-[#B87333] font-semibold">{formatPrice(p.price)} FCFA</p>
                          <p className="text-xs text-[#5C4033]/60 mt-1">Stock: {p.quantity}</p>
                        </div>
                      </div>
                      {cart.find((item) => item.productId === p.id) && (
                        <p className="text-xs text-[#D4AF37] font-medium mt-2 flex items-center gap-1">
                          <CheckCircle size={12} /> Dans le panier
                        </p>
                      )}
                    </button>
                  ))
                ) : (
                  <p className="text-[#5C4033]/60 col-span-2 text-center py-8">Aucun produit disponible</p>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="glass rounded-2xl p-6 tilt-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#B87333]" />
                  Panier
                  {cart.length > 0 && (
                    <span className="text-sm font-normal text-[#5C4033]/70">({cart.length} article{sPlural(cart.length)})</span>
                  )}
                </h2>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                    <User size={14} /> Client (optionnel)
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  >
                    <option value="">Client de passage</option>
                    {Array.isArray(customers) && customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `- ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                    <Tag size={14} /> Promotion
                  </label>
                  <select
                    value={selectedPromotion}
                    onChange={(e) => setSelectedPromotion(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  >
                    <option value="">Aucune promotion</option>
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.type === "percentage" ? `(-${p.value}%)` : `(-${formatPrice(p.value)} FCFA)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                    <CreditCard size={14} /> Mode de paiement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  >
                    <option value="cash">Espèces</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="wave">Wave</option>
                  </select>
                </div>

                {(paymentMethod === "orange_money" || paymentMethod === "wave") && (
                  <div>
                    <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-1.5">
                      <Smartphone size={14} /> Téléphone client
                    </label>
                    <input
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder={`Numéro ${paymentMethod === "orange_money" ? "Orange Money" : "Wave"}`}
                      className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                      required
                    />
                    <p className="text-xs text-[#5C4033]/60 mt-1.5">Le client recevra une demande de paiement sur ce numéro.</p>
                  </div>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[#D4AF37]/20 rounded-2xl">
                  <ShoppingCart size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
                  <p className="text-[#5C4033]/70">Votre panier est vide</p>
                  <p className="text-sm text-[#5C4033]/50 mt-1">Cliquez sur les produits à gauche pour les ajouter</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-4 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#3D2B1F] truncate">{item.name}</p>
                        <p className="text-sm text-[#B87333]">{formatPrice(item.price)} FCFA</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-[#FFFBF5] hover:bg-[#D4AF37]/20 text-[#B87333] flex items-center justify-center transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-medium text-[#3D2B1F] w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-[#FFFBF5] hover:bg-[#D4AF37]/20 text-[#B87333] flex items-center justify-center transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-[#D4AF37]/20 space-y-2">
                    <div className="flex justify-between text-[#5C4033]">
                      <span>Sous-total</span>
                      <span>{formatPrice(subtotal)} FCFA</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[#B87333]">
                        <span>Remise {promotion?.name && `(${promotion.name})`}</span>
                        <span>-{formatPrice(discount)} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-[#3D2B1F] font-[family-name:var(--font-playfair)]">
                      <span>Total</span>
                      <span>{formatPrice(total)} FCFA</span>
                    </div>
                    <button 
                      onClick={handleSubmit} 
                      disabled={submittingSale}
                      className="w-full mt-4 py-3.5 rounded-xl btn-luxe font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <Receipt size={18} />
                      {submittingSale ? "Traitement en cours..." : (
                        paymentMethod === "cash"
                          ? "Valider la vente et facturer"
                          : paymentMethod === "orange_money"
                          ? "Valider et demander paiement Orange Money"
                          : "Valider et demander paiement Wave"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden tilt-card">
            <div className="p-6 border-b border-[#D4AF37]/20">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] flex items-center gap-2">
                <History size={20} className="text-[#B87333]" />
                Historique des ventes
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FDF6E3]/50 text-left">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Date</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Client</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Produits</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Total</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Paiement</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Statut</th>
                    <th className="px-6 py-4 font-semibold text-[#5C4033]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {Array.isArray(sales) && sales.map((s) => {
                    const status = paymentStatusLabels[s.paymentStatus] || { label: s.paymentStatus, color: "text-[#5C4033]" };
                    return (
                      <tr key={s.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                        <td className="px-6 py-4 text-[#5C4033]">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 text-[#3D2B1F] font-medium">{s.customer?.name || "Client de passage"}</td>
                        <td className="px-6 py-4 text-[#5C4033]">{s.items.length} article(s)</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-[#B87333]">{formatPrice(s.finalTotal || s.total)} FCFA</span>
                          {s.discount > 0 && <p className="text-xs text-[#D4AF37]">-{formatPrice(s.discount)} FCFA</p>}
                        </td>
                        <td className="px-6 py-4 text-[#5C4033]">{paymentLabels[s.paymentMethod] || s.paymentMethod}</td>
                        <td className={`px-6 py-4 font-medium ${status.color} flex items-center gap-1`}>
                          {s.paymentStatus === "pending" ? <Clock size={14} /> : 
                           s.paymentStatus === "paid" ? <CheckCircle size={14} /> : 
                           s.paymentStatus === "cancelled" ? <AlertCircle size={14} /> : <AlertCircle size={14} />}
                          {status.label}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {s.paymentMethod !== "cash" && s.paymentStatus === "pending" && (
                              <button 
                                onClick={() => verifyPayment(s.id)} 
                                className="px-3 py-1 rounded-lg bg-[#D4AF37]/10 text-[#B87333] text-xs font-medium hover:bg-[#D4AF37]/20 transition-colors"
                              >
                                Vérifier
                              </button>
                            )}

                            {/* Bouton Annuler Vente - ADMIN SEULEMENT */}
                            {isAdmin(session?.user?.role) && s.paymentStatus !== "cancelled" && (
                              <button 
                                onClick={() => cancelSale(s.id, s.customer?.name || "Client de passage")}
                                className="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-xs hover:bg-red-50 transition-colors"
                              >
                                Annuler
                              </button>
                            )}
                            {s.paymentStatus === "cancelled" && (
                              <span className="text-xs text-red-600 font-medium px-2">Annulée</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!Array.isArray(sales) || sales.length === 0) && (
              <div className="p-12 text-center text-[#5C4033]/60">
                <History size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
                <p>Aucune vente enregistrée</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
