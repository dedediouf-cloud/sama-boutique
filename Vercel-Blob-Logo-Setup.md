# Configuration Vercel Blob pour les Logos par Boutique

## Étape 1 : Activer Vercel Blob

1. Va sur ton projet Vercel
2. Onglet **Storage**
3. Clique **Create Database** → **Blob**
4. Crée une base "logos" (ou laisse le nom par défaut)
5. Copie la variable d'environnement qui s'affiche :
   - `BLOB_READ_WRITE_TOKEN`

## Étape 2 : Ajouter la variable d'environnement

Dans Vercel → **Settings** → **Environment Variables** :

Ajoute :
- **Nom** : `BLOB_READ_WRITE_TOKEN`
- **Valeur** : Colle le token que tu as copié
- **Environments** : Production + Preview

Puis **Redeploy** avec "Clear build cache".

## Étape 3 : Comment ça marche maintenant

- Chaque boutique peut uploader son logo dans **Paramètres**
- Le logo est stocké sur Vercel Blob (public)
- Il apparaît automatiquement :
  - Sur les tickets thermiques 80mm
  - Sur les factures A4 (📥)
  - Dans l'historique des caisses (en-tête)

## Pour les boutiques créées par le Super Admin

Le propriétaire de la boutique peut changer son logo lui-même depuis `/settings`.

---

**Note importante** : 
Si tu n'ajoutes pas `BLOB_READ_WRITE_TOKEN`, l'upload de logo échouera (mais le reste de l'app continuera de fonctionner avec un fallback aux initiales).

## Test rapide

1. Connecte-toi avec une boutique
2. Va dans **Paramètres**
3. En bas de page, upload une image de logo
4. Va dans **Ventes** → Historique → PDF
5. Va dans **Historique des caisses** (nouveau menu)

Le logo de la boutique doit apparaître.
