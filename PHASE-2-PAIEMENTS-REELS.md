# Phase 2 - Intégrations réelles Wave & Orange Money

**Statut :** ✅ Implémentée (29 juillet 2026)

## Ce qui a été fait

### 1. Providers réels (API calls)

- **`src/lib/payments/wave.ts`** : 
  - Utilise l'API Wave Business officielle (`https://api.wave.com/v1/checkout/sessions`)
  - Crée une vraie session de paiement
  - Vérification du statut en temps réel
  - Fallback simulation si aucune clé API fournie

- **`src/lib/payments/orange-money.ts`** :
  - Utilise l'API Orange Money Web Payment
  - Crée un paiement web réel
  - Vérification du statut (webhook recommandé)
  - Fallback simulation

### 2. Webhooks (recommandé pour production)

- `POST /api/payments/webhooks/wave` → Mise à jour automatique des ventes
- `POST /api/payments/webhooks/orange-money` → Mise à jour automatique

### 3. Intégration complète

- Caisse (`/sales`) : Paiements Wave & OM déclenchent de vrais appels API
- Catalogue public (`/catalog/[slug]`) : Paiement direct depuis le site client
- Vérification manuelle (`/api/payments/verify`) mise à jour
- Les identifiants sont chargés depuis `BoutiqueSettings`

## Comment configurer les vrais paiements

### Wave Business (recommandé)

1. Créez / connectez-vous à [business.wave.com](https://business.wave.com)
2. Allez dans **Développeurs** (Developers)
3. Activez l'API et générez :
   - **Merchant ID** (ou Business ID)
   - **API Secret** (le plus important)
4. Dans **Paramètres → Paiements** de votre boutique :
   - Activez "Paiements mobiles"
   - Entrez le **Merchant ID**
   - Entrez la **Wave Secret** (dans le champ caché pour l'instant via API PATCH)
   - (Optionnel) Ajoutez votre numéro marchand

### Orange Money

1. Contactez votre opérateur Orange Money Sénégal ou allez sur le portail commerçant
2. Demandez l'accès **Web Payment / M Payment**
3. Vous recevrez :
   - **Code Marchand** (Merchant Code)
   - **Clé API** ou **Authorization Token**
4. Dans les paramètres :
   - Entrez le **Code Marchand**
   - Entrez la **clé API** dans les champs secrets

## Test recommandé

1. Allez sur **/settings** en tant qu'admin
2. Activez les paiements + choisissez une méthode par défaut
3. Entrez vos identifiants (même si masqués, le backend les garde)
4. Créez une vente en caisse avec **Wave** ou **Orange Money**
5. Utilisez un numéro de test (ex: +221 70 000 0000 pour Wave sandbox)
6. Cliquez sur **"Vérif."** dans l'historique des ventes

## Webhooks (production)

Configurez ces URLs dans vos dashboards :

- **Wave** : `https://votre-domaine.com/api/payments/webhooks/wave`
- **Orange Money** : `https://votre-domaine.com/api/payments/webhooks/orange-money`

**Note** : Les webhooks mettent à jour automatiquement le statut des ventes sans avoir à cliquer sur "Vérif."

## Fallback

Si vous n'avez pas encore les clés :
→ Tout fonctionne en mode simulation (comme en Phase 1)
→ Les messages indiquent clairement "simulation"

## Prochaines améliorations possibles (Phase 3)

- Vérification HMAC des webhooks (sécurité renforcée)
- Payouts (retrait vers compte bancaire)
- QR Code dynamique Wave
- Support Free Money

---

**Date de déploiement Phase 2** : 29/07/2026
**Build Vercel** : Push + `prisma generate --schema=prisma/schema.prod.prisma`
