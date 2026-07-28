"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import { useSession } from "next-auth/react";
import {
  Settings,
  Smartphone,
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface PaymentSettings {
  paymentsEnabled: boolean;
  defaultPaymentMethod: string | null;
  merchantPhone: string | null;
  waveMerchantId: string | null;
  omMerchantCode: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PaymentSettings>({
    paymentsEnabled: false,
    defaultPaymentMethod: "cash",
    merchantPhone: "",
    waveMerchantId: "",
    omMerchantCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isUserAdmin = isAdmin(session?.user?.role);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/payments");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          paymentsEnabled: data.paymentsEnabled ?? false,
          defaultPaymentMethod: data.defaultPaymentMethod ?? "cash",
          merchantPhone: data.merchantPhone ?? "",
          waveMerchantId: data.waveMerchantId ?? "",
          omMerchantCode: data.omMerchantCode ?? "",
        });
      }
    } catch (err) {
      console.error("Erreur chargement paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserAdmin) return;

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentsEnabled: settings.paymentsEnabled,
          defaultPaymentMethod: settings.defaultPaymentMethod,
          merchantPhone: settings.merchantPhone || null,
          waveMerchantId: settings.waveMerchantId || null,
          waveApiKey: null, // pour l'instant on ne gère pas les clés secrètes ici
          waveSecret: null,
          omMerchantCode: settings.omMerchantCode || null,
          omApiKey: null,
          omClientSecret: null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Paramètres de paiement enregistrés avec succès");
        // Rafraîchir pour voir les valeurs masquées
        await fetchSettings();
      } else {
        setMessage("❌ " + (data.error || "Erreur lors de l'enregistrement"));
      }
    } catch (err) {
      setMessage("❌ Erreur réseau");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass rounded-2xl p-8">Chargement...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[#3D2B1F] flex items-center gap-3">
            <Settings size={28} className="text-[#B87333]" />
            Paramètres de la boutique
          </h1>
          <p className="text-[#5C4033] mt-1">Configurez les paiements mobiles (Wave &amp; Orange Money)</p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-2 ${message.includes("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.includes("✅") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message}
          </div>
        )}

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSave} className="space-y-8">
            {/* Activation globale */}
            <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-6">
              <div>
                <div className="font-semibold text-[#3D2B1F] flex items-center gap-2">
                  <CreditCard size={18} /> Paiements mobiles activés
                </div>
                <p className="text-sm text-[#5C4033]/70 mt-1">
                  Permet aux clients de payer directement via le catalogue et la caisse
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.paymentsEnabled}
                  onChange={(e) => setSettings({ ...settings, paymentsEnabled: e.target.checked })}
                  disabled={!isUserAdmin}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#D4AF37] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
              </label>
            </div>

            {/* Méthode par défaut */}
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-2">Méthode de paiement par défaut</label>
              <select
                value={settings.defaultPaymentMethod || "cash"}
                onChange={(e) => setSettings({ ...settings, defaultPaymentMethod: e.target.value })}
                disabled={!isUserAdmin}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              >
                <option value="cash">Espèces</option>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
              </select>
            </div>

            {/* Numéro marchand */}
            <div>
              <label className="block text-sm font-medium text-[#5C4033] mb-2 flex items-center gap-2">
                <Smartphone size={16} /> Numéro marchand (optionnel)
              </label>
              <input
                type="tel"
                value={settings.merchantPhone || ""}
                onChange={(e) => setSettings({ ...settings, merchantPhone: e.target.value })}
                placeholder="+221 77 XXX XX XX"
                disabled={!isUserAdmin}
                className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              />
              <p className="text-xs text-[#5C4033]/60 mt-1">Numéro sur lequel les paiements sont reçus (si différent du numéro principal)</p>
            </div>

            {/* Wave */}
            <div className="border border-[#D4AF37]/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#00B2E2]/10 flex items-center justify-center">
                  <span className="text-[#00B2E2] font-bold text-sm">W</span>
                </div>
                <h3 className="font-semibold text-[#3D2B1F]">Wave Business</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Merchant ID / Business ID</label>
                  <input
                    type="text"
                    value={settings.waveMerchantId || ""}
                    onChange={(e) => setSettings({ ...settings, waveMerchantId: e.target.value })}
                    placeholder="WAVE-XXXX-XXXX"
                    disabled={!isUserAdmin}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Orange Money */}
            <div className="border border-[#D4AF37]/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#FF6600]/10 flex items-center justify-center">
                  <span className="text-[#FF6600] font-bold text-sm">OM</span>
                </div>
                <h3 className="font-semibold text-[#3D2B1F]">Orange Money</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Code Marchand</label>
                  <input
                    type="text"
                    value={settings.omMerchantCode || ""}
                    onChange={(e) => setSettings({ ...settings, omMerchantCode: e.target.value })}
                    placeholder="OM-XXXXXX"
                    disabled={!isUserAdmin}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {!isUserAdmin && (
              <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl">
                Seuls les administrateurs peuvent modifier les paramètres de paiement.
              </div>
            )}

            {isUserAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl btn-luxe font-medium disabled:opacity-70"
              >
                <Save size={18} />
                {saving ? "Enregistrement..." : "Enregistrer les paramètres de paiement"}
              </button>
            )}
          </form>
        </div>

        <div className="text-xs text-[#5C4033]/60 px-1">
          Les clés API secrètes (Wave API Key, Orange Money Secret) sont stockées de façon sécurisée et ne sont jamais affichées.
        </div>
      </div>
    </ProtectedRoute>
  );
}
