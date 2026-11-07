# Mario Run EPS — V131.57, version validée sur iPad

Cette branche part de la **V131.56 publiée**, commit
`c2255f4a6875670792b18581e4552c28b09a7fa7`. Elle prépare la V131.57 sur
`feat/v131.57-ergonomie-ipad`. La fusion et la publication de l’application
principale attendent une validation explicite.

La version a été validée sur iPad par le propriétaire. Les notes de version,
les contrôles et la procédure de publication sont dans
[RELEASE_V131.57.md](RELEASE_V131.57.md).

## Trois écrans ciblés

- **Mes classes / accueil de classe** : identité compacte, ajout de classe avant
  la grille, gestion repliable par classe, sauvegardes regroupées. Une classe
  propose Préparer ou Reprendre selon l’existence d’un brouillon ; la reprise
  ouvre les relevés conservés sans démarrer le minuteur. Suivi et historique
  restent accessibles dans des détails.
- **Préparation** : les modes Essentiel, Avancé et Expert partagent quatre étapes :
  Séance choisie, Participants, Déroulement, Vérifier et démarrer. Les paramètres
  existants restent disponibles dans leur contexte. Les avertissements demeurent
  visibles même si la section est repliée. Fiches et Ouvrir la séance gardent une
  place stable ; les en-têtes annoncent leur état ouvert/fermé.
- **Séance** : minuteur et navigation des relevés partagent un bandeau ancré sous
  la hauteur réelle de l’en-tête. Identité, cible, saisie et pièces sont
  prioritaires ; vitesse/historique, aide et opérations secondaires se déplient
  en ligne. Pause/Reprise et annulation de la dernière saisie restent immédiates.
  Chaque validation est liée au relevé affiché et bloquée dès le premier toucher.
  Un relevé validé affiche son état et une action distincte « Corriger » ; sa
  saisie est verrouillée jusqu’à cette correction. Une séance terminée remplace
  le bouton de clôture par son état et les accès à la suite, au bilan et aux sauvegardes.
  La saisie des relevés reste silencieuse, y compris l’amorçage audio au toucher ;
  Démarrer/Reprendre conserve cet amorçage pour les signaux de course sur iPad.

Dans Classement, les vignettes d’équipes de l’historique utilisent le même format
30 × 41 px qu’en préparation du Grand Prix. Ce style ne concerne que l’historique.

Les nouveaux dépliages conservent temporairement leur état lors des
rafraîchissements. Cet état de présentation ne modifie pas les classes ni leurs
sauvegardes. Les préférences de préparation existantes restent utilisées.

## Périmètre préservé

Les cartes Grand Prix, leurs définitions, leurs images et leurs composants ne
sont pas modifiés. Les médias intégrés (pastilles, cartes, animations et sons),
les fiches A4 et le générateur PDF sont conservés.

Les calculs, montants, bonus et malus, les instantanés de pièces V131.56, les
crédits, les phases/rotations du minuteur et les fonctions de sauvegarde
restent identiques à la version publiée. La régularité conserve notamment ses
conditions : au moins deux relevés attendus, 80 % identiques, course complète,
aucune marche, attribution automatique.

Le schéma de données reste **4**, l’enveloppe des sauvegardes **2**, avec les mêmes
clés localStorage et bases IndexedDB. Aucune migration ni réécriture historique.
Le champ facultatif `finishedAt` est ajouté uniquement lors d’une nouvelle clôture
explicite, pour la mémoriser après rechargement ; les anciennes séances restent lisibles.
Le chargeur et le service worker changent uniquement leurs identifiants de
version pour la future mise à jour hors ligne.

## Sources et reconstruction

`src/home-*.js`, `src/preparation-*.js`, `src/session-view.js`,
`src/session-timer-ui.js` et `src/session-entry-ui.js` contiennent les présentations
ciblées. Les feuilles `*-v13157.css` limitent leurs styles aux écrans
concernés. `src/v13157-disclosures.js` conserve seulement l’état UI temporaire.
Les sources de calcul et de détail financier V131.56 sont gardées sans changement.

`scripts/build.cjs` relit les trois gzip du commit publié fixé ci-dessus et
remplace les blocs d’interface et de validation identifiés, avec contrôles des ancres.
Les deux premiers fragments sont repris octet pour octet ; seul le troisième
est recompressé. Le commit de référence doit être présent dans l’historique Git.

Avec Node.js 20 ou supérieur, sans installation de dépendances :

```sh
npm run build
npm test
npm run check
node scripts/build.cjs --extract
```

L’extraction écrit les documents complets V131.56/V131.57 dans `work/`, ignoré par
Git. GitHub Actions exécute les contrôles sans étape de déploiement.

## Vérifications et validation iPad

Les tests V131.56 restent exécutés : règles de calcul, cohérence des montants,
504 scénarios de comparaison, deux validations de séance, sauvegardes intégrales
et par classe, et un cycle de six classes de 35 élèves sur dix séances.

Les tests V131.57 vérifient les trois modes de préparation, les actions/champs
conservés, les alertes visibles, la reprise sans modification de brouillon, les
états vide/marche/complet, les phases du minuteur et les dépliages. Les blocs
de validation sont aussi testés contre les doubles touchers, les confirmations
annulées ou périmées et les doubles crédits/clôtures. Les boucles de crédit et les
instantanés enregistrés restent identiques à la V131.56. Les blocs
protégés et tous les médias intégrés sont comparés au commit publié. Les contrôles
des cibles tactiles et du bandeau iPad sont structurels : ils ne remplacent pas
une validation visuelle sur Safari.

Sur la prévisualisation isolée, vérifier en portrait et paysage :

1. Mes classes, Ajouter, Gérer, Archives et état des sauvegardes.
2. La trame de préparation dans les trois modes, les paramètres personnalisés,
   l’état des sections après une modification et les avertissements repliés.
3. Reprendre un brouillon, Pause/Reprise, navigation des relevés, saisie
   incomplète, marche, correction, détail des pièces et validation du relevé.
4. Défilement avec minuteur/navigation visibles, absence de recouvrement des
   commandes et netteté des pastilles.
5. Fiches A4/PDF, sauvegarde/restauration d’une copie et rechargement hors ligne
   après une première ouverture complète avec connexion.

Ces vérifications ont été complétées par la validation du propriétaire sur iPad.
La sauvegarde externe des données réelles et l’autorisation de fusion/publication
constituent les prochaines étapes décrites dans les notes de version.
