# Live Match Analysis Tab — Design Spec

**Date:** 2026-06-07
**Branch:** feat/live-stats
**Status:** Approved

---

## Objectif

Ajouter un 4e onglet "Live" à `MatchDetailScreen` qui consomme l'endpoint `GET /api/v1/matches/{matchId}/live-stats/analysis` et affiche les stats live d'un match : actions équipe, trajectoires d'attaques, aces par zone, timeline par set, stats par joueur.

---

## Navigation

Aucun changement dans `App.tsx`, `HomeScreen`, ni `StatsHubScreen`.

Flux existant inchangé :
```
Home → Stats → Sélection équipe → StatsHub → Stats matchs → TeamMatchListScreen → MatchDetailScreen → onglet "Live"
```

L'onglet "Live" est visible sur tous les matchs. Si le match n'a pas de stats live, l'onglet affiche un état vide explicite (404 géré côté front).

---

## Fichiers

### Nouveaux
```
src/components/FIVBCourtDiagram/
  index.ts
  FIVBCourtDiagram.tsx
  FIVBCourtDiagram.styles.ts
  FIVBCourtDiagram.types.ts

src/data/liveStatsAnalysis.ts       ← types TS uniquement
```

### Modifiés
```
src/screens/MatchDetailScreen.tsx   ← 4e onglet + LiveTab + ActionsBlock
src/data/matchApi.ts                ← getLiveMatchAnalysis()
```

---

## Couche données

### Types — `src/data/liveStatsAnalysis.ts`

Types extraits de l'API doc, aucune logique :

```ts
type ActionCount = { key: string; label: string; count: number };
type ActionStats = { points: ActionCount[]; faults: ActionCount[]; neutral: ActionCount[] };
type AceZone    = { zone: number; count: number };
type AttackZone = {
  playerPosition: number | null;
  from: number | null;
  to: number | null;
  result: 'attack_pt' | 'attack_no_pt' | 'attack_fault';
  count: number;
};
type ScopeStats = { actions: ActionStats; acesByZone: AceZone[]; attacks: AttackZone[] };
type TimelineEntry = {
  myScore: number; oppScore: number;
  playerId: number | null; action: string; occurredAt: string;
};
type SetAnalysis = {
  setNumber: number; myScore: number; oppScore: number;
  wonBy: 'mine' | 'opp' | null;
  stats: ScopeStats; timeline: TimelineEntry[];
};
type PlayerSetStats  = { setNumber: number; stats: ScopeStats };
type PlayerAnalysis  = {
  playerId: number; jersey: number; name: string;
  matchStats: ScopeStats; setStats: PlayerSetStats[];
};
type LiveMatchAnalysis = {
  matchId: string;
  globalStats: ScopeStats;
  sets: SetAnalysis[];
  players: PlayerAnalysis[];
};
```

### API — `matchApi.ts`

```ts
getLiveMatchAnalysis(matchId: string): Promise<LiveMatchAnalysis>
// GET /api/v1/matches/{matchId}/live-stats/analysis
// 404 → rejette avec { status: 404 } — le LiveTab détecte le code et passe en état 'not_found'
```

Chargement lazy : l'appel est déclenché au premier rendu de `LiveTab`, pas au mount de `MatchDetailScreen`.

États internes : `'loading' | 'error' | 'not_found' | 'ok'`.

---

## Composant `FIVBCourtDiagram`

### Layout terrain (SVG, `react-native-svg`)

```
┌───┬───┬───┐
│ 4 │ 3 │ 2 │  ← ligne avant
├───┼───┼───┤
│ 5 │ 6 │ 1 │  ← ligne arrière
└───┴───┴───┘
```

### Props

```ts
type FIVBCourtDiagramProps =
  | { mode: 'attacks'; data: AttackZone[] }
  | { mode: 'aces';    data: AceZone[]    }
```

### Mode `attacks`

- Flèche `from → to` pour chaque entrée avec `from != null && to != null`
- Couleur par résultat :
  - `attack_pt`    → `COLORS.green`
  - `attack_no_pt` → `COLORS.yellow`
  - `attack_fault` → `COLORS.red` (pas de flèche, croix sur zone `playerPosition`)
- Épaisseur de trait proportionnelle au `count` (min 1.5px, max 4px)
- Si `from == null` (faute), croix SVG centrée sur la zone `playerPosition`

### Mode `aces`

- Zones colorées `COLORS.yellow` avec opacité `count / max` (min opacité 0.1 si count > 0)
- Zones sans ace = non colorées

---

## `MatchDetailScreen` — modifications

### Onglet ajouté

```ts
const TABS = [
  { id: 'resume',  label: 'Résumé'  },
  { id: 'sets',    label: 'Par set' },
  { id: 'players', label: 'Joueurs' },
  { id: 'live',    label: 'Live'    },  // ← nouveau
];
```

### Composant `ActionsBlock` (interne, non exporté)

Remplace le besoin d'afficher les actions du nouveau format. Affiche trois rangées de `StatCell` :
- Points → `COLORS.greenLight`
- Fautes → `COLORS.redLight`
- Neutres → `COLORS.textMuted`

```ts
type ActionsBlockProps = { actions: ActionStats };
```

### Composant `LiveTab`

`ScrollView` avec 3 blocs :

#### 1. Résumé global (toujours ouvert)

```
[ActionsBlock globalStats.actions]
[FIVBCourtDiagram mode="attacks" data=globalStats.attacks]
[FIVBCourtDiagram mode="aces"    data=globalStats.acesByZone]
```

#### 2. Par set (collapsible, un par set)

Header : `Set N — myScore–oppScore — V / D`

Contenu expandé :
```
[SetGraph timeline=set.timeline]          ← composant existant réutilisé
[ActionsBlock set.stats.actions]
[FIVBCourtDiagram mode="attacks" data=set.stats.attacks]
[FIVBCourtDiagram mode="aces"    data=set.stats.acesByZone]
```

#### 3. Joueurs (collapsible, un par joueur)

Header : `#jersey — name`

Contenu expandé :
```
[ActionsBlock player.matchStats.actions]
  └── sous-accordéon par set :
      "Set N" → [ActionsBlock player.setStats[n].stats.actions]
```

Pas de diagrammes terrain par joueur (densité trop élevée).

---

## Gestion d'erreurs

| État       | Affichage                                              |
|------------|--------------------------------------------------------|
| `loading`  | `ActivityIndicator` centré                             |
| `not_found`| Message "Pas de stats live pour ce match" + icône info |
| `error`    | Message erreur + bouton Réessayer                      |
| `ok`       | Contenu LiveTab                                        |

---

## Contraintes

- Pas de `any`, pas d'assertion `!` (early return partout)
- Styles dans `MatchDetailScreen.tsx` existant (fichier < 250 lignes → pas de split styles nécessaire, mais si le fichier dépasse 400 lignes après ajout, créer `MatchDetailScreen.styles.ts`)
- `FIVBCourtDiagram` doit fonctionner avec `data=[]` sans crash
- `SetGraph` réutilisé, mais sa prop `timeline` est typée `MatchDetailTimelineEntry[]`. Le composant n'accède qu'à `myScore` et `oppScore`. Changer la prop en `{ myScore: number; oppScore: number }[]` pour accepter les deux formats sans casser l'existant.
