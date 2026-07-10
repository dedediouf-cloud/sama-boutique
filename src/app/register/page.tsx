"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { Trans } from "@/components/Trans";
import { Repeat, Gift } from "lucide-react";

function RegisterForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
    phone: "",
    billingInterval: "monthly",
    referralCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setForm((prev) => ({ ...prev, referralCode: ref.toUpperCase() }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'inscription");
    } else {
      router.push("/login");
    }
    setLoading(false);
  };

  return (
    <Trans>
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#FFFBF5] py-8">
      {/* Animated background orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/15 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#B87333]/12 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Floating decorative elements */}
      <div className="absolute top-24 left-16 perspective-1000 hidden lg:block">
        <div className="w-20 h-20 rounded-2xl product-visual float-3d preserve-3d flex items-center justify-center">
          <span className="text-3xl">🏪</span>
        </div>
      </div>
      <div className="absolute bottom-24 right-20 perspective-1000 hidden lg:block">
        <div className="w-24 h-24 rounded-full product-visual float-3d-delayed preserve-3d flex items-center justify-center">
          <span className="text-4xl">💎</span>
        </div>
      </div>

      {/* Register card */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl shadow-[#3D2B1F]/10">
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#3D2B1F] mb-2">
              SamaBoutique
            </h1>
            <p className="text-[#5C4033] text-sm">{t("Créer mon compte boutique")}</p>
          </div>

          {error && (
            <div className="bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Nom complet")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                placeholder={t("Aminata Diop")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                placeholder={t("votre@email.com")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Mot de passe")}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Nom de la boutique")}</label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                placeholder={t("Boutique Élégance")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Téléphone WhatsApp")}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                placeholder="+221 77 123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Intervalle de facturation</label>
              <div className="relative">
                <Repeat size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B87333]/50" />
                <select
                  value={form.billingInterval}
                  onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="annual">Annuel (avec réduction)</option>
                </select>
              </div>
              <p className="text-xs text-[#5C4033]/60 mt-1.5">
                L'abonnement annuel applique la réduction configurée par le Super Admin.
              </p>
            </div>

            {form.referralCode && (
              <div className="rounded-xl bg-[#FDF8F3]/80 border border-[#D4AF37]/20 p-4">
                <label className="block text-sm font-medium text-[#5C4033] mb-1.5 flex items-center gap-2">
                  <Gift size={16} className="text-[#D4AF37]" />
                  Code de parrainage appliqué
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={form.referralCode}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-xl input-warm text-[#3D2B1F] bg-white/50"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, referralCode: "" })}
                    className="text-xs text-[#B87333] hover:text-[#5C4033] font-medium"
                  >
                    Supprimer
                  </button>
                </div>
                <p className="text-xs text-[#5C4033]/60 mt-1.5">
                  En choisissant l'abonnement annuel, votre parrain recevra 1 mois gratuit.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl btn-luxe font-medium text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t("Création...") : t("Créer mon compte")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5C4033]/70">
            {t("Déjà un compte ?")}{" "}
            <Link href="/login" className="text-[#B87333] hover:text-[#5C4033] font-medium hover:underline transition-colors">
              {t("Se connecter")}
            </Link>
          </p>
        </div>
      </div>
    </div>
    </Trans>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
