/**
 * ============================================================================
 *  CONTENU DU GUIDE UTILISATEUR
 * ============================================================================
 *  ⚠️  FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 *  Source  : SamaBoutique-Guide-Utilisateur.docx
 *  Généré  : 2026-09-30 par scripts/generer-guide.js
 *  Commande : npm run guide:generer
 *
 *  Ce contenu alimente la page publique /guide, qui sert à la fois :
 *    • aux commerçants (documentation consultable sur téléphone)
 *    • au référencement Google (contenu utile et unique)
 *
 *  ➜ Pour mettre à jour : modifie le fichier Word, puis relance
 *     « npm run guide:generer » et publie.
 * ============================================================================
 */

export type BlocGuide =
  | { type: "h2"; texte: string }
  | { type: "h3"; texte: string }
  | { type: "p"; texte: string }
  | { type: "liste"; items: string[] }
  | { type: "tableau"; lignes: string[][] };

export const GUIDE_VERSION = "1.1";

export const GUIDE_TITRE = "Guide utilisateur SamaBoutique";

/** Résumé affiché en haut de page et dans les résultats Google */
export const GUIDE_INTRO =
  "Tout ce que vous pouvez faire avec SamaBoutique, pas à pas : stock, caisse, clients, réservations, livraisons, promotions, catalogue WhatsApp et abonnements. Consultable sur téléphone.";

export const guideSections: BlocGuide[] = [
  { type: "h2", texte: "1. Introduction" },
  { type: "p", texte: "SamaBoutique est une application de gestion pour petits commerçants, boutiques et vendeurs. Elle permet de gérer le stock, les ventes, les clients, les livraisons et les commandes en ligne via WhatsApp." },
  { type: "p", texte: "Avec SamaBoutique, vous pouvez :" },
  { type: "liste", items: ["Gérer vos produits et votre stock en temps réel", "Vendre en boutique avec un panier et une caisse simples", "Générer des factures PDF automatiquement", "Suivre vos clients et leurs points de fidélité", "Recevoir des commandes et réservations via WhatsApp", "Gérer les livraisons et les fournisseurs", "Créer des promotions et des codes promo", "Consulter des statistiques de vente"] },
  { type: "p", texte: "💡 Astuce : SamaBoutique fonctionne dans un navigateur web (Chrome, Firefox, Edge). Aucune installation sur votre téléphone n'est nécessaire." },
  { type: "h2", texte: "2. Connexion et rôles" },
  { type: "h3", texte: "2.1 Se connecter" },
  { type: "liste", items: ["Ouvrez votre navigateur et allez sur l'adresse de votre boutique.", "Cliquez sur la page de connexion.", "Entrez votre email et votre mot de passe.", "Cliquez sur « Se connecter »."] },
  { type: "h3", texte: "2.2 Les rôles" },
  { type: "p", texte: "SamaBoutique propose trois rôles :" },
  { type: "tableau", lignes: [["Rôle", "Qui ?", "Ce qu'il peut faire"], ["Super Admin", "Propriétaire de la plateforme", "Créer des boutiques, gérer tous les accès"], ["Admin", "Gérant de la boutique", "Tout gérer dans sa boutique : stock, ventes, employés, promotions..."], ["Vendeur", "Employé de la boutique", "Passer des ventes, consulter les clients et les réservations"]] },
  { type: "p", texte: "⚠️ Important : Ne partagez jamais votre mot de passe. Chaque employé doit avoir son propre compte." },
  { type: "h2", texte: "3. Tableau de bord" },
  { type: "p", texte: "Le tableau de bord s'affiche après la connexion. Il donne un aperçu rapide de votre activité :" },
  { type: "liste", items: ["Ventes du jour : nombre de ventes et montant total", "Stock faible : produits à réapprovisionner", "Réservations en attente : commandes clients à traiter", "Top produits : articles les plus vendus"] },
  { type: "p", texte: "💡 Astuce : Cliquez sur une carte du tableau de bord pour aller vers la section correspondante." },
  { type: "h2", texte: "4. Gestion du stock" },
  { type: "h3", texte: "4.1 Ajouter un produit" },
  { type: "liste", items: ["Allez dans le menu « Stock ».", "Cliquez sur « Ajouter un produit ».", "Remplissez le nom, la catégorie, le prix, la quantité et le seuil d'alerte.", "Ajoutez une description si nécessaire.", "Cliquez sur « Enregistrer le produit »."] },
  { type: "h3", texte: "4.2 Réapprovisionner un produit" },
  { type: "liste", items: ["Dans la liste des produits, cliquez sur « Réapprovisionner ».", "Indiquez la quantité à ajouter.", "Ajoutez une note (fournisseur, numéro de lot, etc.).", "Cliquez sur « Ajouter au stock »."] },
  { type: "p", texte: "💡 Astuce : Le seuil d'alerte vous prévient quand un produit est presque en rupture. Par défaut, il est de 5 unités." },
  { type: "h2", texte: "5. Inventaire" },
  { type: "p", texte: "Le module Inventaire permet de faire un comptage physique du stock, de corriger les écarts et de connaître la valeur de votre stock." },
  { type: "h3", texte: "5.1 Faire un comptage" },
  { type: "liste", items: ["Allez dans le menu « Inventaire ».", "Cliquez sur l'onglet « Comptage ».", "Recherchez le produit ou filtrez par catégorie.", "Dans la colonne « Stock physique », entrez la quantité réelle constatée.", "Vérifiez l'écart affiché.", "Cliquez sur « Valider » pour enregistrer le comptage et mettre à jour le stock."] },
  { type: "h3", texte: "5.2 Voir l'historique des inventaires" },
  { type: "p", texte: "Cliquez sur l'onglet « Historique » pour voir tous les comptages passés. Chaque ligne indique : la date, le produit, le stock système avant comptage, la quantité comptée et l'écart." },
  { type: "h3", texte: "5.3 Valorisation du stock" },
  { type: "p", texte: "Cliquez sur l'onglet « Valorisation » pour voir :" },
  { type: "liste", items: ["La valeur totale du stock", "Le nombre total d'articles", "Le nombre de produits en stock faible", "La valeur du stock par catégorie"] },
  { type: "p", texte: "💡 Astuce : Faites un inventaire régulier, par exemple une fois par mois, pour garder votre stock à jour." },
  { type: "h2", texte: "6. Caisse et ventes" },
  { type: "h3", texte: "6.1 Passer une vente" },
  { type: "liste", items: ["Allez dans le menu « Ventes ».", "Cliquez sur les produits à gauche pour les ajouter au panier.", "Modifiez les quantités avec les boutons + et -.", "Sélectionnez un client existant ou laissez « Client de passage ».", "Choisissez le mode de paiement : Espèces, Orange Money ou Wave.", "Cliquez sur « Valider la vente et facturer »."] },
  { type: "h3", texte: "6.2 Appliquer une promotion" },
  { type: "liste", items: ["Dans le panier, choisissez une promotion dans la liste déroulante.", "La remise se calcule automatiquement sur le total.", "Validez la vente."] },
  { type: "h3", texte: "6.3 Paiement mobile (Orange Money / Wave)" },
  { type: "p", texte: "Le paiement mobile en ligne (Orange Money / Wave) n'est pas encore activé : il nécessite un compte marchand et une configuration. Pour l'instant, encaissez en espèces, par QR code marchand, ou à la livraison." },
  { type: "p", texte: "⚠️ Important : si le paiement mobile en ligne est refusé, c'est qu'il n'est pas encore configuré pour votre boutique. Utilisez un autre mode de paiement." },
  { type: "h3", texte: "6.4 Historique des ventes" },
  { type: "p", texte: "Cliquez sur l'onglet « Historique » dans la page Ventes pour voir toutes les ventes passées. Vous pouvez vérifier le statut d'un paiement mobile en attente." },
  { type: "h2", texte: "7. Clients et fidélité" },
  { type: "h3", texte: "7.1 Ajouter un client" },
  { type: "liste", items: ["Allez dans le menu « Clients ».", "Cliquez sur « Ajouter un client ».", "Remplissez le nom, le téléphone, l'email et l'adresse.", "Ajoutez une date de naissance et des notes si besoin.", "Cliquez sur « Enregistrer le client »."] },
  { type: "h3", texte: "7.2 Voir le détail d'un client" },
  { type: "p", texte: "Cliquez sur « Voir détails » pour afficher :" },
  { type: "liste", items: ["Le total dépensé par le client", "Le nombre d'achats", "Les points de fidélité", "L'historique des achats", "Les réservations du client"] },
  { type: "p", texte: "💡 Astuce : Vous pouvez modifier les points de fidélité et les notes d'un client depuis sa fiche détail." },
  { type: "h2", texte: "8. Réservations et commandes" },
  { type: "p", texte: "Les clients peuvent réserver des produits depuis votre catalogue en ligne. Les réservations apparaissent dans le menu « Réservations »." },
  { type: "liste", items: ["Allez dans le menu « Réservations ».", "Filtrez par statut : En attente, Confirmées, Annulées.", "Cliquez sur « Confirmer » ou « Annuler » selon la disponibilité du produit.", "Contactez le client par WhatsApp ou téléphone pour finaliser."] },
  { type: "p", texte: "💡 Astuce : Une réservation confirmée ne retire pas automatiquement le produit du stock. Pensez à passer une vente officielle ensuite." },
  { type: "h2", texte: "9. Livraisons" },
  { type: "h3", texte: "9.1 Créer une livraison" },
  { type: "liste", items: ["Allez dans le menu « Livraisons ».", "Cliquez sur « Nouvelle livraison ».", "Choisissez une vente existante avec un client.", "Remplissez l'adresse, le téléphone et les notes.", "Cliquez sur « Créer la livraison »."] },
  { type: "h3", texte: "9.2 Suivre une livraison" },
  { type: "p", texte: "Pour chaque livraison, vous pouvez changer le statut : En attente → En préparation → Expédiée → Livrée → Annulée." },
  { type: "h2", texte: "10. Promotions" },
  { type: "h3", texte: "10.1 Créer une promotion" },
  { type: "liste", items: ["Allez dans le menu « Promotions ».", "Cliquez sur « Nouvelle promotion ».", "Donnez un nom et un code promo (optionnel).", "Choisissez le type : Pourcentage ou Montant fixe.", "Indiquez la valeur de la remise.", "Définissez un montant minimum d'achat si nécessaire.", "Choisissez les dates de début et de fin.", "Cliquez sur « Créer la promotion »."] },
  { type: "p", texte: "💡 Astuce : Vous pouvez activer ou désactiver une promotion à tout moment avec le bouton de bascule." },
  { type: "h2", texte: "11. Fournisseurs" },
  { type: "h3", texte: "11.1 Ajouter un fournisseur" },
  { type: "liste", items: ["Allez dans le menu « Fournisseurs ».", "Cliquez sur « Fournisseur ».", "Remplissez le nom, le téléphone, l'email et l'adresse.", "Cliquez sur « Enregistrer le fournisseur »."] },
  { type: "h3", texte: "11.2 Passer une commande fournisseur" },
  { type: "liste", items: ["Cliquez sur « Commande ».", "Choisissez le fournisseur.", "Ajoutez les articles à commander.", "Indiquez les quantités et les prix unitaires.", "Cliquez sur « Créer la commande »."] },
  { type: "h3", texte: "11.3 Réceptionner une commande" },
  { type: "p", texte: "Quand vous recevez la marchandise, cliquez sur « Reçue ». Le stock de chaque produit est automatiquement mis à jour." },
  { type: "h2", texte: "12. Employés" },
  { type: "p", texte: "Cette section est réservée aux admins." },
  { type: "liste", items: ["Allez dans le menu « Employés ».", "Cliquez sur « Ajouter un employé ».", "Remplissez le nom, l'email et le mot de passe.", "Choisissez le rôle : Vendeur ou Admin.", "Cliquez sur « Enregistrer l'employé »."] },
  { type: "p", texte: "⚠️ Important : Un vendeur ne peut pas créer de nouveaux employés ni modifier les promotions. Seul un admin a tous les droits." },
  { type: "h2", texte: "13. Statistiques" },
  { type: "p", texte: "Le menu « Statistiques » affiche des graphiques de votre activité :" },
  { type: "liste", items: ["Chiffre d'affaires total", "Nombre de ventes", "Panier moyen", "Évolution des ventes sur 7 jours, 30 jours ou 12 mois", "Top produits par chiffre d'affaires", "Répartition des statuts de paiement"] },
  { type: "p", texte: "💡 Astuce : Changez la période avec les boutons en haut de la page pour voir les tendances à court ou long terme." },
  { type: "h2", texte: "14. Catalogue en ligne et WhatsApp" },
  { type: "p", texte: "Chaque boutique a un catalogue public accessible par un lien unique." },
  { type: "h3", texte: "14.1 Trouver le lien de votre catalogue" },
  { type: "liste", items: ["Connectez-vous à votre compte.", "Dans la barre latérale, cliquez sur « Mon catalogue ».", "Le lien s'ouvre dans un nouvel onglet."] },
  { type: "h3", texte: "14.2 Partager le catalogue" },
  { type: "p", texte: "Partagez le lien de votre catalogue sur WhatsApp, Instagram, Facebook ou par SMS. Vos clients verront vos produits avec leurs prix et pourront :" },
  { type: "liste", items: ["Commander via WhatsApp", "Acheter maintenant avec Orange Money ou Wave (simulé en test)", "Réserver un produit"] },
  { type: "p", texte: "💡 Astuce : Votre numéro WhatsApp doit être renseigné dans votre profil boutique pour que les commandes WhatsApp fonctionnent." },
  { type: "h2", texte: "15. Guide Super Admin" },
  { type: "p", texte: "Le Super Admin gère plusieurs boutiques sur la même plateforme SamaBoutique." },
  { type: "h3", texte: "15.1 Se connecter en Super Admin" },
  { type: "p", texte: "Allez sur `/superadmin/login` et connectez-vous avec vos identifiants Super Admin." },
  { type: "h3", texte: "15.2 Tableau de bord de suivi" },
  { type: "p", texte: "Le tableau de bord Super Admin donne une vue d'ensemble de toutes les boutiques :" },
  { type: "liste", items: ["Boutiques totales, actives et bloquées", "Nombre total de produits, clients et ventes", "Recurrence mensuelle attendue (MRR) des abonnements", "Nombre d'abonnements payés et d'abonnements en retard", "Liste détaillée avec statut, échéance, montant et actions rapides"] },
  { type: "p", texte: "💡 Astuce : Utilisez le tableau de bord pour repérer rapidement les boutiques en retard de paiement." },
  { type: "h3", texte: "15.3 Abonnements mensuels et annuels" },
  { type: "p", texte: "Chaque boutique peut être configurée en abonnement mensuel ou annuel. L'abonnement annuel applique une réduction configurable dans les paramètres globaux." },
  { type: "liste", items: ["Dans le tableau de bord, consultez la colonne « Intervalle » pour voir si la boutique est mensuelle ou annuelle.", "La colonne « Abonnement » affiche le tarif mensuel de base et, pour les abonnements annuels, le montant annuel après réduction.", "Quand la boutique vous paie, cliquez sur « Payer ». L'échéance est reculée d'un mois ou d'un an selon l'intervalle choisi.", "Pour changer l'intervalle d'une boutique, cliquez sur « Changer » dans la colonne « Intervalle ».", "Si la boutique ne paie pas à temps, elle est marquée « En retard ». Vous pouvez la bloquer si nécessaire."] },
  { type: "p", texte: "⚠️ Important : Le bouton « Payer » est manuel : il enregistre que vous avez reçu le paiement. Il ne déclenche pas de vrai prélèvement bancaire." },
  { type: "h3", texte: "15.4 Paramètres globaux d'abonnement" },
  { type: "p", texte: "Le panneau « Paramètres globaux » du Super Admin permet de configurer les règles commerciales :" },
  { type: "liste", items: ["Réduction appliquée aux abonnements annuels (en %)", "Nombre de mois gratuits offerts au parrain pour chaque filleul abonné en annuel", "Montant mensuel par défaut proposé lors de la création d'une boutique"] },
  { type: "p", texte: "💡 Astuce : Ces paramètres sont utilisés automatiquement lors du paiement d'un abonnement annuel et du calcul des récompenses de parrainage." },
  { type: "h3", texte: "15.5 Créer une boutique" },
  { type: "liste", items: ["Dans le tableau de bord Super Admin, cliquez sur « Créer une boutique ».", "Remplissez le nom du gérant, l'email et le mot de passe.", "Indiquez le nom de la boutique et le slug (identifiant dans l'URL).", "Renseignez le numéro WhatsApp et choisissez l'intervalle de facturation (mensuel ou annuel).", "Cliquez sur « Créer la boutique »."] },
  { type: "h3", texte: "15.6 Bloquer ou débloquer une boutique" },
  { type: "p", texte: "Le Super Admin peut bloquer une boutique en cas de non-paiement d'abonnement ou de problème. Une boutique bloquée ne peut plus se connecter. Ses employés non plus ne peuvent pas se connecter." },
  { type: "liste", items: ["Dans la liste des boutiques, cliquez sur « Bloquer ».", "Confirmez l'action.", "Le statut de la boutique passe à « Bloquée ».", "Pour réactiver la boutique, cliquez sur « Débloquer »."] },
  { type: "p", texte: "⚠️ Important : Une boutique bloquée ne pourra plus ouvrir de session. Pensez à prévenir le gérant avant de bloquer." },
  { type: "h3", texte: "15.7 Promotions sur les abonnements" },
  { type: "p", texte: "Le Super Admin peut lancer des campagnes promotionnelles pour les abonnements : remise en pourcentage, remise en FCFA ou mois gratuits." },
  { type: "liste", items: ["Dans la section « Campagnes promotionnelles abonnements », cliquez sur « Nouvelle promotion ».", "Donnez un nom et un code promo (optionnel).", "Choisissez le type d'avantage : remise en %, remise en FCFA ou mois gratuits.", "Cliquez sur « Créer la promotion ».", "Quand vous marquez un abonnement comme payé, saisissez le code promo pour appliquer la remise."] },
  { type: "p", texte: "💡 Astuce : Le tableau de bord affiche le chiffre d'affaires réel des abonnements payés (après remise)." },
  { type: "h3", texte: "15.8 Langue de l'application" },
  { type: "p", texte: "SamaBoutique propose une interface en français et en anglais." },
  { type: "liste", items: ["Cliquez sur le bouton FR / EN dans la barre latérale ou dans l'en-tête Super Admin.", "L'interface bascule immédiatement dans la langue choisie.", "Le choix est mémorisé pour votre prochaine connexion."] },
  { type: "p", texte: "💡 Astuce : Vous pouvez changer de langue à tout moment sans vous déconnecter." },
  { type: "h3", texte: "15.9 Supprimer une boutique" },
  { type: "p", texte: "La suppression supprime définitivement la boutique et toutes ses données : produits, clients, ventes, employés, fournisseurs, commandes, promotions et inventaires." },
  { type: "liste", items: ["Dans la liste des boutiques, cliquez sur « Supprimer ».", "Lisez l'avertissement et confirmez.", "La boutique est supprimée définitivement."] },
  { type: "p", texte: "⚠️ Important : La suppression est irréversible. Ne supprimez une boutique que si vous en avez l'autorisation expresse du gérant." },
  { type: "h3", texte: "15.10 Gérer les boutiques" },
  { type: "p", texte: "Le Super Admin peut :" },
  { type: "liste", items: ["Voir toutes les boutiques créées", "Réinitialiser le mot de passe d'une boutique", "Bloquer ou débloquer une boutique", "Supprimer une boutique", "Lancer des promotions sur les abonnements", "Voir le catalogue public de chaque boutique", "Consulter le nombre de produits, clients, ventes et le CA des abonnements par boutique", "Changer l'intervalle de facturation d'une boutique", "Consulter le code de parrainage et copier le lien de parrainage d'une boutique"] },
  { type: "p", texte: "⚠️ Important : Le compte de démonstration Super Admin (superadmin@boutique.com / demo123) doit être changé en production pour des raisons de sécurité." },
  { type: "h2", texte: "16. Abonnements mensuels / annuels et parrainage" },
  { type: "p", texte: "Cette section résume les nouvelles règles d'abonnement et le système de parrainage de SamaBoutique." },
  { type: "h3", texte: "16.1 Choisir un abonnement annuel ou mensuel" },
  { type: "p", texte: "Lors de l'inscription ou de la création par le Super Admin, chaque boutique choisit un intervalle de facturation :" },
  { type: "liste", items: ["Mensuel : tarif de base, échéance fixée au 5 du mois suivant.", "Annuel : tarif de base × 12 moins la réduction globale (ex: 10% de remise). L'échéance est reculée d'un an."] },
  { type: "p", texte: "💡 Astuce : Le Super Admin peut changer l'intervalle d'une boutique à tout moment." },
  { type: "h3", texte: "16.2 Système de parrainage" },
  { type: "p", texte: "Chaque boutique dispose d'un code de parrainage unique. Le lien de parrainage est de la forme :" },
  { type: "liste", items: ["https://votre-domaine.com/register?ref=CODE_DU_PARRAIN", "Dans le tableau de bord Super Admin, consultez la colonne « Parrainage » pour voir le code, le nombre de filleuls et les récompenses reçues.", "Cliquez sur « Copier le lien » pour partager le lien d'inscription d'une boutique.", "Quand un nouveau client s'inscrit avec ce lien et choisit un abonnement annuel, son parrain reçoit automatiquement 1 mois gratuit.", "Le nombre de mois gratuits est configurable dans les paramètres globaux."] },
  { type: "p", texte: "⚠️ Important : La récompense de parrainage n'est accordée que si le nouveau client s'abonne en annuel." },
  { type: "h3", texte: "16.3 Depuis la page d'inscription" },
  { type: "p", texte: "Un nouveau client peut s'inscrire avec un code de parrainage pré-rempli depuis l'URL. Il choisit son intervalle de facturation et, s'il opte pour l'annuel, le parrain reçoit la récompense." },
  { type: "p", texte: "💡 Astuce : Partagez votre lien de parrainage sur WhatsApp, Instagram ou par SMS pour recruter de nouvelles boutiques." },
  { type: "h2", texte: "17. FAQ et dépannage" },
  { type: "h3", texte: "Je ne reçois pas les commandes WhatsApp" },
  { type: "p", texte: "Vérifiez que votre numéro WhatsApp est bien renseigné dans votre profil boutique. Le catalogue utilise ce numéro pour envoyer les messages." },
  { type: "h3", texte: "Mon compte est bloqué" },
  { type: "p", texte: "Votre abonnement mensuel ou annuel est peut-être en retard ou le Super Admin a suspendu votre boutique. Contactez-le pour régulariser la situation et débloquer votre compte." },
  { type: "h3", texte: "Le paiement Orange Money / Wave ne marche pas" },
  { type: "p", texte: "Le paiement mobile en ligne nécessite un compte marchand (Wave Business ou Orange Money Marchand) et une configuration. Tant qu'il n'est pas activé, utilisez les espèces, le QR code marchand ou le paiement à la livraison." },
  { type: "h3", texte: "Un produit n'apparaît pas dans le catalogue" },
  { type: "p", texte: "Vérifiez que le produit est bien créé et que sa quantité en stock est supérieure à 0." },
  { type: "h3", texte: "Je ne vois pas le menu Employés / Promotions / Fournisseurs" },
  { type: "p", texte: "Ces menus sont réservés aux admins. Si vous êtes vendeur, demandez à votre gérant de vous donner le rôle admin." },
  { type: "h3", texte: "J'ai oublié mon mot de passe" },
  { type: "p", texte: "Contactez le Super Admin ou l'admin de votre boutique pour qu'il réinitialise votre mot de passe." },
  { type: "h3", texte: "L'application est lente" },
  { type: "p", texte: "Vérifiez votre connexion internet. Si le problème persiste, rechargez la page ou contactez le support." },
  { type: "p", texte: "💡 Astuce : Pour toute question supplémentaire, contactez le support de SamaBoutique." },
  { type: "p", texte: "SamaBoutique — Votre boutique, simplifiée." },
];

/** Transforme un titre en identifiant d'ancre (pour les liens du sommaire) */
export function ancreDe(titre: string) {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
