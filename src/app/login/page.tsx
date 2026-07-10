"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { Trans } from "@/components/Trans";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Vérifier si le compte est bloqué avant de tenter la connexion
      const statusRes = await fetch("/api/auth/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const statusData = await statusRes.json();

      if (statusData.blocked) {
        setError(statusData.message || "Votre compte est bloqué. Veuillez contacter l'administrateur.");
        setLoading(false);
        return;
      }
    } catch {
      // Si la vérification échoue, on continue avec la connexion normale
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("Email ou mot de passe incorrect"));
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Trans>
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#FFFBF5]">
      {/* Animated background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/15 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#B87333]/12 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-[#C9895B]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-20 perspective-1000 hidden lg:block">
        <div className="w-24 h-24 rounded-2xl product-visual float-3d preserve-3d flex items-center justify-center">
          <span className="text-4xl">🛍️</span>
        </div>
      </div>
      <div className="absolute bottom-32 right-24 perspective-1000 hidden lg:block">
        <div className="w-20 h-20 rounded-full product-visual float-3d-delayed preserve-3d flex items-center justify-center">
          <span className="text-3xl">✨</span>
        </div>
      </div>
      <div className="absolute top-40 right-32 perspective-1000 hidden lg:block">
        <div className="w-16 h-16 rounded-xl product-visual float-3d preserve-3d flex items-center justify-center" style={{ animationDelay: "-2s" }}>
          <span className="text-2xl">📦</span>
        </div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl shadow-[#3D2B1F]/10">
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#3D2B1F] mb-2">
              SamaBoutique
            </h1>
            <p className="text-[#5C4033] text-sm">{t("Connexion à votre espace boutique")}</p>
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
                placeholder={t("votre@email.com")}
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
                placeholder="••••••••"
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

          <p className="mt-6 text-center text-sm text-[#5C4033]/70">
            {t("Pas encore de compte ?")}{" "}
            <Link href="/register" className="text-[#B87333] hover:text-[#5C4033] font-medium hover:underline transition-colors">
              {t("Créer un compte")}
            </Link>
          </p>
        </div>
      </div>
    </div>
    </Trans>
  );
}
