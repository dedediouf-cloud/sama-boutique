"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Lock, AlertTriangle, X, Phone, Mail, RefreshCw } from "lucide-react";
import { Trans } from "@/components/Trans";

interface AccessInfo {
  state: string;
  readOnly: boolean;
  daysLeft: number | null;
  daysOverdue: number | null;
  title: string;
  message: string;
  supportWhatsapp: string | null;
  supportEmail: string | null;
}

export function TrialBanner() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/access", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as AccessInfo;
      setAccess(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then((data) => {
      if (cancelled || !data) return;
      // Une seule ouverture automatique par session : on explique au commerçant
      // pourquoi il ne peut plus enregistrer.
      if (data.readOnly && sessionStorage.getItem("trialModalSeen") !== "1") {
        sessionStorage.setItem("trialModalSeen", "1");
        setShowModal(true);
        setAutoOpened(true);
      }
    });
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!access) return null;
  if (access.state === "ACTIVE" || access.state === "SUPERADMIN") return null;
  if (!access.title) return null;

  const expired = access.state === "TRIAL_EXPIRED";
  const isTrial = access.state === "TRIAL";

  const colors = expired
    ? "bg-[#7A2E1E] border-[#D4AF37]/30 text-[#FDF6E3]"
    : isTrial
    ? "bg-gradient-to-r from-[#3D2B1F] to-[#5C4033] border-[#D4AF37]/30 text-[#FDF6E3]"
    : "bg-[#8A5A1E] border-[#D4AF37]/30 text-[#FDF6E3]";

  const Icon = expired ? Lock : isTrial ? Sparkles : AlertTriangle;

  const label = expired
    ? "Essai terminé — mode lecture seule"
    : isTrial
    ? `Essai gratuit — ${access.daysLeft} jour${(access.daysLeft || 0) > 1 ? "s" : ""} restant${(access.daysLeft || 0) > 1 ? "s" : ""}`
    : `Abonnement échu depuis ${access.daysOverdue} jour${(access.daysOverdue || 0) > 1 ? "s" : ""}`;

  const whatsappLink = access.supportWhatsapp
    ? `https://wa.me/${access.supportWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Bonjour, je souhaite activer l'abonnement de ma boutique (essai ${
          expired ? "terminé" : "en cours"
        }).`
      )}`
    : null;

  return (
    <Trans>
      {/* Bandeau */}
      <div
        className={`mb-3 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 shadow-sm ${colors}`}
      >
        <Icon size={18} className="shrink-0 text-[#D4AF37]" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold truncate">{label}</p>
          <p className="text-[11px] sm:text-xs text-[#FDF6E3]/70 line-clamp-1 sm:line-clamp-none">
            {access.message}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B87333] text-[#3D2B1F] text-xs sm:text-sm font-semibold active:scale-[0.97] transition-transform"
        >
          {expired ? "Activer" : "S'abonner"}
        </button>
        <button
          onClick={refresh}
          title="Vérifier l'état de mon abonnement"
          className="shrink-0 p-2 rounded-lg text-[#FDF6E3]/70 hover:text-[#FDF6E3] hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Fenêtre d'information */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg glass-strong rounded-2xl p-6 sm:p-7 shadow-2xl border-t-4 border-[#D4AF37] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#8A7A6D] hover:text-[#3D2B1F] hover:bg-black/5"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 mb-4 pr-8">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  expired
                    ? "bg-[#7A2E1E]/10 text-[#7A2E1E]"
                    : "bg-gradient-to-br from-[#D4AF37] to-[#B87333] text-white"
                }`}
              >
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F]">
                  {access.title}
                </h3>
                <p className="text-sm text-[#5C4033] mt-1">{access.message}</p>
              </div>
            </div>

            {access.readOnly && (
              <div className="bg-[#FFF6E5] border border-[#D4AF37]/30 rounded-xl p-3.5 mb-5">
                <p className="text-[13px] text-[#5C4033] leading-relaxed">
                  <strong>Rassurez-vous :</strong> vos produits, clients, ventes et
                  l&apos;historique de caisse sont conservés. Vous pouvez tout
                  consulter. Dès l&apos;activation, l&apos;application redevient
                  entièrement fonctionnelle, exactement là où vous l&apos;avez
                  laissée.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-luxe font-medium"
                >
                  <Phone size={17} /> Activer via WhatsApp
                </a>
              )}
              {access.supportEmail && (
                <a
                  href={`mailto:${access.supportEmail}?subject=${encodeURIComponent(
                    "Activation de mon abonnement SamaBoutique"
                  )}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#D4AF37]/40 text-[#5C4033] font-medium hover:bg-[#D4AF37]/5"
                >
                  <Mail size={17} /> {access.supportEmail}
                </a>
              )}
              {!whatsappLink && !access.supportEmail && (
                <p className="text-[13px] text-[#8A7A6D] text-center">
                  Contactez l&apos;administrateur SamaBoutique pour activer votre
                  abonnement.
                </p>
              )}
              <button
                onClick={async () => {
                  await refresh();
                  setShowModal(false);
                }}
                className="w-full py-3 rounded-xl border border-[#3D2B1F]/15 text-[#5C4033] font-medium hover:bg-black/5 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> J&apos;ai déjà activé mon abonnement
              </button>
            </div>

            {autoOpened && (
              <p className="text-[11px] text-[#8A7A6D] text-center mt-4">
                Ce message est affiché une fois par session.
              </p>
            )}
          </div>
        </div>
      )}
    </Trans>
  );
}
