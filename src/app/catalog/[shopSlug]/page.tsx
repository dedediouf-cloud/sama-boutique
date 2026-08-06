"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { 
  Phone, MessageCircle, ShoppingBag, Bookmark, X, Gift, 
  ShoppingCart, Plus, Minus, Trash2, Send 
} from "lucide-react";

const productIcons = ["✨", "🎁", "💎", "🛍️", "🌟", "🏺", "🕯️", "🧴", "👜", "🧣"];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export default function CatalogPage() {
  const { shopSlug } = useParams() as { shopSlug: string };
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [reservationForm, setReservationForm] = useState<any>({ open: false });
  const [buyForm, setBuyForm] = useState<any>({ open: false });

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

  // === CART LOGIC ===
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            imageUrl: product.imageUrl,
          },
        ];
      }
    });
    setShowCart(true);
  };

  const updateCartQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setShowCart(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // === ACTIONS ===
  const openWhatsAppCart = () => {
    const phone = shop?.phone?.replace(/[^\d+]/g, "");
    if (!phone || cart.length === 0) return;

    let message = `Bonjour ! Je souhaite commander les produits suivants :\n\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)} FCFA\n`;
    });
    message += `\nTotal : ${formatPrice(cartTotal)} FCFA\n\nMerci de me confirmer la disponibilité et les modalités.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  const openReservation = (product?: any) => {
    if (product) {
      setReservationForm({
        open: true,
        productId: product.id,
        productName: product.name,
        customerName: "",
        customerPhone: "",
        quantity: "1",
        message: "",
      });
    } else if (cart.length > 0) {
      // Bulk reservation from cart
      setReservationForm({
        open: true,
        isCart: true,
        items: [...cart],
        customerName: "",
        customerPhone: "",
        message: "",
      });
    }
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
    const body = reservationForm.isCart
      ? {
          isCart: true,
          items: reservationForm.items,
          customerName: reservationForm.customerName,
          customerPhone: reservationForm.customerPhone,
          message: reservationForm.message,
        }
      : {
          productId: reservationForm.productId,
          productName: reservationForm.productName,
          customerName: reservationForm.customerName,
          customerPhone: reservationForm.customerPhone,
          quantity: parseInt(reservationForm.quantity),
          message: reservationForm.message,
        };

    const res = await fetch(`/api/catalog/${shopSlug}/reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert("Réservation envoyée ! Le commerçant va vous contacter.");
      setReservationForm({ open: false });
      if (reservationForm.isCart) clearCart();
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
      setBuyForm({ open: false });
    } else {
      alert(result.error || "Erreur lors du paiement");
    }
  };

  // Filtered products
  const filteredProducts = shop?.products?.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <p>Ce catalogue n'existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#B87333]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-br from-[#3D2B1F] via-[#4A3328] to-[#5C4033] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shadow-xl shadow-[#D4AF37]/20">
            <StoreIcon />
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-semibold text-[#FDF6E3] mb-3">
            {shop.shopName}
          </h1>
          <p className="text-[#D4AF37]/80 text-lg">Catalogue en ligne • Livraison &amp; Retrait</p>

          {shop.phone && (
            <a
              href={`https://wa.me/${shop.phone.replace(/[^\d+]/g, "")}`}
              target="_blank"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#FDF6E3] hover:bg-[#D4AF37]/20 transition-all"
            >
              <Phone size={18} /> {shop.phone}
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-10">
        {/* Search + Cart Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3 rounded-2xl border border-[#D4AF37]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            />
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#3D2B1F] text-white hover:bg-[#5C4033] transition-all active:scale-[0.985]"
          >
            <ShoppingCart size={20} />
            <span>Panier</span>
            {cartCount > 0 && (
              <span className="px-3 py-0.5 rounded-full bg-[#D4AF37] text-[#3D2B1F] text-sm font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-[#5C4033]/60">
            <Gift size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
            <p className="text-xl">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any, index: number) => (
              <div
                key={product.id}
                className="group bg-white border border-[#D4AF37]/10 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image */}
                <div className="relative h-56 bg-[#FDF6E3] overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-7xl opacity-70">
                        {productIcons[index % productIcons.length]}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/95 px-3 py-1 rounded-full text-sm font-semibold text-[#B87333] shadow">
                    {formatPrice(product.price)} FCFA
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-1.5">
                    {product.name}
                  </h3>

                  <p className="text-[#5C4033]/70 text-sm flex-1 line-clamp-3 mb-4">
                    {product.description || "Produit de qualité disponible en magasin."}
                  </p>

                  <div className="mt-auto space-y-2">
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-3 rounded-2xl bg-[#3D2B1F] hover:bg-black text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.985]"
                    >
                      <ShoppingBag size={18} /> Ajouter au panier
                    </button>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <button
                        onClick={() => {
                          const phone = shop?.phone?.replace(/[^\d+]/g, "");
                          if (!phone) return;
                          const text = encodeURIComponent(
                            `Bonjour, je suis intéressé(e) par : ${product.name} (${formatPrice(product.price)} FCFA). Est-il disponible ?`
                          );
                          window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                        }}
                        className="py-2.5 rounded-xl bg-[#25D366] text-white flex items-center justify-center gap-1.5 hover:bg-[#1fa855]"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </button>
                      <button
                        onClick={() => openBuy(product)}
                        className="py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#B87333] hover:bg-[#D4AF37]/5 flex items-center justify-center gap-1.5"
                      >
                        Acheter
                      </button>
                      <button
                        onClick={() => openReservation(product)}
                        className="col-span-2 py-2.5 rounded-xl border border-[#D4AF37]/30 text-[#5C4033] hover:bg-[#D4AF37]/5 flex items-center justify-center gap-1.5"
                      >
                        <Bookmark size={15} /> Réserver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button (mobile) */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-50 lg:hidden bg-[#3D2B1F] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
        >
          <ShoppingCart size={20} /> Panier ({cartCount})
        </button>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-xl">Votre Panier</h2>
                <p className="text-sm text-[#5C4033]/70">{cartCount} article(s)</p>
              </div>
              <button onClick={() => setShowCart(false)}><X /></button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <ShoppingCart size={48} className="mx-auto mb-3 text-[#D4AF37]/40" />
                  <p>Votre panier est vide</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b pb-4">
                      <div className="w-16 h-16 bg-[#FDF6E3] rounded-xl overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#3D2B1F] truncate">{item.name}</div>
                        <div className="text-[#B87333] font-semibold">{formatPrice(item.price)} FCFA</div>

                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="w-7 h-7 border rounded flex items-center justify-center">-</button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="w-7 h-7 border rounded flex items-center justify-center">+</button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t bg-[#FFFBF5]">
                  <div className="flex justify-between text-lg font-semibold mb-4">
                    <span>Total</span>
                    <span className="text-[#B87333]">{formatPrice(cartTotal)} FCFA</span>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={openWhatsAppCart}
                      className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-medium flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} /> Commander via WhatsApp
                    </button>

                    <button
                      onClick={() => openReservation()}
                      className="w-full py-3.5 rounded-2xl border border-[#D4AF37] text-[#B87333] font-medium flex items-center justify-center gap-2"
                    >
                      <Bookmark size={18} /> Réserver tout le panier
                    </button>

                    <button
                      onClick={() => alert("Pour l'achat groupé, contactez-nous directement ou réservez puis payez en boutique.")}
                      className="w-full py-3.5 rounded-2xl btn-luxe flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={18} /> Acheter maintenant
                    </button>
                  </div>

                  <button onClick={clearCart} className="w-full text-center text-xs mt-4 text-red-500 hover:text-red-600">
                    Vider le panier
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {reservationForm.open && (
        <Modal onClose={() => setReservationForm({ open: false })} title="Réserver">
          <form onSubmit={submitReservation} className="space-y-4">
            <input type="text" placeholder="Votre nom" value={reservationForm.customerName} onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
            <input type="tel" placeholder="Votre téléphone" value={reservationForm.customerPhone} onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
            <textarea placeholder="Message (optionnel)" value={reservationForm.message} onChange={(e) => setReservationForm({ ...reservationForm, message: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" rows={3} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setReservationForm({ open: false })} className="flex-1 py-3 border rounded-xl">Annuler</button>
              <button type="submit" className="flex-1 py-3 btn-luxe">Envoyer la réservation</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Buy Modal (single product) */}
      {buyForm.open && (
        <Modal onClose={() => setBuyForm({ open: false })} title={`Acheter : ${buyForm.productName}`}>
          <form onSubmit={submitBuy} className="space-y-4">
            <input type="text" placeholder="Votre nom" value={buyForm.customerName} onChange={(e) => setBuyForm({ ...buyForm, customerName: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
            <input type="tel" placeholder="Votre téléphone" value={buyForm.customerPhone} onChange={(e) => setBuyForm({ ...buyForm, customerPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
            <input type="number" placeholder="Quantité" value={buyForm.quantity} onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required min="1" />

            <select value={buyForm.paymentMethod} onChange={(e) => setBuyForm({ ...buyForm, paymentMethod: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm">
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
            </select>

            <select value={buyForm.deliveryType} onChange={(e) => setBuyForm({ ...buyForm, deliveryType: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm">
              <option value="pickup">Retrait en boutique</option>
              <option value="delivery">Livraison</option>
            </select>

            {buyForm.deliveryType === "delivery" && (
              <textarea placeholder="Adresse de livraison" value={buyForm.deliveryAddress} onChange={(e) => setBuyForm({ ...buyForm, deliveryAddress: e.target.value })} className="w-full px-4 py-3 rounded-xl input-warm" required />
            )}

            <button type="submit" className="w-full py-3.5 btn-luxe flex items-center justify-center gap-2">
              Valider la commande
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StoreIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4"><X /></button>
        <h2 className="text-2xl font-semibold mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
