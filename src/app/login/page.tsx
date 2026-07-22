"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Trans } from "@/components/Trans";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // ================================================
  // ⚠️ CHANGE CE NUMÉRO PAR LE VRAI WHATSAPP DE L'ADMIN
  // ================================================
  const adminWhatsApp = "+221775736910"; // ← Remplace par le vrai numéro
  const whatsappMessage = "Bonjour, je souhaite créer un compte boutique sur SamaBoutique.";
  const whatsappLink = `https://wa.me/${adminWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
    } catch {}

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
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#B87333]/12 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

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

            {/* === MESSAGE AMÉLIORÉ AVEC WHATSAPP === */}
            <div className="mt-6 p-5 rounded-2xl bg-[#FDF8F3] border border-[#D4AF37]/30 text-center">
              <p className="text-sm font-semibold text-[#3D2B1F] mb-1">
                Pour s’inscrire
              </p>
              <p className="text-[#5C4033] text-sm mb-4">
                Contactez l’administrateur par WhatsApp
              </p>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all active:scale-[0.98]"
              >
                📱 Contacter sur WhatsApp
              </a>

              <p className="text-[10px] text-[#5C4033]/60 mt-3">
                Cliquez pour envoyer un message à l’administrateur
              </p>
            </div>
          </div>
        </div>
      </div>
    </Trans>
  );
}