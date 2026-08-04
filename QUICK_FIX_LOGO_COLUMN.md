# 🔴 URGENT : Colonne "logoUrl" manquante en production

## Cause exacte de ton erreur actuelle
```
column "logoUrl" of relation "User" does not exist
Code: P2010
```

La colonne `logoUrl` est bien déclarée dans `prisma/schema.prod.prisma`, mais **elle n'existe pas** dans ta base de données PostgreSQL en production.

C'est pourquoi même le `$executeRaw` et `$executeRawUnsafe` échouent.

---

## Solution rapide (recommandée)

### Étape 1 : Commit la migration que j'ai préparée

```bash
cd boutique-saas

git add prisma/migrations/20260804170000_add_logo_url/migration.sql
git add src/app/api/upload/logo/route.ts src/app/settings/page.tsx src/app/superadmin/page.tsx Vercel-Logo-Upload-Fix-2026-08-04.md

git commit -m "fix: add missing logoUrl column + double raw SQL logo upload"

git push
```

### Étape 2 : Sur Vercel (très important)

1. Va dans ton projet Vercel
2. **Settings → General → Build & Development Settings**
3. Change **Build Command** en :
   ```
   npm run vercel-build
   ```
4. Enregistre

5. Va dans **Deployments**
6. Clique sur **Redeploy** du dernier déploiement
7. **Coche "Clear build cache"**
8. Déploie

Le script `vercel-build` fait automatiquement :
- `prisma generate --schema=prisma/schema.prod.prisma`
- `prisma db push --schema=prisma/schema.prod.prisma`  ← **c'est ça qui va créer la colonne**
- `next build`

---

## Alternative : Forcer l'ajout de la colonne manuellement (si tu as accès)

Si tu as la variable `DATABASE_URL` en local ou via Vercel CLI :

```bash
cd boutique-saas

# Option A (la plus simple)
npx prisma db push --schema=prisma/schema.prod.prisma --accept-data-loss

# Ou via le script Vercel
npm run vercel-build
```

---

## Vérification après déploiement

Après le redeploy + Clear build cache, refais l'upload de logo.

Tu devrais maintenant voir soit :
- Succès avec `"method": "raw-sql"` et `"verified": true`
- Ou une autre erreur (mais plus celle de la colonne manquante)

---

**Date** : 2026-08-04
**Problème** : Colonne logoUrl absente en prod
**Fix** : Migration + vercel-build (db push)