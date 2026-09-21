# Correction du build Vercel — Essai gratuit 15 jours

## 1. Pourquoi le build a échoué

L'erreur :

```
./src/app/api/cron/trial-reminders/route.ts:49:7
Type error: Object literal may only specify known properties,
and 'trialEndsAt' does not exist in type 'UserWhereInput'.
```

**Ce n'est pas** une erreur dans le code. C'est que **`prisma/schema.prod.prisma` n'a pas été poussé sur GitHub**.

Le déroulement exact :

| Étape | Ce qui s'est passé |
|---|---|
| `postinstall` → `prisma generate` | Prisma a lu **l'ancien** schéma (sans les champs d'essai) |
| `prisma db push` | A répondu *« The database is already in sync »* → l'ancien schéma correspondait bien à l'ancienne base |
| `next build` → TypeScript | Le code utilise `trialEndsAt`, mais le client Prisma généré ne le connaît pas → **échec** |

Le point révélateur dans ton log : **« The database is already in sync »**. Si le nouveau schéma avait été poussé, Prisma aurait écrit *« added column trialEndsAt »*. C'est la preuve que le schéma n'était pas à jour.

## 2. Les 4 problèmes trouvés dans le dépôt

| # | Problème | Impact |
|---|---|---|
| 1 | `prisma/schema.prod.prisma` sans `trialEndsAt`, `trialUsed`, `trialDays`, `TrialReminder` | **Build cassé** (l'erreur actuelle) |
| 2 | `src/app/api/auth/check-status/route.ts` et `src/app/api/user/access/route.ts` **inversés** (contenu échangé) | Connexion et bannière cassées |
| 3 | Dossier `extend-tiral` au lieu de `extend-trial` (faute de frappe) | Bouton « Prolonger » → erreur 404 |
| 4 | Le verrou de lecture seule absent sur les 26 routes d'écriture | L'essai terminé **n'empêchait pas** réellement de vendre/modifier |

Tout ceci est corrigé dans le paquet ci-dessous. **Tes modifications personnelles sont préservées** (ton numéro WhatsApp dans `login/page.tsx`, tes routes `restock`, `upload/logo`, etc. n'ont pas été touchées).

## 3. Comment appliquer

### Méthode A — Le patch Git (recommandée, la plus sûre)

1. Télécharge `fix-essai-vercel.patch` et place-le **à la racine de ton projet** (le dossier qui contient `package.json`).
2. Ouvre PowerShell dans ce dossier et tape :

```powershell
git apply --check fix-essai-vercel.patch
```

Si aucune erreur ne s'affiche, applique-le :

```powershell
git apply fix-essai-vercel.patch
git status
```

Tu dois voir **39 fichiers modifiés**. Ensuite :

```powershell
git add -A
git commit -m "fix: schema Prisma prod + verrou lecture seule + correction check-status/extend-trial"
git push
```

> Si `git apply` refuse (erreur de fins de ligne Windows), utilise :
> `git apply --ignore-whitespace fix-essai-vercel.patch`

### Méthode B — Le ZIP (copie de fichiers)

1. Télécharge `fix-essai-vercel.zip`
2. **Décompresse-le à la racine de ton projet** en acceptant de remplacer les fichiers existants (le ZIP contient déjà la bonne arborescence `src/...` et `prisma/...`)
3. **Supprime le dossier mal orthographié** (important) :

```powershell
git rm -r "src/app/api/superadmin/boutiques/[id]/extend-tiral"
```

4. Puis :

```powershell
git add -A
git commit -m "fix: schema Prisma prod + verrou lecture seule + correction extend-trial"
git push
```

### Méthode C — À la main (si tu préfères ne toucher qu'au schéma)

Ouvre `prisma/schema.prod.prisma` et ajoute ces 4 blocs :

**a)** Dans `model User`, juste après `lastPaidAt` :

```prisma
  trialEndsAt         DateTime?
  trialUsed           Boolean  @default(false)
```

**b)** Dans `model User`, dans la liste des relations (après `referralsMade`) :

```prisma
  trialReminders        TrialReminder[]
```

**c)** Dans `model GlobalSettings`, après `defaultMonthlyAmount` :

```prisma
  trialDays                  Int      @default(15)
```

**d)** À la toute fin du fichier :

```prisma
model TrialReminder {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  kind      String // J5 | J1 | J0
  sentAt    DateTime @default(now())

  @@unique([userId, kind])
  @@index([userId])
}
```

⚠️ Cette méthode C corrige **seulement le build**. Les points 2, 3 et 4 resteront à corriger (le verrou de lecture seule ne fonctionnera pas).

## 4. Ce qui va se passer au prochain déploiement

- `prisma db push` va créer : les colonnes `trialEndsAt`, `trialUsed`, `trialDays` et la table `TrialReminder`.
- Ces ajouts sont **sans risque** : colonnes facultatives ou avec valeur par défaut, aucune donnée existante touchée.
- Les boutiques déjà clientes **ne reçoivent aucun essai** (champ vide) → elles ne seront **jamais** mises en lecture seule automatiquement. Aucun de tes clients actuels ne sera surpris.

## 5. Vérifications après le déploiement

1. Le build doit afficher `✓ Compiled successfully` **puis passer l'étape TypeScript**.
2. Connecte-toi avec un compte super admin → liste des boutiques → le bouton **« Prolonger »** doit fonctionner.
3. Crée une boutique de test → elle doit afficher **« Essai gratuit — 15 jours restants »**.
4. Console Vercel (F12) → tu ne dois avoir aucune erreur 404 sur `/api/user/access`.

## 6. Variables d'environnement à ajouter dans Vercel

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | Envoi des rappels email (sans elle : aucun email, mais rien ne casse) |
| `EMAIL_FROM` | Ex. `SamaBoutique <contact@tondomaine.com>` |
| `CRON_SECRET` | Protège la tâche quotidienne de rappels |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Ton numéro affiché dans la bannière |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Ton email affiché dans la bannière |

Test des rappels (simulation, aucun envoi) :
`https://TON-PROJET.vercel.app/api/cron/trial-reminders?token=TA_CLE&dryRun=1`

## 7. Statut de vérification de ce correctif

Appliqué et testé sur une copie exacte de ton dépôt :

- ✅ `prisma generate` (schéma prod, Prisma 6.19.3) : OK
- ✅ Vérification TypeScript complète : **0 erreur**
- ✅ `next build` complet : **réussi**
- ✅ `/api/auth/check-status` : renvoie l'état d'essai (échange corrigé)
- ✅ `/api/user/access` : renvoie `TRIAL_EXPIRED` + lecture seule
- ✅ Écriture d'un produit en essai terminé : **HTTP 403** (bloquée)
- ✅ `/api/superadmin/boutiques/[id]/extend-trial` : **HTTP 200**, essai prolongé de 15 jours
- ✅ Nouvelle inscription : **TRIAL, 15 jours restants**
- ✅ Cron de rappels : fonctionne (401 sans clé, dry-run OK avec clé)
