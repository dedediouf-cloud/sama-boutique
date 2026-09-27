"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Save,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Database,
  Lock,
} from "lucide-react";
import { Trans } from "@/components/Trans";

/**
 * Fenêtre de gestion des sauvegardes d'UNE boutique (super admin).
 * Autonome : un seul composant à brancher depuis la page super admin.
 */

interface Sauvegarde {
  id: string;
  createdAt: string;
  kind: string;
  sizeBytes: number;
  counts: string | null;
  permanent: boolean;
  createdBy: string | null;
}

interface Donnees {
  boutique: { id: string; shopName: string; shopSlug: string };
  backups: Sauvegarde[];
  stockage: string;
  stockageConfigure: boolean;
  retention: number;
  actif: boolean;
}

function taille(o: number) {
  if (o < 1024) return `${o} o`;
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(0)} Ko`;
  return `${(o / (1024 * 1024)).toFixed(1)} Mo`;
}

function resume(counts: string | null) {
  if (!counts) return "";
  try {
    const c = JSON.parse(counts);
    const p: string[] = [];
    if (c.sales) p.push(`${c.sales} ventes`);
    if (c.products) p.push(`${c.products} produits`);
    if (c.customers) p.push(`${c.customers} clients`);
    if (c.cashSessions) p.push(`${c.cashSessions} caisses`);
    return p.join(" · ");
  } catch {
    return "";
  }
}

function dateFr(d: string) {
  const x = new Date(d);
  return (
    x.toLocaleDateString("fr-FR") +
    " à " +
    x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function libelleKind(kind: string) {
  switch (kind) {
    case "manual":
      return { texte: "manuelle", classe: "bg-[#D4AF37]/15 text-[#B87333]" };
    case "auto":
      return { texte: "automatique", classe: "bg-[#3D2B1F]/8 text-[#5C4033]" };
    case "restore-merge":
      return { texte: "restauration (fusion)", classe: "bg-green-100 text-green-700" };
    case "restore-replace":
      return { texte: "restauration (remplacement)", classe: "bg-amber-100 text-amber-700" };
    default:
      return { texte: kind, classe: "bg-black/5 text-[#5C4033]" };
  }
}

export function BackupManager({
  boutiqueId,
  boutiqueNom,
  onClose,
}: {
  boutiqueId: string;
  boutiqueNom: string;
  onClose: () => void;
}) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [enCours, setEnCours] = useState("");
  const [restauration, setRestauration] = useState<Sauvegarde | null>(null);
  const [mode, setMode] = useState<"fusionner" | "remplacer">("fusionner");
  const [confirmation, setConfirmation] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/superadmin/boutiques/${boutiqueId}/backup`, {
        cache: "no-store",
      });
      const texte = await res.text();
      const json = JSON.parse(texte);
      if (!res.ok) throw new Error(json.error || "Erreur de chargement");
      setDonnees(json);
    } catch (e: any) {
      setErreur(e.message || "Erreur");
    } finally {
      setChargement(false);
    }
  }, [boutiqueId]);

  useEffect(() => {
    charger();
  }, [charger]);

  /* ── Sauvegarder maintenant ──────────────────────────────────────────── */
  const sauvegarder = async (permanent = false) => {
    setEnCours("sauvegarde");
    setErreur("");
    setInfo("");
    try {
      const res = await fetch(`/api/superadmin/boutiques/${boutiqueId}/backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent }),
      });
      const texte = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(texte);
      } catch {
        json = { error: `Réponse inattendue du serveur (code ${res.status})` };
      }
      if (!res.ok) throw new Error(json.error || "Erreur");
      setInfo(
        `Sauvegarde créée (${taille(json.taille)}) — ${
          json.stockage === "blob" ? "stockée dans Vercel Blob" : "stockée sur le disque local"
        }`
      );
      await charger();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setEnCours("");
    }
  };

  /* ── Télécharger ─────────────────────────────────────────────────────── */
  const telecharger = (backupId?: string) => {
    const url = backupId
      ? `/api/superadmin/boutiques/${boutiqueId}/backup/download?backupId=${backupId}`
      : `/api/superadmin/boutiques/${boutiqueId}/backup/download`;
    window.open(url, "_blank");
  };

  /* ── Restaurer ───────────────────────────────────────────────────────── */
  const lancerRestauration = async () => {
    if (!restauration) return;
    setEnCours("restauration");
    setErreur("");
    setInfo("");
    try {
      const res = await fetch(
        `/api/superadmin/boutiques/${boutiqueId}/backup/${restauration.id}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, confirmation }),
        }
      );
      const texte = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(texte);
      } catch {
        json = { error: `Réponse inattendue du serveur (code ${res.status})` };
      }
      if (!res.ok) throw new Error(json.error || "Erreur de restauration");

      const r = json.rapport?.crees || {};
      const details = Object.entries(r)
        .filter(([, n]) => Number(n) > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(", ");
      setInfo(
        `${json.message}${details ? ` — éléments restaurés : ${details}` : ""}${
          json.rapport?.avertissements?.length
            ? ` | ${json.rapport.avertissements.join(" ")}`
            : ""
        }`
      );
      setRestauration(null);
      setConfirmation("");
      await charger();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setEnCours("");
    }
  };

  /* ── Supprimer / épingler ────────────────────────────────────────────── */
  const supprimer = async (id: string) => {
    if (!confirm("Supprimer définitivement cette sauvegarde ?")) return;
    setEnCours("suppression");
    setErreur("");
    try {
      const res = await fetch(`/api/superadmin/boutiques/${boutiqueId}/backup/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      await charger();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setEnCours("");
    }
  };

  const epingler = async (id: string, permanent: boolean) => {
    setEnCours("epingle");
    try {
      await fetch(`/api/superadmin/boutiques/${boutiqueId}/backup/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permanent }),
      });
      await charger();
    } catch {
      /* silencieux */
    } finally {
      setEnCours("");
    }
  };

  return (
    <Trans>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-3xl glass-strong rounded-2xl shadow-2xl border-t-4 border-[#D4AF37] max-h-[92vh] overflow-y-auto">
          {/* En-tête */}
          <div className="sticky top-0 z-10 bg-[#FFFBF5]/95 backdrop-blur border-b border-[#D4AF37]/20 px-5 sm:px-7 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B87333] flex items-center justify-center shrink-0">
                <Database size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F]">
                  Sauvegardes
                </h3>
                <p className="text-sm text-[#5C4033]">{boutiqueNom}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#8A7A6D] hover:text-[#3D2B1F] hover:bg-black/5"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 sm:px-7 py-5 space-y-5">
            {/* Messages */}
            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{erreur}</span>
              </div>
            )}
            {info && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            {/* Alerte si le stockage externe n'est pas configuré */}
            {donnees && !donnees.stockageConfigure && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[13px]">
                <strong>Stockage externe non configuré.</strong> Les sauvegardes partent sur le
                disque local — elles ne survivront pas à un redéploiement Vercel. Ajoute la
                variable <code className="bg-white/60 px-1 rounded">BLOB_READ_WRITE_TOKEN</code>{" "}
                dans Vercel pour activer Vercel Blob. L&apos;export manuel (bouton ci-dessous)
                fonctionne dans tous les cas.
              </div>
            )}

            {/* Actions principales */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => sauvegarder(false)}
                disabled={!!enCours}
                className="px-4 py-2.5 rounded-xl btn-luxe font-medium text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={16} />
                {enCours === "sauvegarde" ? "Sauvegarde en cours..." : "Sauvegarder maintenant"}
              </button>
              <button
                onClick={() => telecharger()}
                disabled={!!enCours}
                className="px-4 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#5C4033] font-medium text-sm inline-flex items-center gap-2 hover:bg-[#D4AF37]/5 disabled:opacity-60"
              >
                <Download size={16} /> Exporter les données actuelles
              </button>
            </div>

            {donnees && (
              <p className="text-xs text-[#5C4033]/70">
                Sauvegarde automatique quotidienne à 3h du matin · conservation des{" "}
                {donnees.retention} dernières · stockage :{" "}
                {donnees.stockage === "blob" ? "Vercel Blob" : "disque local (développement)"}
              </p>
            )}

            {/* Liste */}
            <div>
              <h4 className="text-sm font-semibold text-[#5C4033] mb-2.5 flex items-center gap-2">
                <Clock size={15} className="text-[#B87333]" />
                Instants sauvegardés
              </h4>

              {chargement ? (
                <p className="text-sm text-[#5C4033]/60">Chargement...</p>
              ) : !donnees || donnees.backups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D4AF37]/40 p-6 text-center">
                  <p className="text-sm text-[#5C4033]/70">
                    Aucune sauvegarde pour l&apos;instant.
                  </p>
                  <p className="text-xs text-[#5C4033]/50 mt-1">
                    Clique sur « Sauvegarder maintenant » pour en créer une.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {donnees.backups.map((b) => {
                    const k = libelleKind(b.kind);
                    const estTrace = b.kind.startsWith("restore");
                    return (
                      <div
                        key={b.id}
                        className="rounded-xl border border-[#D4AF37]/20 bg-white/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#3D2B1F]">
                              {dateFr(b.createdAt)}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${k.classe}`}>
                              {k.texte}
                            </span>
                            {b.permanent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B87333]/15 text-[#B87333] inline-flex items-center gap-1">
                                <Lock size={9} /> conservée
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5C4033]/70 mt-0.5 truncate">
                            {b.sizeBytes > 0 && <>{taille(b.sizeBytes)} · </>}
                            {resume(b.counts) || "—"}
                            {b.createdBy ? ` · par ${b.createdBy}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!estTrace && (
                            <>
                              <button
                                onClick={() => telecharger(b.id)}
                                title="Télécharger cet instantané"
                                className="p-2 rounded-lg text-[#5C4033] hover:bg-[#D4AF37]/10"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setRestauration(b);
                                  setMode("fusionner");
                                  setConfirmation("");
                                  setErreur("");
                                  setInfo("");
                                }}
                                title="Restaurer depuis cet instantané"
                                className="p-2 rounded-lg text-[#B87333] hover:bg-[#D4AF37]/10"
                              >
                                <RotateCcw size={15} />
                              </button>
                              <button
                                onClick={() => epingler(b.id, !b.permanent)}
                                title={b.permanent ? "Ne plus conserver définitivement" : "Conserver définitivement"}
                                className={`p-2 rounded-lg hover:bg-black/5 ${
                                  b.permanent ? "text-[#B87333]" : "text-[#5C4033]/50"
                                }`}
                              >
                                <Lock size={15} />
                              </button>
                              <button
                                onClick={() => supprimer(b.id)}
                                title="Supprimer"
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panneau de restauration */}
            {restauration && (
              <div className="rounded-xl border-2 border-[#D4AF37]/40 bg-[#FFFBF5] p-4">
                <h4 className="font-semibold text-[#3D2B1F] text-sm mb-1 flex items-center gap-2">
                  <RotateCcw size={15} className="text-[#B87333]" />
                  Restaurer la sauvegarde du {dateFr(restauration.createdAt)}
                </h4>
                <p className="text-xs text-[#5C4033]/70 mb-3">
                  Le mot de passe et la fiche de la boutique ne sont pas modifiés.
                </p>

                <div className="space-y-2 mb-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer bg-white/60 border-[#D4AF37]/30">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "fusionner"}
                      onChange={() => setMode("fusionner")}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#3D2B1F]">
                        Fusionner (recommandé)
                      </span>
                      <span className="block text-xs text-[#5C4033]/70 mt-0.5">
                        Ajoute uniquement ce qui manque. Rien n&apos;est supprimé ni écrasé.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer bg-white/60 border-amber-300">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "remplacer"}
                      onChange={() => setMode("remplacer")}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-amber-800">
                        Remplacer (destructif)
                      </span>
                      <span className="block text-xs text-amber-700/80 mt-0.5">
                        Efface les données actuelles de la boutique, puis réinstalle l&apos;instantané.
                      </span>
                    </span>
                  </label>
                </div>

                {mode === "remplacer" && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-amber-800 mb-1">
                      Pour confirmer, recopie le nom exact de la boutique :
                      <strong className="ml-1">{boutiqueNom}</strong>
                    </label>
                    <input
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder={boutiqueNom}
                      className="w-full px-3 py-2.5 rounded-lg input-warm text-sm"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={lancerRestauration}
                    disabled={
                      !!enCours || (mode === "remplacer" && confirmation.trim() !== boutiqueNom.trim())
                    }
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50 ${
                      mode === "remplacer"
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "btn-luxe"
                    }`}
                  >
                    {enCours === "restauration" ? "Restauration..." : "Lancer la restauration"}
                  </button>
                  <button
                    onClick={() => {
                      setRestauration(null);
                      setConfirmation("");
                    }}
                    disabled={!!enCours}
                    className="px-4 py-2.5 rounded-xl border border-[#3D2B1F]/15 text-[#5C4033] font-medium text-sm hover:bg-black/5 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Trans>
  );
}
