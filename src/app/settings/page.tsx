"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import { useSession } from "next-auth/react";
import type { ExtendedUser } from "@/types/next-auth";
import {
  Settings,
  Smartphone,
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

interface PaymentSettings {
  paymentsEnabled: boolean;
  defaultPaymentMethod: string | null;
  merchantPhone: string | null;
  waveMerchantId: string | null;
  waveApiKey: string | null;
  waveSecret: string | null;
  omMerchantCode: string | null;
  omApiKey: string | null;
  omClientSecret: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PaymentSettings>({
    paymentsEnabled: false,
    defaultPaymentMethod: "cash",
    merchantPhone: "",
    waveMerchantId: "",
    waveApiKey: "",
    waveSecret: "",
    omMerchantCode: "",
    omApiKey: "",
    omClientSecret: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isUserAdmin = isAdmin(session?.user?.role);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Use strongly-typed cast from our augmentation
  const user = session?.user as ExtendedUser | undefined;
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(user?.logoUrl ?? null);

  useEffect(() => {
    fetchSettings();
    // Load current logo from session if available (typed cast)
    if (user?.logoUrl) {
      setCurrentLogoUrl(user.logoUrl);
    }
  }, [session]);

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
          waveApiKey: "",
          waveSecret: "",
          omMerchantCode: data.omMerchantCode ?? "",
          omApiKey: "",
          omClientSecret: "",
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
          waveApiKey: settings.waveApiKey || null,
          waveSecret: settings.waveSecret || null,
          omMerchantCode: settings.omMerchantCode || null,
          omApiKey: settings.omApiKey || null,
          omClientSecret: settings.omClientSecret || null,
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

                {/* Champs secrets Wave (Phase 2) */}
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Wave Secret (API Key)</label>
                  <input
                    type="password"
                    value={settings.waveSecret || ""}
                    onChange={(e) => setSettings({ ...settings, waveSecret: e.target.value })}
                    placeholder="secret_xxxxxxxxxxxxxxxx"
                    disabled={!isUserAdmin}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] font-mono text-sm"
                  />
                  <p className="text-xs text-[#5C4033]/60 mt-1">Clé secrète fournie dans le dashboard Wave Business (ne jamais partager)</p>
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

        {/* === LOGO DE LA BOUTIQUE (Vercel Blob) === */}
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon size={28} className="text-[#B87333]" />
            <div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#3D2B1F]">
                Logo de la boutique
              </h2>
              <p className="text-sm text-[#5C4033]/70">Ce logo apparaîtra sur les tickets, factures A4 et catalogue</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Current logo preview */}
            {currentLogoUrl && (
              <div>
                <p className="text-sm font-medium text-[#5C4033] mb-2">Logo actuel</p>
                <div className="w-40 h-20 border border-[#D4AF37]/30 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                  <img 
                    src={currentLogoUrl} 
                    alt="Logo boutique" 
                    className="max-h-16 max-w-[140px] object-contain" 
                  />
                </div>
              </div>
            )}

            {/* Upload form */}
            {isUserAdmin && (
              <div>
                <label className="block text-sm font-medium text-[#5C4033] mb-2">Téléverser un nouveau logo</label>
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="logo-upload"
                    disabled={uploadingLogo}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D4AF37]/30 hover:bg-[#FDF6E3] text-[#5C4033] transition-colors"
                  >
                    <Upload size={18} /> Choisir une image (PNG/JPG, max 4MB)
                  </label>

                  {logoFile && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!logoFile) return;
                        setUploadingLogo(true);

                        const formData = new FormData();
                        formData.append("logo", logoFile);

                        try {
                          const res = await fetch("/api/upload/logo", {
                            method: "POST",
                            body: formData,
                          });
                          const data = await res.json();

                          if (res.ok && data.logoUrl) {
                            setCurrentLogoUrl(data.logoUrl);
                            setLogoFile(null);
                            setLogoPreview(null);
                            alert("✅ Logo mis à jour avec succès ! Il apparaîtra sur les prochains tickets.");
                            window.location.reload();
                          } else {
                            // Affichage amélioré des instructions Vercel Blob
                            let msg = data.error || "Erreur lors de l'upload du logo";
                            
                            if (data.steps && Array.isArray(data.steps)) {
                              msg += "\n\n" + data.steps.join("\n");
                            } else if (data.help) {
                              msg += "\n\n" + data.help;
                            }
                            
                            alert(msg);
                          }
                        } catch (err) {
                          alert("Erreur réseau lors de l'upload");
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                      disabled={uploadingLogo}
                      className="px-5 py-2.5 rounded-xl bg-[#B87333] text-white font-medium disabled:opacity-60"
                    >
                      {uploadingLogo ? "Envoi en cours..." : "Uploader le logo"}
                    </button>
                  )}
                </div>

                {logoPreview && (
                  <div className="mt-4">
                    <p className="text-xs text-[#5C4033]/70 mb-1">Aperçu :</p>
                    <div className="w-40 h-20 border border-[#D4AF37]/30 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                      <img src={logoPreview} alt="Aperçu logo" className="max-h-16 max-w-[140px] object-contain" />
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#5C4033]/60 mt-3">
                  Le logo sera stocké via Vercel Blob et utilisé automatiquement sur les tickets thermiques et factures A4.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-[#5C4033]/60 px-1">
          Les clés API secrètes (Wave API Key, Orange Money Secret) sont stockées de façon sécurisée et ne sont jamais affichées.
        </div>
      </div>
    </ProtectedRoute>
  );
}
