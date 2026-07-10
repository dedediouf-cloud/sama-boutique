# Déploiement SaaS multi-boutiques

Ce guide vous explique comment déployer l’application en ligne sur **Vercel** avec une base de données **PostgreSQL** gratuite (Neon), pour tester l’architecture **multi-boutiques**.

Avec cette architecture, vous déployez **une seule application**. Un **super administrateur** crée ensuite les comptes boutiques et les accès pour chaque client.

---

## 1. Préparer le déploiement

### 1.1 Créer un compte GitHub
- Allez sur https://github.com/signup
- Créez un compte gratuit
- Créez un nouveau dépôt (repository) vide, par exemple `sama-boutique`
- NE cochez PAS "Add a README" ni ".gitignore"

### 1.2 Envoyer votre code sur GitHub

Ouvrez PowerShell dans `C:\boutique-saas` et exécutez ces commandes une par une :

```powershell
cd C:\boutique-saas
git init
git add .
git commit -m "premiere version saas multi-boutiques"
```

Remplacez `VOTRE_UTILISATEUR` par votre nom d’utilisateur GitHub et `NOM_DU_DEPOT` par le nom de votre dépôt :

```powershell
git remote add origin https://github.com/VOTRE_UTILISATEUR/NOM_DU_DEPOT.git
git branch -M main
git push -u origin main
```

Exemple concret :
```powershell
git remote add origin https://github.com/monnom/sama-boutique.git
git branch -M main
git push -u origin main
```

---

## 2. Créer la base de données PostgreSQL

Nous utilisons **Neon** (gratuit pour les tests).

1. Allez sur https://neon.tech
2. Connectez-vous avec GitHub
3. Créez un nouveau projet
4. Créez une base de données nommée par exemple `sama_boutique`
5. Copiez la **connection string** (URL de connexion) qui ressemble à :
   ```
   postgresql://user:password@host.neon.tech/sama_boutique?sslmode=require
   ```
6. Gardez cette URL, elle servira dans Vercel.

---

## 3. Déployer sur Vercel

### 3.1 Créer un compte Vercel
- Allez sur https://vercel.com/signup
- Connectez-vous avec GitHub

### 3.2 Créer le projet

1. Cliquez sur **Add New Project**
2. Importez votre dépôt GitHub `sama-boutique`
3. Configurez le projet :
   - **Project Name** : `sama-boutique` (ou le nom que vous voulez)
   - **Framework Preset** : Next.js
   - **Build Command** : `npm run vercel-build`
   - **Output Directory** : `.next`
4. Cliquez sur **Environment Variables** et ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L’URL Neon copiée ci-dessus |
| `NEXTAUTH_SECRET` | Une longue chaîne aléatoire (voir ci-dessous) |
| `NEXTAUTH_URL` | Votre URL Vercel (ex: `https://sama-boutique.vercel.app`) |

5. Cliquez sur **Deploy**

Pour générer `NEXTAUTH_SECRET` sous Windows, exécutez dans PowerShell :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiez le résultat et collez-le dans `NEXTAUTH_SECRET`.

---

## 4. Première connexion super administrateur

Une fois le déploiement terminé, Vercel vous donne une URL comme `https://sama-boutique.vercel.app`.

1. Allez sur `https://votre-app.vercel.app/superadmin/login`
2. Connectez-vous avec :
   - **Email** : `superadmin@boutique.com`
   - **Mot de passe** : `demo123`
3. Vous arrivez sur le tableau de bord super administrateur

> **Important** : changez le mot de passe du super admin après le premier déploiement en production. Créez un nouveau super admin via la base de données ou supprimez le compte de démo.

---

## 5. Créer les 2 boutiques de test

Dans le tableau de bord super administrateur :

1. Cliquez sur **Créer une nouvelle boutique**
2. Remplissez le formulaire pour la première boutique beauté :
   - Nom du gérant
   - Email de connexion de la boutique
   - Mot de passe temporaire
   - Nom de la boutique
   - Slug (ex: `beauty-dakar-1`)
   - Numéro WhatsApp
3. Répétez pour la deuxième boutique (ex: slug `beauty-dakar-2`)

Chaque boutique aura ses propres données : produits, clients, ventes, employés.

---

## 6. Connexion des boutiques

Chaque boutique se connecte avec son propre email et mot de passe sur la page normale de connexion :

```
https://votre-app.vercel.app/login
```

Le gérant de chaque boutique peut ensuite :
- Ajouter ses produits
- Ajouter ses vendeurs (employés)
- Voir son catalogue public
- Gérer ses ventes et livraisons

---

## 7. Catalogue en ligne de chaque boutique

Le catalogue public de chaque boutique est accessible à :

```
https://votre-app.vercel.app/catalog/SLUG_DE_LA_BOUTIQUE
```

Exemples :
```
https://votre-app.vercel.app/catalog/beauty-dakar-1
https://votre-app.vercel.app/catalog/beauty-dakar-2
```

Vous pouvez partager ces liens via WhatsApp, Instagram, Facebook, etc.

---

## 8. Checklist de test en boutique réelle

### Avant d’aller en boutique
- [ ] L’application Vercel est en ligne
- [ ] La base de données Neon est créée
- [ ] Le super admin est connecté
- [ ] Les 2 boutiques sont créées dans le tableau de bord super admin
- [ ] Les gérants ont reçu leurs identifiants

### Tests à faire dans chaque boutique
- [ ] Le gérant se connecte avec son compte
- [ ] Le gérant ajoute ses produits
- [ ] Le gérant ajoute un vendeur (employé)
- [ ] Le vendeur se connecte avec son compte
- [ ] Le vendeur passe une vente en caisse (POS)
- [ ] La facture PDF est générée
- [ ] Le stock diminue automatiquement
- [ ] Le dashboard affiche les ventes du jour
- [ ] Un client commande via le catalogue WhatsApp
- [ ] Le gérant voit la réservation dans son interface

### Questions à poser aux vendeurs et gérants
- L’application est-elle rapide sur votre connexion internet ?
- Quelles étapes sont compliquées ?
- Quelle fonctionnalité manque le plus ?
- Le PDF de la facture est-il utile ?
- Le catalogue WhatsApp attire-t-il des clients ?

---

## 9. Limites importantes pendant le test

### Paiements simulés
Les boutons **Orange Money** et **Wave** ne font pas de vrai paiement. Ils simulent le processus pour vous montrer comment ça fonctionnera.

Pour accepter de vrais paiements, vous devez ouvrir un **compte marchand** chez Orange Money / Wave, puis intégrer leur vraie API.

### WhatsApp deep links
Le catalogue utilise des liens WhatsApp classiques (`https://wa.me/...`). Le client est redirigé vers WhatsApp pour envoyer le message.

L’API officielle WhatsApp Business n’est pas encore intégrée.

### Durée du test gratuit
- Vercel : gratuit pour les projets non commerciaux
- Neon : gratuit avec limites de stockage

Pour un vrai déploiement commercial, il faudra passer à un plan payant.

---

## 10. Prochaines étapes après le test

Si le test est concluant :
1. Achetez un nom de domaine (ex: `maboutique.sn`)
2. Passez Vercel et Neon sur des plans adaptés
3. Sécurisez le super admin : changez le mot de passe et créez un vrai compte administrateur
4. Ajoutez un système de facturation / abonnement si vous voulez vendre l’accès aux boutiques
5. Ouvrez un compte marchand Orange Money / Wave pour les vrais paiements
6. Améliorez l’application selon les retours des boutiques

---

## Commandes récapitulatives Windows

```powershell
# Générer un secret pour NextAuth
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Envoyer les modifications sur GitHub (si vous changez le code)
git add .
git commit -m "mise a jour"
git push origin main
```
