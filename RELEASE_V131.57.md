# Mario Run EPS — V131.57 prête à publier

La validation sur iPad a été confirmée par le propriétaire. La publication reste
une étape distincte, à autoriser après la sauvegarde des données réelles.

## Changements

- Accueil et Mes classes allégés, actions principales plus visibles.
- Préparation organisée en quatre étapes et sections dépliables.
- Séance centrée sur le minuteur, les relevés et les pièces, avec commandes tactiles.
- Validation unique des relevés et des séances ; action Corriger distincte et état
  Séance terminée conservé après rechargement.
- Saisie des relevés silencieuse ; signaux chronométrés des courses préservés.
- Vignettes d’équipes de l’historique du classement au format 30 × 41 px, comme
  en préparation du Grand Prix.
- Export de diagnostic identifié V131.57.

Les cartes Grand Prix, pastilles, médias, animations, calculs, plafonds, bonus et
malus, détails financiers enregistrés, fiches A4 et générateur PDF sont conservés.
La régularité reste automatique : au moins deux relevés attendus, 80 % identiques,
course complète et aucune marche.

## Données et vérifications

Les clés de stockage de l’application principale, le schéma de données 4 et les
enveloppes de sauvegarde 2 sont inchangés. Aucune donnée de la prévisualisation
n’est transférée automatiquement. Aucun résultat historique n’est recalculé.
Le champ facultatif finishedAt n’est ajouté que lors d’une clôture explicite.

- 170 tests automatiques réussis : 88 tests du socle, 33 d’ergonomie, 28 de
  validation unique, 18 de saisie silencieuse et 3 sur l’historique.
- Reconstruction vérifiée, scripts analysés, sauvegardes complètes/par classe
  compressées et restaurées, médias et blocs protégés comparés au socle.
- Chromium tactile vérifié en 1024 × 768 et 768 × 1024 ; validation sur iPad
  confirmée ensuite par le propriétaire.
- Le petit texte parasite « \\n\\n » en haut de page est préexistant dans le
  socle V131.56 et reste hors de ces changements.

## Mise en service recommandée

1. Dans l’application principale V131.56 sur l’iPad habituel, exporter une
   **sauvegarde complète** vers Fichiers ou iCloud Drive et vérifier sa présence.
   Conserver cette copie extérieure à Safari et la nommer avec sa date.
2. Autoriser explicitement la fusion de la PR n°2 et la publication de V131.57.
   Le workflow présent dans le dépôt exécute seulement les tests. La configuration
   de l’hébergement doit être vérifiée avant la fusion : un hébergement lié à
   main peut publier dès la fusion. GitHub confirme que Pages est actif, mais
   l’accès à son API n’a pas permis de confirmer le mode et la source de publication.
3. Fusionner la PR n°2 après succès des contrôles et publier l’ensemble des
   **10 fichiers de l’application**, depuis un même commit, sur l’hébergement
   habituel. Conserver la même adresse et le même chemin pour retrouver le
   stockage local existant. La prévisualisation garde son adresse séparée.
4. Sur l’iPad, ouvrir cette adresse avec connexion, attendre le chargement complet,
   puis accepter Actualiser si l’application propose une mise à jour. Contrôler
   la mention PWA V131.57 dans les réglages et la présence des classes/séances.
   Garder les données Safari et l’installation existante.
5. Vérifier un PDF, une saisie et ses sons sur une classe de test, puis fermer et
   rouvrir l’application hors connexion. L’archive V131.56 et la sauvegarde exportée
   restent conservées pendant cette vérification ; le nouveau cache remplace l’ancien.
6. Une fois ces contrôles réussis, enregistrer la référence de publication
   V131.57 et conserver une nouvelle sauvegarde complète externe.

## Retour à V131.56 si nécessaire

Le socle publié est le commit c2255f4a6875670792b18581e4552c28b09a7fa7.
Rétablir ses 10 fichiers ensemble via un revert Git et un redéploiement habituel,
sur la même adresse ; éviter de mélanger les fragments gzip et les chargeurs.
Ne pas supprimer les données Safari. La restauration d’une sauvegarde est une
opération distincte à réaliser seulement si les données l’exigent, après un nouvel
export de leur état courant.

## Références

- PR : https://github.com/delpechquentinqd-afk/mario-run/pull/2
- Branche : feat/v131.57-ergonomie-ipad
- Prévisualisation isolée validée :
  https://mario-run-v13157-test-ipad.biggerwave1.chatgpt.site
- Livraison : index.html, sw.js, manifest.json, app-part-1.gz, app-part-2.gz,
  app-part-3.gz, icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png.
- Les archives de préparation et leurs empreintes sont produites dans output/ ;
  elles ne sont pas une publication.
