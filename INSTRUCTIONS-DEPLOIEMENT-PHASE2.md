# 🚀 INSTRUCTIONS DÉPLOIEMENT PHASE 2 - Wave + Orange Money (API Réelles)

**Date** : 29 juillet 2026

## ✅ Ce qui est prêt

- Providers Wave et Orange Money font maintenant de **vrais appels API**
- Webhooks automatiques créés
- UI `/settings` mise à jour avec les champs secrets
- Tout est sauvegardé dans `BoutiqueSettings`
- Build local réussi

---

## 📋 ÉTAPES À SUIVRE (sur ta machine Windows)

### 1. Ouvre PowerShell dans le dossier du projet

```powershell
cd C:\sama-boutique
```

### 2. Copie-colle ce bloc entier (le script complet)

```powershell
# === DÉPLOIEMENT PHASE 2 - Wave + Orange Money Réels ===
Write-Host "=== DÉPLOIEMENT PHASE 2 ===" -ForegroundColor Cyan

git pull origin main

git add prisma/schema.prisma
git add prisma/schema.prod.prisma
git add prisma/migrations/20260727135352_add_boutique_settings/migration.sql
git add src/lib/payments/wave.ts
git add src/lib/payments/orange-money.ts
git add src/lib/payments/credentials.ts
git add src/lib/payments/index.ts
git add src/lib/payments/types.ts
git add src/app/api/settings/payments/route.ts
git add src/app/api/payments/verify/route.ts
git add src/app/api/payments/webhooks/wave/route.ts
git add src/app/api/payments/webhooks/orange-money/route.ts
git add src/app/settings/page.tsx
git add src/app/api/catalog/[shopSlug]/pay/route.ts
git add src/app/api/sales/route.ts
git add PHASE-2-PAIEMENTS-REELS.md

git status

git commit -m "Phase 2: Intégrations réelles Wave + Orange Money (providers + webhooks)"

git push origin main

Write-Host "`n✅ PUSH RÉUSSI !" -ForegroundColor Green
Write-Host "Maintenant : Va sur Vercel → Deployments → Redeploy avec 'Clear build cache' coché." -ForegroundColor Yellow
```

**Exécute-le.**

### 3. Vérifie que tout a été poussé

Après le push, tu devrais voir dans le terminal :
```
[main xxxxxxx] Phase 2: ...
```

### 4. Sur Vercel (très important)

1. Va sur ton projet : https://vercel.com/dedediouf-cloud/sama-boutique (ou ton dashboard)
2. Va dans **Deployments**
3. Clique sur les **3 points** du dernier déploiement
4. Choisis **Redeploy**
5. **Coche la case "Clear build cache"** (obligatoire !)
6. Clique sur **Redeploy**

Attends la fin du build (il doit utiliser `prisma/schema.prod.prisma`).

---

## 🔍 Vérifications après déploiement

Une fois déployé :

1. Va sur ton site en production (en tant qu'admin)
2. Va dans **Paramètres**
3. Active les paiements mobiles
4. Renseigne tes identifiants Wave / Orange Money
5. Crée une vente test avec Wave ou Orange Money
6. Clique sur le bouton **"Vérif."** dans l'historique

Tu devrais voir des messages comme :
- "Paiement Wave initié" (avec vrai appel si clés présentes)

---

## 📌 Fichiers critiques qui ont été poussés

- `prisma/schema.prisma` + `prisma/schema.prod.prisma`
- Migration `20260727135352_add_boutique_settings`
- Tous les providers (`wave.ts`, `orange-money.ts`)
- Webhooks (`/webhooks/wave` et `/webhooks/orange-money`)
- Page `/settings` mise à jour
- Routes caisse + catalogue

---

## ⚠️ Rappel important

- **Toujours pousser les deux schemas + la migration ensemble**
- **Toujours clear build cache** sur Vercel pour cette phase
- Si tu vois encore l'erreur `boutiqueSettings does not exist`, c'est que le cache n'a pas été vidé

---

## Prochaines étapes après le déploiement réussi

- Teste avec de vrais identifiants
- Configure les webhooks dans les dashboards Wave et Orange Money
- Passe à la Phase 3 si besoin (payouts, etc.)

**Bonne chance !** Si tu as une erreur pendant le push ou le build, colle-la ici.
