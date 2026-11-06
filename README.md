# Mario Run EPS — préparation V131.56

Cette branche prépare deux corrections à partir de la V131.55 publiée sur `main`
(commit `1ec9464c1ee82c0d8c2dfcadfb5b35212a969b95`). Elle n’est pas une publication.
La fusion et la mise en ligne attendent la validation du propriétaire.

## Corrections

- **Malus :** le numéro de la séance en cours est le nombre de séances validées
  dans la classe, plus un. Le titre n’intervient jamais. Le réglage
  `malusStartSession`, sa valeur par défaut et son plancher existant sont conservés.
- **Régularité :** la course doit comporter au moins deux relevés attendus. Une
  même valeur doit représenter au moins 80 % du nombre total de relevés attendus
  pour cette course. Tous les relevés doivent être renseignés
  et aucune marche ne doit être enregistrée. La fréquence est comptée séparément
  pour chaque course, sans arrondir le pourcentage.

| Relevés identiques / attendus | Bonus de régularité |
| --- | --- |
| 4/5 | Oui |
| 3/5 | Non |
| 8/10 | Oui |
| 2/3 | Non |
| 1/1 | Non (minimum de deux relevés attendus) |
| 2/2 | Oui |

Le statut devient automatique. Le calcul des gains réévalue la règle, même si un
ancien brouillon contient un indicateur `rg` attribué manuellement. L’ancien
bouton ne permet plus de basculer ce statut.

## Sources et reconstruction

La V131.55 contient un chargeur `index.html` et trois fragments HTML compressés.
Le chargeur les décompresse, les concatène **en octets**, puis décode le HTML en
UTF-8. Le document contient le code de l’application et ses ressources intégrées.

Les fonctions de saisie et de calcul concernées ont été reconstituées dans
`src/session-scoring.js`. `scripts/build.cjs` relit les archives du commit V131.55
fixé ci-dessus, réinjecte ces fonctions et applique les deux changements ciblés
au contrôle de régularité. Il actualise aussi les libellés PWA, les URL de cache
et le nom du cache du service worker pour la future V131.56.

Les ressources, les écrans sans rapport et le moteur de stockage sont repris
sans modification. Les fragments `app-part-1.gz` et `app-part-2.gz` sont conservés
à l’identique ; seul `app-part-3.gz` doit être recompressé. Le commit de référence
doit être disponible dans l’historique Git, y compris dans un clone peu profond.

Avec Node.js 20 ou supérieur, sans installation de dépendances :

```sh
npm run build
npm test
npm run check
```

Ces contrôles sont aussi lancés par GitHub Actions sur cette branche et sur les
pull requests. Le workflow ne contient aucune étape de publication.

Pour consulter le document complet avant et après reconstruction :

```sh
node scripts/build.cjs --extract
```

Les documents sont écrits dans `work/`, ignoré par Git. Le build échoue si les
points de remplacement ne correspondent pas exactement à la V131.55 attendue.
Pour tolérer les différences entre versions de zlib, un troisième gzip valide est
conservé si son contenu décompressé est identique ; les deux premiers restent vérifiés octet par octet.

## Compatibilité et vérifications

Le schéma des données reste **4**, l’enveloppe de sauvegarde reste **2**. Les clés
localStorage, la base IndexedDB, ses stores et les formats d’import/export sont
conservés. Aucun nouveau champ n’est nécessaire. Les brouillons V131.55 restent
lisibles ; leurs gains sont calculés selon les règles corrigées. Les séances déjà
validées, leurs deltas, les soldes et les historiques ne sont pas recalculés.

Les tests automatiques couvrent les seuils de régularité, les courses incomplètes,
les tableaux tronqués ou creux, la marche, les valeurs numériques anciennes, les
courses indépendantes, les indicateurs manuels, les titres trompeurs et les seuils
de malus personnalisés. Ils vérifient aussi le code livré dans les gzip et les
sauvegardes complètes/par classe, avec encodage et décodage réels sur des données
synthétiques représentatives du format V131.55.

La validation sur un véritable iPad et avec une copie de sauvegarde réelle reste
à effectuer avant publication. Ne pas supprimer la PWA installée : ses données
restent enregistrées localement sur l’appareil.
