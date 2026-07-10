"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Trans } from "@/components/Trans";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/superadmin",
    });

    setLoading(false);

    if (res?.error) {
      setError(t("Email ou mot de passe incorrect"));
    } else if (res?.ok) {
      router.push("/superadmin");
    }
  };

  return (
    <Trans>
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#FFFBF5]">
      {/* Animated background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/15 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#B87333]/12 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-20 perspective-1000 hidden lg:block">
        <div className="w-24 h-24 rounded-2xl product-visual float-3d preserve-3d flex items-center justify-center">
          <span className="text-4xl">👑</span>
        </div>
      </div>
      <div className="absolute bottom-32 right-24 perspective-1000 hidden lg:block">
        <div className="w-20 h-20 rounded-full product-visual float-3d-delayed preserve-3d flex items-center justify-center">
          <span className="text-3xl">⚜️</span>
        </div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl shadow-[#3D2B1F]/10 border-t-4 border-[#D4AF37]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
              <span className="text-3xl">👑</span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#3D2B1F] mb-2">
              Super Admin
            </h1>
            <p className="text-[#5C4033] text-sm">{t("Espace de gestion SamaBoutique")}</p>
          </div>

          {error && (
            <div className="bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-1.5">{t("Mot de passe")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] placeholder-[#B87333]/50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl btn-luxe font-medium text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t("Connexion...") : t("Se connecter")}
            </button>
          </form>

          <p className="text-sm text-[#5C4033]/60 mt-6 text-center">
            {t("Compte de démonstration :")} <br />
            <strong className="text-[#B87333]">superadmin@boutique.com</strong> / <strong className="text-[#B87333]">demo123</strong>
          </p>
        </div>
      </div>
    </div>
    </Trans>
  );
}
