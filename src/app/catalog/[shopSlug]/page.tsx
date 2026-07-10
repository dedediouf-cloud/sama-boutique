"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Phone, MessageCircle, ShoppingBag, Bookmark, X, Gift, Truck } from "lucide-react";

const productIcons = ["✨", "🎁", "💎", "🛍️", "🌟", "🏺", "🕯️", "🧴", "👜", "🧣"];

export default function CatalogPage() {
  const { shopSlug } = useParams() as { shopSlug: string };
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reservationForm, setReservationForm] = useState<{
    productId?: string;
    productName?: string;
    open: boolean;
    customerName: string;
    customerPhone: string;
    quantity: string;
    message: string;
  }>({
    open: false,
    customerName: "",
    customerPhone: "",
    quantity: "1",
    message: "",
  });
  const [buyForm, setBuyForm] = useState<{
    productId?: string;
    productName?: string;
    price?: number;
    open: boolean;
    customerName: string;
    customerPhone: string;
    quantity: string;
    paymentMethod: string;
    deliveryType: string;
    deliveryAddress: string;
  }>({
    open: false,
    customerName: "",
    customerPhone: "",
    quantity: "1",
    paymentMethod: "orange_money",
    deliveryType: "pickup",
    deliveryAddress: "",
  });

  useEffect(() => {
    if (shopSlug) {
      fetch(`/api/catalog/${shopSlug}`)
        .then((res) => res.json())
        .then((data) => {
          setShop(data);
          setLoading(false);
        });
    }
  }, [shopSlug]);

  const openWhatsApp = (product: any) => {
    const phone = shop?.phone?.replace(/[^\d+]/g, "");
    if (!phone) return;

    const text = encodeURIComponent(
      `Bonjour, je suis intéressé(e) par : ${product.name} (${formatPrice(product.price)} FCFA). Est-il disponible ?`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const openReservation = (product: any) => {
    setReservationForm({
      open: true,
      productId: product.id,
      productName: product.name,
      customerName: "",
      customerPhone: "",
      quantity: "1",
      message: "",
    });
  };

  const openBuy = (product: any) => {
    setBuyForm({
      open: true,
      productId: product.id,
      productName: product.name,
      price: product.price,
      customerName: "",
      customerPhone: "",
      quantity: "1",
      paymentMethod: "orange_money",
      deliveryType: "pickup",
      deliveryAddress: "",
    });
  };

  const submitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/catalog/${shopSlug}/reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: reservationForm.productId,
        productName: reservationForm.productName,
        customerName: reservationForm.customerName,
        customerPhone: reservationForm.customerPhone,
        quantity: parseInt(reservationForm.quantity),
        message: reservationForm.message,
      }),
    });

    if (res.ok) {
      alert("Réservation envoyée ! Le commerçant va vous contacter.");
      setReservationForm({
        open: false,
        customerName: "",
        customerPhone: "",
        quantity: "1",
        message: "",
      });
    } else {
      alert("Erreur lors de l'envoi de la réservation");
    }
  };

  const submitBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/catalog/${shopSlug}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: buyForm.productId,
        quantity: parseInt(buyForm.quantity),
        customerName: buyForm.customerName,
        customerPhone: buyForm.customerPhone,
        paymentMethod: buyForm.paymentMethod,
        deliveryType: buyForm.deliveryType,
        deliveryAddress: buyForm.deliveryAddress,
      }),
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message || "Paiement initié ! Validez sur votre téléphone.");
      setBuyForm({
        open: false,
        customerName: "",
        customerPhone: "",
        quantity: "1",
        paymentMethod: "orange_money",
        deliveryType: "pickup",
        deliveryAddress: "",
      });
    } else {
      alert(result.error || "Erreur lors du paiement");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
          <p className="text-[#5C4033]">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center text-[#5C4033]">
          <h1 className="text-2xl font-bold mb-2">Boutique non trouvée</h1>
          <p>Ce catalogue n&apos;existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] relative overflow-hidden">
      {/* Warm background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-br from-[#3D2B1F] via-[#4A3328] to-[#5C4033] text-white py-16 px-4">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(245, 230, 200, 0.03) 50px, rgba(245, 230, 200, 0.03) 52px),
              repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(245, 230, 200, 0.02) 80px, rgba(245, 230, 200, 0.02) 82px)
            `,
          }}
        />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shadow-xl shadow-[#D4AF37]/20 float-3d">
            <StoreIcon />
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-semibold text-[#FDF6E3] mb-3">
            {shop.shopName}
          </h1>
          <p className="text-[#D4AF37]/80 text-lg">Catalogue en ligne</p>
          {shop.phone && (
            <a
              href={`https://wa.me/${shop.phone.replace(/[^\d+]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#FDF6E3] hover:bg-[#D4AF37]/20 transition-all duration-300"
            >
              <Phone size={18} />
              {shop.phone}
            </a>
          )}
        </div>
      </header>

      {/* Products grid */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {shop.products.length === 0 ? (
          <div className="text-center py-20 text-[#5C4033]/60">
            <Gift size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-xl">Aucun produit disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000">
            {shop.products.map((product: any, index: number) => (
              <div
                key={product.id}
                className="tilt-card glass rounded-3xl overflow-hidden group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Product visual */}
                <div className="h-52 product-visual flex items-center justify-center relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="float-3d preserve-3d">
                      <span className="text-6xl filter drop-shadow-lg">
                        {productIcons[index % productIcons.length]}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#FFFBF5]/90 text-[#B87333] text-sm font-semibold shadow-sm">
                    {formatPrice(product.price)} FCFA
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-2">
                    {product.name}
                  </h3>
                  <p className="text-[#5C4033]/70 text-sm mb-4 line-clamp-2">
                    {product.description || "Découvrez ce produit exclusif dans notre catalogue."}
                  </p>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => openWhatsApp(product)}
                      className="w-full py-3 rounded-xl bg-[#25D366] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#1fa855] transition-all duration-300 hover:scale-[1.02]"
                    >
                      <MessageCircle size={18} />
                      Commander via WhatsApp
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => openBuy(product)}
                        className="py-3 rounded-xl btn-luxe text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <ShoppingBag size={16} />
                        Acheter
                      </button>
                      <button
                        onClick={() => openReservation(product)}
                        className="py-3 rounded-xl border border-[#D4AF37]/40 text-[#B87333] font-medium hover:bg-[#D4AF37]/10 transition-all duration-300 flex items-center justify-center gap-1"
                      >
                        <Bookmark size={16} />
                        Réserver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reservation Modal */}
      {reservationForm.open && (
        <Modal onClose={() => setReservationForm({ ...reservationForm, open: false })} title={`Réserver : ${reservationForm.productName}`}>
          <form onSubmit={submitReservation} className="space-y-4">
            <input
              type="text"
              placeholder="Votre nom"
              value={reservationForm.customerName}
              onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
            />
            <input
              type="tel"
              placeholder="Votre téléphone"
              value={reservationForm.customerPhone}
              onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
            />
            <input
              type="number"
              placeholder="Quantité"
              value={reservationForm.quantity}
              onChange={(e) => setReservationForm({ ...reservationForm, quantity: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
              min="1"
            />
            <textarea
              placeholder="Message (optionnel)"
              value={reservationForm.message}
              onChange={(e) => setReservationForm({ ...reservationForm, message: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReservationForm({ ...reservationForm, open: false })}
                className="flex-1 px-4 py-3 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/10 transition-all duration-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl btn-luxe"
              >
                Envoyer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Buy Modal */}
      {buyForm.open && (
        <Modal onClose={() => setBuyForm({ ...buyForm, open: false })} title={`Acheter : ${buyForm.productName}`}>
          <p className="text-[#B87333] font-medium mb-4 flex items-center gap-2">
            <ShoppingBag size={18} />
            Total: {formatPrice((buyForm.price || 0) * parseInt(buyForm.quantity || "1"))} FCFA
          </p>
          <form onSubmit={submitBuy} className="space-y-4">
            <input
              type="text"
              placeholder="Votre nom"
              value={buyForm.customerName}
              onChange={(e) => setBuyForm({ ...buyForm, customerName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
            />
            <input
              type="tel"
              placeholder="Votre téléphone"
              value={buyForm.customerPhone}
              onChange={(e) => setBuyForm({ ...buyForm, customerPhone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
            />
            <input
              type="number"
              placeholder="Quantité"
              value={buyForm.quantity}
              onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
              min="1"
            />
            <select
              value={buyForm.paymentMethod}
              onChange={(e) => setBuyForm({ ...buyForm, paymentMethod: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
            >
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
            </select>

            <select
              value={buyForm.deliveryType}
              onChange={(e) => setBuyForm({ ...buyForm, deliveryType: e.target.value })}
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
            >
              <option value="pickup">Retrait en boutique</option>
              <option value="delivery">Livraison à domicile</option>
            </select>

            {buyForm.deliveryType === "delivery" && (
              <textarea
                placeholder="Adresse de livraison complète"
                value={buyForm.deliveryAddress}
                onChange={(e) => setBuyForm({ ...buyForm, deliveryAddress: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                rows={3}
                required
              />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBuyForm({ ...buyForm, open: false })}
                className="flex-1 px-4 py-3 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/10 transition-all duration-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl btn-luxe flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Payer maintenant
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StoreIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#3D2B1F]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="glass-strong rounded-3xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FDF6E3]/50 hover:bg-[#D4AF37]/20 flex items-center justify-center text-[#5C4033] transition-colors"
        >
          <X size={18} />
        </button>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#3D2B1F] mb-5 pr-8">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
