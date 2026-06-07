# Live Match Analysis Screen — Design Spec
**Date:** 2026-06-07

## Goal

New screen `LiveMatchAnalysisScreen` accessible from Statistiques → Équipe → Stats live. Fetches `getLiveMatchAnalysis(matchId)` from the backend. 4 tabs: Résumé (implemented), Par set / Joueurs / Adversaire (placeholders).

---

## Navigation

### New StatsStep values (App.tsx)

```
StatsStep = ... | 'liveMatchList' | 'liveMatchDetail'
```

### Flow

```
StatsTeamSelectionScreen
  → StatsHubScreen  [Stats matchs | Stats joueurs | Stats live ← NEW]
      → liveMatchList: TeamMatchListScreen (onSelectMatch → liveMatchDetail)
          → liveMatchDetail: LiveMatchAnalysisScreen
```

Back-button chain: `liveMatchDetail → liveMatchList → hub → teamSelection`

### StatsHubScreen change

Add third card "Stats live" with icon `📊` and description "Analyse des matchs saisie en live". Calls new `onLiveStats()` prop.

---

## Component: LiveMatchAnalysisScreen

**File:** `src/screens/LiveMatchAnalysisScreen.tsx`

**Props:**
```ts
type Props = {
  matchId: string;
  matchDate: string;
  onBack: () => void;
};
```

**State:** `loading | error | not_found | ok` + `data: LiveMatchAnalysis | null` + `activeTab: TabId`

**Tabs:** `'resume' | 'sets' | 'players' | 'opp'`
Labels: Résumé · Par set · Joueurs · Adversaire

**Loading/error states:** ActivityIndicator, error message + retry button, "Pas de stats live" for 404.

---

## Onglet Résumé

### Computed values (from API data)

```ts
const setsWonMine  = sets.filter(s => s.wonBy === 'mine').length;
const setsWonOpp   = sets.filter(s => s.wonBy === 'opp').length;
const totalMyScore = sets.reduce((a, s) => a + s.myScore, 0);
const totalOppScore= sets.reduce((a, s) => a + s.oppScore, 0);
const playerPoints = globalStats.actions.points.reduce((a, x) => a + x.count, 0);
const teamFaults   = globalStats.actions.faults.reduce((a, x) => a + x.count, 0);
const oppActual    = Math.max(0, totalOppScore - teamFaults);
const oppFaults    = Math.max(0, totalMyScore - playerPoints);
const isWin        = setsWonMine > setsWonOpp;
```

### Zone 1 — Score global

```
┌────────────────────────────────────┐
│  [VICTOIRE] ou [DÉFAITE]  badge    │
│  3 – 1    (sets)                   │
│  87 – 73  (total points)           │
└────────────────────────────────────┘
```

- Victory badge: green background `COLORS.green`
- Defeat badge: red background `COLORS.red`
- Sets line: `setsWonMine – setsWonOpp`, label "sets"
- Points line: `totalMyScore – totalOppScore`, label "pts"

### Zone 2 — Stats équipe

Three sections inside a bordered card:

**POINTS MARQUÉS**
- Header row: label + ratio `{playerPoints} / {totalMyScore}` (ratio highlighted in green)
- Chips row: one chip per entry in `globalStats.actions.points` → `"{action.label} {action.count}"`

**FAUTES** (separator above)
- Header row: label + ratio `{teamFaults} / {totalOppScore}` (ratio in red)
- Chips row: one chip per entry in `globalStats.actions.faults`

**ADVERSAIRE** (separator above)
- Two rows: "Points marqués {oppActual}" + "Fautes {oppFaults}"

### Placeholder tabs (Par set, Joueurs, Adversaire)

```tsx
<View style={styles.placeholder}>
  <Text style={styles.placeholderText}>À venir</Text>
</View>
```

---

## Files changed

| File | Change |
|------|--------|
| `src/screens/LiveMatchAnalysisScreen.tsx` | New file |
| `src/screens/StatsHubScreen.tsx` | Add Stats live card + `onLiveStats` prop |
| `App.tsx` | StatsStep type + liveMatchList + liveMatchDetail navigation + back-button |

---

## Out of scope

- Par set / Joueurs / Adversaire tab content
- Any change to MatchDetailScreen
- Any change to TeamMatchListScreen
