"use client";

import React, { useEffect, useState } from "react";
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
  ChevronDown,
  ChevronUp,
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
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const toggleSaleDetails = (saleId: string) => {
    setExpandedSaleId(expandedSaleId === saleId ? null : saleId);
  };

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
      // console.error("Erreur clients:", err);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSales(data);
    } catch (err) {
      // console.error("Erreur ventes:", err);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setPromotions(data.filter((p: any) => p.active));
    } catch (err) {
      // console.error("Erreur promotions:", err);
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

  const handleSubmit = async (e?: any) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    if (cart.length === 0) {
      alert("Le panier est vide. Veuillez ajouter des produits.");
      return;
    }

    setSubmittingSale(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
          customerId: selectedCustomer || null,
          paymentMethod: paymentMethod,
          paymentPhone: paymentPhone || null,
          promotionId: selectedPromotion || null,
        }),
      });

      const raw = await res.text().catch(() => "");
      let data: any = {};
      if (raw && raw.trim()) {
        try { data = JSON.parse(raw); } catch { data = { error: raw }; }
      }

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la validation de la vente");
      }

      setCart([]);
      setSelectedCustomer("");
      setSelectedPromotion("");
      setPaymentMethod("cash");
      setPaymentPhone("");

      fetchProducts();
      fetchSales();

      setTimeout(() => {
        if (data) generateInvoice(data);
      }, 20);

    } catch (err: any) {
      // console.error("Erreur validation vente:", err);
      alert(err.message || "Erreur lors de la validation de la vente");
    } finally {
      setSubmittingSale(false);
    }
  };

  // === TICKET DE CAISSE (format reçu thermique 80mm) ===
  const generateReceipt = (sale: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 210], // Format ticket 80mm
    });

    const shopName = session?.user?.shopName || "Ma Boutique";
    const shopPhone = session?.user?.phone || "";
    const saleDate = new Date(sale.createdAt);
    const dateStr = saleDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    const timeStr = saleDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const shortId = sale.id.slice(-6).toUpperCase();
    const ticketNumber = `T-${shortId}`;
    const customerName = sale.customer?.name || "Client";

    let y = 6;

    // === EN-TÊTE ===
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(shopName, 40, y, { align: "center" });
    y += 4;

    if (shopPhone) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(shopPhone, 40, y, { align: "center" });
      y += 3;
    }

    doc.setFontSize(6);
    doc.text("--------------------------------", 40, y, { align: "center" });
    y += 4;

    // Date + Ticket
    doc.setFontSize(7);
    doc.text(`${dateStr} ${timeStr}`, 5, y);
    doc.text(`N° ${ticketNumber}`, 75, y, { align: "right" });
    y += 4;

    doc.setFontSize(6);
    doc.text("--------------------------------", 40, y, { align: "center" });
    y += 5;

    // Client
    doc.setFontSize(7);
    doc.text(`Client: ${customerName}`, 5, y);
    y += 5;

    // === ARTICLES ===
    doc.setFontSize(7);
    sale.items.forEach((item: any) => {
      const name = (item.product?.name || item.productName || "Produit").substring(0, 22);
      const qty = item.quantity;
      const price = item.price || 0;
      const lineTotal = qty * price;

      doc.text(name, 5, y);
      doc.text(`${qty} x ${formatPrice(price)}`, 75, y, { align: "right" });
      y += 3.5;

      doc.text(`${formatPrice(lineTotal)} FCFA`, 75, y, { align: "right" });
      y += 4.5;
    });

    y += 1;
    doc.setFontSize(6);
    doc.text("--------------------------------", 40, y, { align: "center" });
    y += 5;

    // === TOTAUX ===
    doc.setFontSize(7);
    doc.text("Sous-total", 5, y);
    doc.text(`${formatPrice(sale.total)} FCFA`, 75, y, { align: "right" });
    y += 4;

    if (sale.discount > 0) {
      doc.text("Remise", 5, y);
      doc.text(`-${formatPrice(sale.discount)}`, 75, y, { align: "right" });
      y += 4;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 5, y);
    doc.text(`${formatPrice(sale.finalTotal)} FCFA`, 75, y, { align: "right" });
    y += 6;

    // Paiement
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Paiement: ${paymentLabels[sale.paymentMethod] || "Espèces"}`, 5, y);
    y += 5;

    doc.setFontSize(6);
    doc.text("--------------------------------", 40, y, { align: "center" });
    y += 6;

    // === PIED DE PAGE ===
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("MERCI DE VOTRE ACHAT !", 40, y, { align: "center" });
    y += 5;

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Bonne journée", 40, y, { align: "center" });

    doc.save(`ticket-caisse-${ticketNumber}.pdf`);
  };

  // Alias pour garder la compatibilité
  const generateInvoice = generateReceipt;

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
              Caisse • Ticket de caisse généré automatiquement
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
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

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-[420px] sm:max-h-[600px] overflow-y-auto pr-1 touch-pan-y">
                {Array.isArray(filteredProducts) && filteredProducts.length > 0 ? (
                  filteredProducts.map((p, index) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p.id)}
                      disabled={p.quantity <= 0}
                      className="p-2.5 sm:p-3.5 rounded-xl border border-[#D4AF37]/20 bg-[#FDF6E3]/30 text-left hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group active:scale-[0.985] touch-manipulation min-h-[92px]"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg sm:text-xl mt-0.5">{productIcons[index % productIcons.length]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#3D2B1F] truncate text-[13px] sm:text-sm leading-tight">{p.name}</p>
                          <p className="text-xs sm:text-sm text-[#B87333] font-semibold mt-0.5">{formatPrice(p.price)} FCFA</p>
                          <p className="text-[10px] text-[#5C4033]/60">Stock: {p.quantity}</p>
                        </div>
                      </div>
                      {cart.find((item) => item.productId === p.id) && (
                        <p className="text-[10px] text-[#D4AF37] font-medium mt-1 flex items-center gap-1">
                          <CheckCircle size={11} /> Dans le panier
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
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit(e);
                  }}
                  style={{ isolation: 'isolate' }}
                  className="space-y-3"
                >
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-4 rounded-xl bg-[#FDF6E3]/50 border border-[#D4AF37]/10">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#3D2B1F] truncate">{item.name}</p>
                        <p className="text-sm text-[#B87333]">{formatPrice(item.price)} FCFA</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 sm:ml-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FFFBF5] hover:bg-[#D4AF37]/20 text-[#B87333] flex items-center justify-center transition-colors active:scale-[0.95] touch-manipulation min-h-[36px] min-w-[36px]"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="font-medium text-[#3D2B1F] w-6 text-center text-sm sm:text-base">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FFFBF5] hover:bg-[#D4AF37]/20 text-[#B87333] flex items-center justify-center transition-colors active:scale-[0.95] touch-manipulation min-h-[36px] min-w-[36px]"
                        >
                          <Plus size={15} />
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
                      type="submit"
                      disabled={submittingSale}
                      style={{ 
                        pointerEvents: 'auto', 
                        position: 'relative', 
                        zIndex: 99999,
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      className="w-full mt-4 py-3.5 rounded-xl btn-luxe font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.985] transition-all"
                      onPointerDownCapture={(e) => {
                        e.stopPropagation();
                      }}
                      onClickCapture={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStartCapture={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Receipt size={18} />
                      {submittingSale ? "Validation en cours..." : (
                        paymentMethod === "cash"
                          ? "Valider la vente + Ticket"
                          : paymentMethod === "orange_money"
                          ? "Valider + Payer Orange Money"
                          : "Valider + Payer Wave"
                      )}
                    </button>
                  </div>
                </form>
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
            <div className="overflow-x-auto -mx-1 px-1 touch-pan-x">
              <table className="w-full text-[11px] sm:text-sm min-w-[580px]">
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
                    const isExpanded = expandedSaleId === s.id;

                    return (
                      <React.Fragment key={s.id}>
                        <tr className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[#5C4033] text-[11px] sm:text-xs">{new Date(s.createdAt).toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit"}) } <span className="text-[10px] text-[#5C4033]/50">{new Date(s.createdAt).toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}</span></td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[#3D2B1F] font-medium text-xs sm:text-sm truncate max-w-[110px]">{s.customer?.name || "Client de passage"}</td>
                          <td 
                            className="px-3 sm:px-6 py-3 sm:py-4 text-[#5C4033] cursor-pointer hover:text-[#B87333] flex items-center gap-1 text-xs sm:text-sm"
                            onClick={() => toggleSaleDetails(s.id)}
                          >
                            {s.items.length} art.
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm">
                            <span className="font-semibold text-[#B87333]">{formatPrice(s.finalTotal || s.total)} FCFA</span>
                            {s.discount > 0 && <p className="text-[10px] text-[#D4AF37]">-{formatPrice(s.discount)}</p>}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-[#5C4033] text-[10px] sm:text-xs hidden sm:table-cell">{paymentLabels[s.paymentMethod] || s.paymentMethod}</td>
                          <td className={`px-3 sm:px-6 py-3 sm:py-4 font-medium ${status.color} flex items-center gap-1 text-xs`}>
                            {s.paymentStatus === "pending" ? <Clock size={12} /> : 
                             s.paymentStatus === "paid" ? <CheckCircle size={12} /> : 
                             s.paymentStatus === "cancelled" ? <AlertCircle size={12} /> : <AlertCircle size={12} />}
                            <span className="hidden sm:inline">{status.label}</span>
                            <span className="sm:hidden">{status.label.substring(0,5)}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => generateInvoice(s)} 
                                className="px-2 py-1 rounded-md bg-[#D4AF37]/10 text-[#B87333] text-[10px] font-medium hover:bg-[#D4AF37]/20 transition-colors active:scale-[0.95] touch-manipulation min-h-[28px]"
                              >
                                Ticket
                              </button>

                              {s.paymentMethod !== "cash" && s.paymentStatus === "pending" && (
                                <button 
                                  onClick={() => verifyPayment(s.id)} 
                                  className="px-2 py-1 rounded-md bg-[#D4AF37]/10 text-[#B87333] text-[10px] font-medium hover:bg-[#D4AF37]/20 transition-colors active:scale-[0.95] touch-manipulation min-h-[28px]"
                                >
                                  Vérif.
                                </button>
                              )}

                              {/* Bouton Annuler Vente - ADMIN SEULEMENT */}
                              {isAdmin(session?.user?.role) && s.paymentStatus !== "cancelled" && (
                                <button 
                                  onClick={() => cancelSale(s.id, s.customer?.name || "Client de passage")}
                                  className="px-2 py-1 rounded-md border border-red-300 text-red-600 text-[10px] hover:bg-red-50 transition-colors active:scale-[0.95] touch-manipulation min-h-[28px]"
                                >
                                  Annul.
                                </button>
                              )}
                              {s.paymentStatus === "cancelled" && (
                                <span className="text-[10px] text-red-600 font-medium px-1">Annulée</span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Détails des articles - expandable */}
                        {isExpanded && (
                          <tr className="bg-[#FDF6E3]/30">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="ml-4 border-l-2 border-[#D4AF37]/40 pl-4">
                                {/* En-tête avec date et référence */}
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3 text-sm">
                                  <div>
                                    <span className="text-[#5C4033]/70">Date :</span>{" "}
                                    <span className="font-medium text-[#3D2B1F]">
                                      {new Date(s.createdAt).toLocaleDateString("fr-FR", { 
                                        weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" 
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[#5C4033]/70">Référence :</span>{" "}
                                    <span className="font-mono font-semibold text-[#B87333]">
                                      VENTE-{s.id.slice(-8).toUpperCase()}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-xs font-medium text-[#5C4033] mb-2">Articles :</div>
                                <div className="grid gap-2">
                                  {s.items.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm bg-white/70 px-3 py-1.5 rounded-lg border border-[#D4AF37]/10">
                                      <span className="font-medium text-[#3D2B1F]">{item.product?.name || "Produit"}</span>
                                      <span className="text-[#5C4033]">
                                        {item.quantity} × {formatPrice(item.price)} FCFA = <span className="font-semibold text-[#B87333]">{formatPrice(item.price * item.quantity)} FCFA</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
