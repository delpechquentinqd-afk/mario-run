Mario Run EPS — Mise à jour V131.55 — correctifs PDF et cartes

CE DOSSIER CONTIENT LES SEPT FICHIERS À ENVOYER À LA RACINE DU DÉPÔT GITHUB :
- index.html (chargeur PWA, 3 Ko)
- app-part-1.gz
- app-part-2.gz
- app-part-3.gz
- sw.js (cache V131.55)
- manifest.json
- README.md (ce fichier)

CORRECTIONS :
1. Fiche Objectifs : les noms longs sont affichés dans une colonne de 202 pixels. Les lignes s'adaptent à leur hauteur ; 8 à 10 élèves par page. Les relevés sont aussi répartis sur plusieurs pages si nécessaire, sans enlever les objectifs.
2. Export PDF : correction du dessin des mots renvoyés à la ligne (le moteur ne superpose plus différentes parties d'un même nom).
3. Cartes : les 8 images présentant des marges, titres coupés ou bande claire ont été reconstruites sur un fond bleu intégral, avec titres et textes dans les limites de chaque carte. Les 6 premières cartes sont conservées sans modification.

INSTALLATION :
1. Exporter une sauvegarde externe de tes classes depuis Mario Run avant mise à jour.
2. Sur GitHub > Code > Add file > Upload files, sélectionner les 7 fichiers de CE dossier (pas le ZIP) à la racine du dépôt mario-run.
3. Valider sur main. Vérifier dans Code que index.html, sw.js et les 3 app-part-*.gz portent bien le nouveau commit (pas « 0 file changed »).
4. Attendre la coche verte dans Actions puis relancer la PWA ; version attendue en bas de « Mes classes » : PWA V131.55.
5. Tester Fiches > Objectifs > PDF A4 et l'onglet Cartes.

IMPORTANT : ne supprime pas l'application installée sur l'iPad : les classes sont enregistrées localement.
Les icônes déjà présentes dans le dépôt GitHub ne sont pas remplacées.
