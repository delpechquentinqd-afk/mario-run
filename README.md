# Mario Run EPS — V131.49 : IndexedDB principal

## Nouveauté
Mario Run enregistre désormais l’état complet des classes, élèves, séances, notes,
protocoles et réglages en **IndexedDB**, la base locale de la PWA sur cet iPad.

- Au premier lancement, migration automatique depuis la sauvegarde principale
  `localStorage`, les copies locales et l’ancien miroir IndexedDB, si nécessaire.
- Comparaison des dates de modification pour conserver la version la plus récente.
- Chargement des données terminé **avant** que les boutons de l’application deviennent actifs.
- Une écriture IndexedDB est déclenchée immédiatement à chaque sauvegarde.
- Une copie de compatibilité dans `localStorage` et les trois copies locales sont
  conservées dans la limite de stockage disponible ; l’ancien miroir reste lisible.
- Le diagnostic technique présente l’état de la base IndexedDB principale et la
  source sélectionnée lors de la migration.
- Les fichiers de sauvegarde JSON vers Fichiers / iCloud fonctionnent comme avant.

## Sécurité
**Avant de mettre à jour GitHub**, ouvrir Mario Run V131.48 sur l’iPad et faire
« Sauvegardes & transfert → Exporter une sauvegarde ». Vérifier la présence du JSON
 dans Fichiers / iCloud. La migration ne supprime pas l’ancien stockage.

Après mise à jour, ouvrir **Réglages → Diagnostics** et vérifier
« Base principale : IndexedDB · actif » et la présence des classes.
Puis fermer / rouvrir la PWA et contrôler que les classes, séances, notes et
protocoles sont toujours présents. Une restauration depuis le JSON reste possible.

**Attention :** IndexedDB est local à la PWA installée. Supprimer la PWA ou ses
données peut également supprimer cette base. Les exports externes restent essentiels.

## Mise à jour GitHub
Téléverser les **7 fichiers** du paquet `Update_GitHub` à la racine du dépôt.
Ne pas remplacer les icônes, elles sont identiques à la version précédente.
GitHub Pages redéploiera la PWA avec le cache V131.49 ; aucune réinstallation
sur l’écran d’accueil n’est nécessaire.

## Portée technique
Cette évolution remplace le **moteur de persistance**, pas le modèle métier.
Les données sont conservées en bloc JSON au sein d’un enregistrement IndexedDB
pour minimiser les risques de migration. Une normalisation en plusieurs tables
pourrait venir ultérieurement, après validation sur iPad.
