# OPlanFeu

Éditeur de dossier lumière, dans une seule page web — *a lighting dossier editor in a single web page.*

Par **Mart1ver**.

Ouvrir `index.html` dans un navigateur (ou la page publiée sur GitHub Pages). Tout est lu et calculé dans le navigateur : rien n'est envoyé à un serveur.

## Ce que fait la première version

- **Import**
  - **MVR** exporté de WYSIWYG, Capture, Vectorworks ou grandMA3 : projecteurs, patch, positions (perches), calques, coordonnées 3D, structures, types GDTF avec le nombre de canaux de chaque mode.
  - **CSV de patch** : rapport *Spots* de WYSIWYG, export Capture, export grandMA2 / grandMA3 ou de Give Me The Patch.
- **Projecteurs** : un tableau à compléter et corriger (Fix ID, unit, patch, position, calque, gélatine, accessoires, fonction, notes) ; tri par colonne, recherche, filtres par position et par type ; sélection multiple (Maj+clic pour une plage) pour remplir un champ, numéroter ou supprimer d'un coup. Entrée passe à la ligne suivante.
- **Positions** : par perche ou par pont, le nombre et les types de projecteurs, la hauteur moyenne, et les poids et puissances totaux quand ils sont renseignés.
- **Inventaire** : quantités par type tirées du dossier, stock du lieu à renseigner, ce qui manque, poids et puissance par type.
- **Alertes** : Fix ID en double, adresses de départ en double, plages DMX qui se chevauchent, projecteurs sans patch.
- **Enregistrer** le dossier en `.json` (à rouvrir plus tard ou à envoyer), **exporter le patch** en CSV pour [Give Me The Patch](https://github.com/mart1ver/GiveMeThePatch) (feuilles de patch, étiquettes), **imprimer** la vue affichée.

Le dossier est aussi gardé dans le navigateur au fil des modifications.

## Étapes suivantes

1. Bibliothèque de types (poids, puissance, dimensions), depuis les GDTF ou à la main.
2. Inventaire du lieu : stock, numéros de série, état, liste de sortie de matériel.
3. Plan feu 2D imprimable.
4. Vue 3D de la salle, des structures et des projecteurs.
5. Dossier complet imprimable et export MVR.

## Licence

Logiciel libre sous licence **GNU GPL v3 ou ultérieure** (fichier `LICENSE`).

---

**English.** OPlanFeu opens MVR files (WYSIWYG, Capture, Vectorworks, grandMA3) and patch CSVs, and turns them into an editable lighting dossier: fixtures table with bulk editing, positions summary, inventory with venue stock and missing items, patch alerts, JSON save, and patch export for Give Me The Patch. Everything runs in the browser. License: GNU GPL v3 or later.
