# Spec — Désactiver la rotation automatique des joueurs

Date : 2026-06-11
Statut : validé (en attente de relecture utilisateur)

## Contexte

En match live, `MatchContext` applique une rotation automatique au side-out :
quand notre équipe marque alors que `opponentServing === true`, le reducer
appelle `applyRotation` puis `applyAutoLiberoSwap` (cas `PLAYER_ACTION` et
`OPP_FAULT`). Un bouton ↻ dans le footer de `LiveStatsScreen` permet aussi une
rotation manuelle via l'action `ROTATE`.

Certains coachs veulent piloter les rotations eux-mêmes. On ajoute donc un
réglage pour désactiver la rotation auto et passer en mode 100 % manuel.

## Objectif

Permettre au coach d'activer/désactiver la rotation automatique **pendant le
match**, depuis `LiveStatsScreen`. Quand elle est désactivée, plus aucune
rotation auto au side-out ; le coach tourne via le bouton ↻.

## Décisions (brainstorming)

- **Comportement OFF** : rotation 100 % manuelle. Aucun `applyRotation` auto au
  side-out. Le suivi du service (`opponentServing`) continue normalement.
- **Emplacement du toggle** : dans `LiveStatsScreen` (footer, près du ↻).
  Basculable à tout moment. État porté par `MatchContext`.
- **Bouton ↻ quand auto ON** : toujours actif (override/correction manuelle
  possible, comportement actuel inchangé).
- **Défaut** : rotation auto **activée** (`autoRotateEnabled = true`), pour ne
  pas changer l'expérience existante.

## Changements

### 1. État — `MatchContext`

- Ajouter `autoRotateEnabled: boolean` au state, initialisé à `true`.
- Nouveau type d'action `TOGGLE_AUTO_ROTATE` dans `ACTION_TYPES`.
- Exposer `toggleAutoRotate: () => void` dans `actions`.
- Réinitialisation : le toggle persiste sur toute la durée du match (n'est pas
  remis à `true` entre les sets). Confirmer le comportement au moment du reset de
  set / nouveau match selon la logique de reset existante — par défaut on
  conserve la valeur courante.

### 2. Reducer — side-out conditionnel

Dans `PLAYER_ACTION` (bloc `if (playerAction.mine && state.opponentServing)`,
~L436) et `OPP_FAULT` (`if (state.opponentServing)`, ~L524) :

- N'exécuter `applyRotation` + `applyAutoLiberoSwap` que si
  `state.autoRotateEnabled` est `true`.
- `opponentServing` continue de basculer comme aujourd'hui, **indépendamment**
  du toggle (le suivi du service reste juste).
- Quand auto désactivé : `rotated` reste `undefined` → pas de marqueur rotation
  dans l'historique → cohérence de l'undo préservée.

Pseudocode (PLAYER_ACTION) :

```ts
if (playerAction.mine && state.opponentServing) {
  if (state.autoRotateEnabled) {
    const rotatedPlayers = applyRotation(updatedPlayers);
    const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
    finalPlayers = result.players;
    newLiberoReplacements = result.newLiberoReplacements;
    rotated = true;
    liberoAutoSwapped = result.swapInfo;
  }
  newOpponentServing = false;
} else if (!playerAction.mine) {
  newOpponentServing = true;
}
```

### 3. Reducer — `ROTATE` : parité libéro

Aujourd'hui `ROTATE` (~L635) fait un `map` inline et **n'applique pas** le swap
libéro auto, contrairement à la rotation auto. En mode manuel, le coach perdrait
ce swap. On aligne le comportement :

```ts
case ACTION_TYPES.ROTATE: {
  const rotatedPlayers = applyRotation(state.matchPlayers);
  const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
  return {
    ...state,
    matchPlayers: result.players,
    liberoReplacements: result.newLiberoReplacements,
  };
}
```

Note : `ROTATE` n'enregistre pas d'entrée d'historique aujourd'hui. Hors scope
de ce spec (comportement inchangé) sauf si la relecture l'exige.

### 4. UI — `LiveStatsScreen` footer

- Ajouter un `Switch` (ou bouton on/off) étiqueté « Rotation auto » dans le
  footer, à côté du bouton ↻.
- `value={autoRotateEnabled}` / `onValueChange={matchActions.toggleAutoRotate}`.
- Bouton ↻ inchangé : toujours actif, dans les deux modes.
- Styles : ajouter le nécessaire dans `LiveStatsScreen.styles.ts` avec les
  tokens de `constants/theme.ts` (COLORS/SPACING/FONT_SIZE).

## Cas limites

- **Toggle OFF puis side-out** : pas de rotation, `opponentServing` passe à
  `false`. Le coach presse ↻ quand il le souhaite.
- **Toggle ON↔OFF en cours de set** : autorisé, sans effet rétroactif sur les
  points déjà saisis.
- **Undo** : inchangé. En mode OFF aucune action n'est marquée `rotated`, donc
  l'undo ne tente pas d'annuler une rotation inexistante.

## Hors scope

- Persistance globale du réglage entre matchs (réglage app).
- Choix au setup (avant match).
- Geler totalement les positions (interdire aussi le manuel).
- Override « sauter une rotation » ponctuel en mode auto.

## Tests

- Reducer : side-out avec `autoRotateEnabled = false` → positions inchangées,
  `opponentServing` basculé, pas de `rotated` en historique.
- Reducer : side-out avec `autoRotateEnabled = true` → rotation + libéro swap
  (comportement actuel non régressé).
- Reducer : `ROTATE` déclenche le swap libéro auto.
- Reducer : `TOGGLE_AUTO_ROTATE` inverse `autoRotateEnabled`.