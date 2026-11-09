# Mode de match 4x4 — design

Date : 2026-11-09
Statut : en attente de validation

## Intention

L'app est conçue pour le volley à 6. Pour un match à 4, il faut aujourd'hui déclarer 6 joueurs, gérer une rotation et un libéro qui n'existent pas. L'objectif est d'ajouter un **format 4x4**, choisi à la création du match, qui supprime ce qui ne sert pas et garde tout le reste à l'identique.

Les matchs 4x4 sont rattachés à une équipe dédiée. Ils n'apparaissent donc que dans les stats de cette équipe, sans filtre particulier.

## Règles du 4x4 (décidées par l'utilisateur)

- 4 joueurs sur le terrain, avec un **placement fixe qui ne bouge jamais** : 3 devant, 1 derrière au centre.
- Un poste par place :
  | Poste | Zone |
  |---|---|
  | R4 (« 4 ») | 4 (avant gauche) |
  | Central | 3 (avant centre) |
  | Pointu (« 2 ») | 2 (avant droit) |
  | Passeur | 6 (arrière centre) |
- **Pas de rotation**, ni automatique ni manuelle.
- **Pas de libéro.**
- Score identique au 6x6 : sets de 25 points, 3 sets gagnants, tie-break à 15, 2 points d'écart.
- Remplacements identiques au 6x6 : banc, max 6 par set, règle des paires, le remplaçant prend la place et le poste du sortant.

## Objectifs

- Choisir le format « 6 x 6 / 4 x 4 » sur `MatchSetupScreen`. **6x6 par défaut.**
- Convocation (`RosterScreen`) : en 4x4, on valide avec exactement 4 joueurs « terrain », compteur `Terrain x/4`, et aucune option libéro.
- Avant chaque set (`SetSetupScreen`) : en 4x4, le terrain affiche 3 cases devant et 1 derrière au centre. Chaque case est étiquetée par son poste et sa zone. On choisit le joueur de chaque case. **Le poste découle de la case**, donc pas d'étape « rôle » séparée ni de contrôle de composition. Le bouton de démarrage s'active quand les 4 cases sont remplies. Le banc fonctionne comme en 6x6.
- Saisie en direct (`LiveStatsScreen`) : chez nous, 4 cases (4, 3, 2 devant et 6 derrière au centre). Chez l'adversaire, même disposition en miroir (6 au fond centre, puis 2, 3, 4 au filet). Masquer l'interrupteur « Rotation auto », le bouton ↻ et la barre libéro.
- Onglets en direct : en 4x4, masquer l'onglet « 5-1 » (`PositionScreen`). L'onglet « Positions » (`LivePositionSetupTab`) reprend la grille 4 cases avec les mêmes règles que `SetSetupScreen` en 4x4.
- Le 6x6 garde exactement son comportement actuel.

## Non-objectifs

- Aucun changement backend ni contrat API. Pas de champ « format » envoyé au serveur. Les postes 4x4 font déjà partie de l'enum backend (`R4`, `Central`, `Passeur`, `Pointu`), et les zones 4, 3, 2, 6 font partie du 1–6 accepté.
- Pas de filtre ni de badge 4x4 dans les stats ou l'historique.
- Pas d'autres règles de score pour le 4x4.
- Ne pas toucher au code mort (`LiveMatchStatsScreen.tsx`, `FIVBCourtDiagram.tsx`).

## Anti-objectifs (échec même si « ça marche »)

- Une régression sur le 6x6 : rotation, libéro, compo 2-2-1-1, onglet 5-1.
- Un match 4x4 qui exige quand même 6 joueurs, ou qui laisse une trace de rotation ou de libéro (bouton visible, rotation auto déclenchée au changement de service, échange de libéro).
- Un poste ou une zone envoyé au backend hors de l'enum ou de 1–6, qui provoquerait une erreur 400.

## Contraintes

- Respecter `CLAUDE.md` : TypeScript strict, pas de `any` ni de `!`, tokens de `constants/theme.ts`, `StyleSheet.create`, une seule source de vérité, valeurs dérivées plutôt que de l'état parallèle.
- Le format est stocké **une seule fois**, dans `MatchState`, via le payload de `SETUP_MATCH`, et remis à zéro pour un nouveau match. Tout le reste en dérive (taille du terrain, rotation activée, libéro autorisé, grilles).

## Décidé par moi (à vérifier par l'utilisateur)

- **Le format est choisi par match, pas porté par l'équipe.** Le backend ne connaît pas de format d'équipe, et on ne touche pas au backend.
- **Les zones d'impact restent la grille spatiale 1–6.** `CourtGestureLayer` découpe chaque demi-terrain en 2×3 pour savoir où tombe le ballon (zone, zoneStart des trajectoires, zone d'ace). C'est une zone du terrain, pas un joueur, et elle reste donc 1–6 en 4x4. Seules les **cases joueurs** passent à 4. Les zones 1 et 5 restent touchables comme zones d'impact, mais aucune case joueur n'y est dessinée.
- **Le garde-fou est dans le reducer.** Si `format === '4x4'`, `applyRotation`, `ROTATE`, `TOGGLE_AUTO_ROTATE`, `applyAutoLiberoSwap` et `LIBERO_SWAP` ne font rien. Ainsi aucun chemin d'UI oublié ne peut déclencher une rotation.
- `opponentServing` reste suivi en 4x4, parce qu'il sert au service et au live, pas seulement à la rotation.
- `lastSetStartPositionMap` est restauré au set suivant si sa taille correspond à la taille du terrain du format (aujourd'hui `=== 6` en dur).
- La grille 4x4 garde la mise en page 2×3, avec des emplacements vides en zones 1 et 5 (et 1/5 côté adversaire). Elle reste ainsi alignée avec le calcul de zone de `CourtGestureLayer`.
- Dans l'onglet « Positions » en cours de set (4x4), échanger deux cases change aussi le poste des joueurs, puisque le poste découle de la case.
- Le numéro de maillot adverse par case 4x4 reste un affichage indicatif, comme aujourd'hui avec les numéros 1–6.

## Laissé au développeur

- Comment centraliser la config par format, par exemple un `FORMAT_CONFIG` dans `src/data/` avec `courtSize`, `slots` (zone → poste), les lignes de grille chez nous et chez l'adversaire, `rotation` et `libero`.
- Le rendu des cases vides dans les grilles 4x4 (espace vide ou case grisée).
- Le découpage des composants, par exemple une variante de grille 4x4 ou une grille générique pilotée par la config.

## Points de code connus (carte)

- Format et état : `src/screens/MatchSetupScreen.tsx` (zone des choix vers :61-85), `src/context/MatchContext.tsx` (`SETUP_MATCH` :134/:268, rotation :222-227/:361-373/:440-450/:509-512/:537-550, libéro :229-263/:552-594).
- Convocation : `src/screens/RosterScreen.tsx` (:120-171).
- Avant le set : `src/screens/SetSetupScreen.tsx` (:27, :36-41, :159-173, :188, :223, :233-295, :444).
- Constantes de terrain : `src/data/players.ts:43-45` et `src/data/liveStats.ts:124-125`.
- En direct : `src/screens/LiveStatsScreen/LiveStatsScreen.tsx` (:47-60, :72-104, :275-290, :313-363) et `CourtGestureLayer.tsx`.
- Onglets : `App.tsx:69-76` et `:324-328`, `LivePositionSetupTab.tsx`.
