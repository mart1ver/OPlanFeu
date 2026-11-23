# OPlanFeu

Éditeur de dossier lumière, dans une seule page web — *a lighting dossier editor in a single web page.*

Par **Mart1ver**.

Ouvrir `index.html` dans un navigateur (ou la page publiée sur GitHub Pages). Tout est lu et calculé dans le navigateur : rien n'est envoyé à un serveur.

## Ce que fait la première version

- **Import**
  - **MVR** exporté de WYSIWYG, Capture, Vectorworks ou grandMA3 : projecteurs, patch, positions (perches), calques, coordonnées 3D, structures, types GDTF avec le nombre de canaux de chaque mode.
  - **CSV de patch** : rapport *Spots* de WYSIWYG, export Capture, export grandMA2 / grandMA3 ou de Give Me The Patch.
- **Projecteurs** : un tableau à compléter et corriger (Fix ID, unit, patch, position, calque, gélatine, accessoires, fonction, notes) ; tri par colonne, recherche, filtres par position et par type ; sélection multiple (Maj+clic pour une plage) pour remplir un champ, numéroter ou supprimer d'un coup. Entrée passe à la ligne suivante.
- **Accroches et charges** : les points d'accroche du lieu (perches, porteuses, ponts, passerelles, murs, verticales, sol…), créés à partir des positions du dossier puis complétés à la main : type, longueur, hauteur, CMU totale ou CMU au mètre, ajouts (pont, moteur, décor). Pour chaque point : poids des projecteurs + forfait accessoires par projecteur (1,5 kg par défaut, réglable) + ajouts, comparé à la CMU, avec jauge et état (OK, proche de la CMU, dépassée, à vérifier si des poids manquent). Le lieu s'enregistre à part (`.lieu.json`) pour être rechargé sur un autre dossier. Imprimable en feuille de charges.
- **Électricité** : tableaux (tri ou mono, calibre, emplacement) et lignes (graduées, toujours monophasées, ou directes, phase L1/L2/L3 ou tri, calibre, point d'arrivée, gradateur et adresse DMX du gradateur), avec création en série (préfixe, numéros, phases en rotation). Les projecteurs se branchent sur une ligne dans l'onglet Projecteurs (colonne « Ligne élec. », ou « Lignes à la suite… » sur une sélection). Puissance et charge de chaque ligne, courant par phase et déséquilibre de chaque tableau, alertes de surcharge. **Synoptique** unifilaire imprimable par tableau et **étiquettes** de tableaux et de lignes à découper. Tableaux et lignes font partie du fichier de lieu.
- **DMX et réseau** :
  - *Univers* : chaque univers du patch avec son numéro sACN et son adresse Art-Net (net:sub:uni, décalage réglable), le nombre de projecteurs, les canaux utilisés, la dernière adresse et les lignes DMX qui le portent.
  - *Lignes DMX* : source (console, node, splitter), port, univers, point d'arrivée, longueur ; création en série (ports et univers qui s'incrémentent) ; « Répartir automatiquement » raccroche chaque projecteur à la ligne de même univers et de même position ; chaînage dans l'ordre en x. Colonne « Ligne DMX » dans les projecteurs.
  - *Réseau* : protocole (Art-Net ou sACN), réseau, masque, passerelle, et tous les appareils (consoles, nodes, switches, ordinateurs, serveurs média…) avec IP, masque, VLAN, switch et port, MAC, emplacement. Adresses en double, hors réseau et ports de switch pris deux fois signalés.
  - *Étiquettes DMX* : une étiquette au départ et une à l'arrivée de chaque ligne, et en option une par projecteur pour les jarretières.
- **Types et inventaire** : chaque type garde son fichier **GDTF** dans le dossier (tiré du MVR, ajouté avec un bouton ou en déposant un `.gdtf` sur la page, téléchargeable) ; modes et canaux, poids et puissance (lus dans le GDTF ou saisis), quantités du dossier, stock du lieu et ce qui manque.
- **Alertes** : Fix ID en double, adresses de départ en double, plages DMX qui se chevauchent, projecteurs sans patch, points d'accroche au-delà ou proches de la CMU, points sans CMU.
- **Enregistrer** le dossier en `.json` (à rouvrir plus tard ou à envoyer), **exporter le patch** en CSV pour [Give Me The Patch](https://github.com/mart1ver/GiveMeThePatch) (feuilles de patch, étiquettes), **imprimer** la vue affichée.

Le dossier est aussi gardé dans le navigateur au fil des modifications.

## Étapes suivantes

1. Étiquettes de tête de perche ; reprise des feuilles de patch et étiquettes de Give Me The Patch.
2. Plan feu 2D imprimable, puis vue 3D.
3. Dossier complet imprimable et export MVR.

## Licence

Logiciel libre sous licence **GNU GPL v3 ou ultérieure** (fichier `LICENSE`).

---

**English.** OPlanFeu opens MVR files (WYSIWYG, Capture, Vectorworks, grandMA3) and patch CSVs, and turns them into an editable lighting dossier: fixtures table with bulk editing, rigging points with working load limits and load per point (fixture weights + per-fixture accessory allowance + extras), electrical boards and lines (dimmed/direct, phases, ratings) with load per line, phase balance, printable one-line diagram and board labels, DMX universes (sACN / Art-Net), DMX lines with daisy chains and cable labels, lighting network devices with IP checks, type library keeping each GDTF file, inventory with venue stock and missing items, patch and load alerts, JSON save, and patch export for Give Me The Patch. Everything runs in the browser. License: GNU GPL v3 or later.
