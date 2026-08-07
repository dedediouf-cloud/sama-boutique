"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpened: (session: any) => void;
}

export default function CashSessionModal({ isOpen, onClose, onOpened }: CashSessionModalProps) {
  const [openingAmount, setOpeningAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleOpenCash = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      alert("Veuillez entrer un montant d'ouverture valide");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingAmount: parseFloat(openingAmount),
          note: note.trim() || null,
        }),
      });

      // Read body ONCE
      const text = await res.text().catch(() => "");

      if (!res.ok) {
        console.error("=== [CAISSE] ÉCHEC OUVERTURE CAISSE ===");
        console.error("HTTP Status:", res.status);
        console.error("RAW RESPONSE (copie ça) :", text || "(vide)");

        let serverError = text || "Erreur serveur (pas de détail)";
        try {
          const parsed = JSON.parse(text);
          serverError = parsed.error || parsed.message || text;
        } catch {}

        // Message qui contient TOUJOURS la réponse brute
        const userMessage = 
          `❌ Erreur ${res.status} lors de l'ouverture de la caisse\n\n` +
          `Message : ${serverError}\n\n` +
          `--- RÉPONSE BRUTE SERVEUR (copie-moi ça) ---\n` +
          text + 
          `\n\n` +
          `Ouvre F12 → Console (onglet Console) et envoie-moi tout ce qui est en rouge.`;

        throw new Error(userMessage);
      }

      // Success — we don't trust the POST body for parsing issues.
      // Instead, immediately fetch the fresh open session from the server.
      try {
        const refreshRes = await fetch("/api/cash-sessions", { cache: "no-store" });
        const refreshText = await refreshRes.text().catch(() => "");
        let freshSession = null;

        if (refreshText) {
          try { freshSession = JSON.parse(refreshText); } catch {}
        }

        if (!freshSession) {
          freshSession = { 
            id: 'fresh', 
            openingAmount: parseFloat(openingAmount), 
            status: "OPEN" 
          };
        }

        onOpened(freshSession);
      } catch (e) {
        // Fallback
        onOpened({ 
          id: 'fallback', 
          openingAmount: parseFloat(openingAmount), 
          status: "OPEN" 
        });
      }

      onClose();
      setOpeningAmount("");
      setNote("");
    } catch (error: any) {
      console.error("=== [CAISSE] ERREUR OUVERTURE CAISSE ===");
      console.error("Error:", error);

      let msg = error?.message || "Erreur lors de l'ouverture de la caisse";

      // Toujours inclure le plus d'infos possible
      const fullMsg = 
        "❌ Erreur lors de l'ouverture de la caisse\n\n" +
        msg + "\n\n" +
        "=== Pour m'aider rapidement ===\n" +
        "1. Appuie sur F12\n" +
        "2. Onglet Console\n" +
        "3. Copie tout ce qui est en rouge (surtout les lignes RAW RESPONSE et [CAISSE])\n" +
        "4. Colle tout ici\n\n" +
        "Message technique : " + (error?.message || "inconnu");

      alert(fullMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#3D2B1F]">Ouvrir la caisse</h2>
          <button onClick={onClose} className="text-[#5C4033]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5C4033] mb-1.5">
              Montant d'ouverture (FCFA) *
            </label>
            <input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="Ex: 50000"
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
              required
            />
            <p className="text-xs text-[#5C4033]/60 mt-1">
              Entrez le montant en espèces présent dans la caisse au début
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4033] mb-1.5">
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Caisse ouverte par Aminata"
              className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F] h-20 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#D4AF37]/30 text-[#5C4033]"
          >
            Annuler
          </button>
          <button
            onClick={handleOpenCash}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#B87333] text-white font-medium disabled:opacity-70"
          >
            {loading ? "Ouverture..." : "Ouvrir la caisse"}
          </button>
        </div>
      </div>
    </div>
  );
}
