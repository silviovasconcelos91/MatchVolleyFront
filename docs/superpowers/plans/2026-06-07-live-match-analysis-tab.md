# Live Match Analysis Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Live" 4th tab to `MatchDetailScreen` that calls `GET /api/v1/matches/{matchId}/live-stats/analysis` and displays team actions, FIVB court attack diagrams, ace-zone heatmaps, per-set timelines, and per-player stats.

**Architecture:** Types live in a dedicated `liveStatsAnalysis.ts` file. A new `FIVBCourtDiagram` SVG component (react-native-svg) handles both attack-trajectory and ace-zone rendering via a discriminated-union `mode` prop. The `LiveTab` component sits inside `MatchDetailScreen.tsx` alongside three internal helpers (`ActionsBlock`, `SetAccordion`, `PlayerAccordion`). The API call uses the existing `client` from `src/data/openapi/apiClient.ts` — same pattern as `sendLiveStats`.

**Tech Stack:** React Native, Expo managed, TypeScript strict, react-native-svg (already installed), StyleSheet design tokens from `constants/theme.ts`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/data/liveStatsAnalysis.ts` | TypeScript types for the analysis API response |
| Modify | `src/components/SetGraph.tsx` | Widen `timeline` prop type to accept new format |
| Create | `src/components/FIVBCourtDiagram/FIVBCourtDiagram.types.ts` | Props types for the diagram |
| Create | `src/components/FIVBCourtDiagram/FIVBCourtDiagram.tsx` | SVG half-court diagram (attacks + aces) |
| Create | `src/components/FIVBCourtDiagram/FIVBCourtDiagram.styles.ts` | StyleSheet for wrappers |
| Create | `src/components/FIVBCourtDiagram/index.ts` | Barrel export |
| Modify | `src/data/matchApi.ts` | Add `getLiveMatchAnalysis()` |
| Modify | `src/screens/MatchDetailScreen.tsx` | Add Live tab, `ActionsBlock`, `LiveTab` |

---

## Task 1 — Types file

**Files:**
- Create: `src/data/liveStatsAnalysis.ts`

- [ ] **Create the file with all API types**

```typescript
// src/data/liveStatsAnalysis.ts

export type ActionCount = {
  key: string;
  label: string;
  count: number;
};

export type ActionStats = {
  points: ActionCount[];
  faults: ActionCount[];
  neutral: ActionCount[];
};

export type AceZone = {
  zone: number;
  count: number;
};

export type AttackZone = {
  playerPosition: number | null;
  from: number | null;
  to: number | null;
  result: 'attack_pt' | 'attack_no_pt' | 'attack_fault';
  count: number;
};

export type ScopeStats = {
  actions: ActionStats;
  acesByZone: AceZone[];
  attacks: AttackZone[];
};

export type TimelineEntry = {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
  occurredAt: string;
};

export type SetAnalysis = {
  setNumber: number;
  myScore: number;
  oppScore: number;
  wonBy: 'mine' | 'opp' | null;
  stats: ScopeStats;
  timeline: TimelineEntry[];
};

export type PlayerSetStats = {
  setNumber: number;
  stats: ScopeStats;
};

export type PlayerAnalysis = {
  playerId: number;
  jersey: number;
  name: string;
  matchStats: ScopeStats;
  setStats: PlayerSetStats[];
};

export type LiveMatchAnalysis = {
  matchId: string;
  globalStats: ScopeStats;
  sets: SetAnalysis[];
  players: PlayerAnalysis[];
};
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors related to `liveStatsAnalysis.ts`

- [ ] **Commit**

```bash
git add src/data/liveStatsAnalysis.ts
git commit -m "feat(live-analysis): add TypeScript types for analysis API response"
```

---

## Task 2 — Widen SetGraph timeline prop

**Files:**
- Modify: `src/components/SetGraph.tsx` (lines 1–12)

SetGraph currently types its `timeline` prop as `MatchDetailTimelineEntry[]`, but only accesses `.myScore` and `.oppScore`. Widen the type so both old and new timeline formats are accepted without a cast.

- [ ] **Update the props type in SetGraph.tsx**

Replace the existing `type Props` block (lines 7–11):

```typescript
// Before
type Props = {
  timeline: MatchDetailTimelineEntry[];
  finalMyScore: number;
  finalOppScore: number;
};
```

```typescript
// After — duck-typed: only the fields SetGraph actually reads
type Props = {
  timeline: { myScore: number; oppScore: number }[];
  finalMyScore: number;
  finalOppScore: number;
};
```

Also remove the now-unused import at the top of the file:

```typescript
// Remove this line:
import type { MatchDetailTimelineEntry } from '../data/matchApi';
```

- [ ] **TypeScript check — verify existing callers still compile**

Run: `npx tsc --noEmit`
Expected: no errors (the old `MatchDetailTimelineEntry[]` values satisfy the wider type structurally)

- [ ] **Commit**

```bash
git add src/components/SetGraph.tsx
git commit -m "refactor(SetGraph): widen timeline prop to duck type for reuse"
```

---

## Task 3 — FIVBCourtDiagram component

**Files:**
- Create: `src/components/FIVBCourtDiagram/FIVBCourtDiagram.types.ts`
- Create: `src/components/FIVBCourtDiagram/FIVBCourtDiagram.tsx`
- Create: `src/components/FIVBCourtDiagram/FIVBCourtDiagram.styles.ts`
- Create: `src/components/FIVBCourtDiagram/index.ts`

### FIVB zone layout

```
┌────┬────┬────┐
│ Z4 │ Z3 │ Z2 │  row 0 (top)
├────┼────┼────┤
│ Z5 │ Z6 │ Z1 │  row 1 (bottom)
└────┴────┴────┘
  col0  col1  col2
```

Zone center coordinates (normalized 0→1 within the court):

| Zone | col | row |
|------|-----|-----|
| 1    | 2   | 1   |
| 2    | 2   | 0   |
| 3    | 1   | 0   |
| 4    | 0   | 0   |
| 5    | 0   | 1   |
| 6    | 1   | 1   |

- [ ] **Create types file**

```typescript
// src/components/FIVBCourtDiagram/FIVBCourtDiagram.types.ts
import type { AceZone, AttackZone } from '../../data/liveStatsAnalysis';

export type FIVBCourtDiagramProps =
  | { mode: 'attacks'; data: AttackZone[] }
  | { mode: 'aces';    data: AceZone[]    };
```

- [ ] **Create styles file**

```typescript
// src/components/FIVBCourtDiagram/FIVBCourtDiagram.styles.ts
import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    marginVertical: SPACING.sm,
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    alignSelf: 'flex-start',
  },
});
```

- [ ] **Create the SVG component**

```typescript
// src/components/FIVBCourtDiagram/FIVBCourtDiagram.tsx
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, {
  Rect, Line, Circle, Text as SvgText, Polygon,
} from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { styles } from './FIVBCourtDiagram.styles';
import type { FIVBCourtDiagramProps } from './FIVBCourtDiagram.types';
import type { AttackZone, AceZone } from '../../data/liveStatsAnalysis';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COURT_WIDTH  = SCREEN_WIDTH - 80;
const CELL_W = COURT_WIDTH / 3;
const CELL_H = CELL_W * 0.75;
const COURT_HEIGHT = CELL_H * 2;

// Zone → pixel center
const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: CELL_W * 2.5, y: CELL_H * 1.5 },
  2: { x: CELL_W * 2.5, y: CELL_H * 0.5 },
  3: { x: CELL_W * 1.5, y: CELL_H * 0.5 },
  4: { x: CELL_W * 0.5, y: CELL_H * 0.5 },
  5: { x: CELL_W * 0.5, y: CELL_H * 1.5 },
  6: { x: CELL_W * 1.5, y: CELL_H * 1.5 },
};

const ZONE_LABELS = [
  { zone: 4, col: 0, row: 0 },
  { zone: 3, col: 1, row: 0 },
  { zone: 2, col: 2, row: 0 },
  { zone: 5, col: 0, row: 1 },
  { zone: 6, col: 1, row: 1 },
  { zone: 1, col: 2, row: 1 },
];

const ATTACK_COLORS: Record<string, string> = {
  attack_pt:    COLORS.green,
  attack_no_pt: COLORS.yellow,
  attack_fault: COLORS.red,
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const arrowHead = (
  x1: number, y1: number, x2: number, y2: number, color: string, size = 7,
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1x = x2 - size * Math.cos(angle - Math.PI / 7);
  const a1y = y2 - size * Math.sin(angle - Math.PI / 7);
  const a2x = x2 - size * Math.cos(angle + Math.PI / 7);
  const a2y = y2 - size * Math.sin(angle + Math.PI / 7);
  return (
    <Polygon
      points={`${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}`}
      fill={color}
    />
  );
};

const AttacksDiagram = ({ data }: { data: AttackZone[] }) => {
  const maxCount = Math.max(1, ...data.map(a => a.count));

  return (
    <Svg width={COURT_WIDTH} height={COURT_HEIGHT}>
      {/* Court grid */}
      <Rect
        x={0} y={0}
        width={COURT_WIDTH} height={COURT_HEIGHT}
        fill={`${COLORS.bgCard}`}
        stroke={COLORS.border}
        strokeWidth={1}
        rx={4}
      />
      {/* Zone dividers */}
      <Line x1={CELL_W}   y1={0} x2={CELL_W}   y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={CELL_W*2} y1={0} x2={CELL_W*2} y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={0} y1={CELL_H} x2={COURT_WIDTH} y2={CELL_H}       stroke={COLORS.border} strokeWidth={1} />

      {/* Zone labels */}
      {ZONE_LABELS.map(({ zone, col, row }) => (
        <SvgText
          key={zone}
          x={col * CELL_W + CELL_W * 0.5}
          y={row * CELL_H + 14}
          fontSize={10}
          fill={COLORS.textDark}
          textAnchor="middle"
        >
          {zone}
        </SvgText>
      ))}

      {/* Arrows */}
      {data.map((atk, i) => {
        const color = ATTACK_COLORS[atk.result] ?? COLORS.textMuted;
        const strokeWidth = clamp(1.5 + (atk.count / maxCount) * 2.5, 1.5, 4);

        if (atk.result === 'attack_fault') {
          const pos = atk.playerPosition !== null
            ? ZONE_POSITIONS[atk.playerPosition]
            : { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2 };
          if (!pos) return null;
          const s = 8;
          return (
            <React.Fragment key={i}>
              <Line x1={pos.x - s} y1={pos.y - s} x2={pos.x + s} y2={pos.y + s} stroke={color} strokeWidth={strokeWidth} />
              <Line x1={pos.x + s} y1={pos.y - s} x2={pos.x - s} y2={pos.y + s} stroke={color} strokeWidth={strokeWidth} />
            </React.Fragment>
          );
        }

        if (atk.from === null || atk.to === null) return null;
        const from = ZONE_POSITIONS[atk.from];
        const to   = ZONE_POSITIONS[atk.to];
        if (!from || !to) return null;

        return (
          <React.Fragment key={i}>
            <Line
              x1={from.x} y1={from.y}
              x2={to.x}   y2={to.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={0.85}
            />
            {arrowHead(from.x, from.y, to.x, to.y, color)}
            <Circle cx={from.x} cy={from.y} r={3} fill={color} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const AcesDiagram = ({ data }: { data: AceZone[] }) => {
  const maxCount = Math.max(1, ...data.map(a => a.count));
  const aceMap: Record<number, number> = {};
  for (const a of data) aceMap[a.zone] = a.count;

  return (
    <Svg width={COURT_WIDTH} height={COURT_HEIGHT}>
      {/* Court grid */}
      <Rect
        x={0} y={0}
        width={COURT_WIDTH} height={COURT_HEIGHT}
        fill={COLORS.bgCard}
        stroke={COLORS.border}
        strokeWidth={1}
        rx={4}
      />

      {/* Zone fills */}
      {ZONE_LABELS.map(({ zone, col, row }) => {
        const count = aceMap[zone] ?? 0;
        const opacity = count > 0 ? clamp(0.1 + (count / maxCount) * 0.7, 0.1, 0.8) : 0;
        return (
          <Rect
            key={zone}
            x={col * CELL_W + 1}
            y={row * CELL_H + 1}
            width={CELL_W - 2}
            height={CELL_H - 2}
            fill={COLORS.yellow}
            fillOpacity={opacity}
          />
        );
      })}

      {/* Zone dividers on top */}
      <Line x1={CELL_W}   y1={0} x2={CELL_W}   y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={CELL_W*2} y1={0} x2={CELL_W*2} y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={0} y1={CELL_H} x2={COURT_WIDTH} y2={CELL_H}       stroke={COLORS.border} strokeWidth={1} />

      {/* Zone labels + counts */}
      {ZONE_LABELS.map(({ zone, col, row }) => {
        const count = aceMap[zone] ?? 0;
        return (
          <React.Fragment key={zone}>
            <SvgText
              x={col * CELL_W + CELL_W * 0.5}
              y={row * CELL_H + 14}
              fontSize={10}
              fill={COLORS.textDark}
              textAnchor="middle"
            >
              {zone}
            </SvgText>
            {count > 0 && (
              <SvgText
                x={col * CELL_W + CELL_W * 0.5}
                y={row * CELL_H + CELL_H * 0.5 + 5}
                fontSize={18}
                fontWeight="700"
                fill={COLORS.yellow}
                textAnchor="middle"
              >
                {count}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const FIVBCourtDiagram = (props: FIVBCourtDiagramProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>
      {props.mode === 'attacks' ? 'TRAJECTOIRES ATTAQUES' : 'ACES PAR ZONE'}
    </Text>
    {props.mode === 'attacks'
      ? <AttacksDiagram data={props.data} />
      : <AcesDiagram    data={props.data} />
    }
  </View>
);

export default FIVBCourtDiagram;
```

- [ ] **Create barrel**

```typescript
// src/components/FIVBCourtDiagram/index.ts
export { default } from './FIVBCourtDiagram';
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Commit**

```bash
git add src/components/FIVBCourtDiagram/
git commit -m "feat(live-analysis): add FIVBCourtDiagram SVG component (attacks + aces)"
```

---

## Task 4 — API function

**Files:**
- Modify: `src/data/matchApi.ts`

The existing `client` from `src/data/openapi/apiClient.ts` is already imported via the sdk barrel. Use it directly for this raw endpoint (same pattern as `sendLiveStats`).

- [ ] **Add import at top of matchApi.ts**

Add after the existing SDK imports (around line 10):

```typescript
import { client } from './openapi/apiClient';
import type { LiveMatchAnalysis } from './liveStatsAnalysis';
```

- [ ] **Add the function at the bottom of matchApi.ts**

```typescript
export const getLiveMatchAnalysis = async (
  matchId: string,
): Promise<LiveMatchAnalysis> => {
  const response = await client.get({
    url: '/api/v1/matches/{matchId}/live-stats/analysis',
    path: { matchId },
  });

  if (response.response.status === 404) {
    const err = new Error('No live stats for this match');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (response.error !== undefined || response.data === undefined) {
    throw new Error('Failed to fetch live match analysis');
  }

  const body = response.data as { data: LiveMatchAnalysis };
  return body.data;
};
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Commit**

```bash
git add src/data/matchApi.ts
git commit -m "feat(live-analysis): add getLiveMatchAnalysis API function"
```

---

## Task 5 — ActionsBlock component (internal to MatchDetailScreen)

**Files:**
- Modify: `src/screens/MatchDetailScreen.tsx`

Add `ActionsBlock` as an internal component (not exported) near the top of the file, after the existing `StatCell` component.

- [ ] **Add ActionsBlock after the existing StatCell component (around line 79)**

```typescript
// ── Bloc actions (nouveau format live) ────────────────────────────
type ActionsBlockProps = { actions: ActionStats };

const ActionsBlock = ({ actions }: ActionsBlockProps) => (
  <View style={styles.actionsBlock}>
    {actions.points.length > 0 && (
      <View style={styles.actionsSection}>
        <Text style={styles.actionsSectionLabel}>POINTS</Text>
        <View style={styles.statCellRow}>
          {actions.points.map(a => (
            <StatCell key={a.key} label={a.label} value={a.count} color={COLORS.greenLight} />
          ))}
        </View>
      </View>
    )}
    {actions.faults.length > 0 && (
      <View style={styles.actionsSection}>
        <Text style={styles.actionsSectionLabel}>FAUTES</Text>
        <View style={styles.statCellRow}>
          {actions.faults.map(a => (
            <StatCell key={a.key} label={a.label} value={a.count} color={COLORS.redLight} />
          ))}
        </View>
      </View>
    )}
    {actions.neutral.length > 0 && (
      <View style={styles.actionsSection}>
        <Text style={styles.actionsSectionLabel}>NEUTRES</Text>
        <View style={styles.statCellRow}>
          {actions.neutral.map(a => (
            <StatCell key={a.key} label={a.label} value={a.count} color={COLORS.textMuted} />
          ))}
        </View>
      </View>
    )}
  </View>
);
```

- [ ] **Add the new styles at the bottom of the StyleSheet in MatchDetailScreen.tsx**

```typescript
  actionsBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionsSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionsSectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
```

- [ ] **Add the import for ActionStats at the top of MatchDetailScreen.tsx**

```typescript
import type { ActionStats } from '../data/liveStatsAnalysis';
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Commit**

```bash
git add src/screens/MatchDetailScreen.tsx
git commit -m "feat(live-analysis): add ActionsBlock internal component to MatchDetailScreen"
```

---

## Task 6 — LiveTab component

**Files:**
- Modify: `src/screens/MatchDetailScreen.tsx`

Add the `LiveTab` component, its helpers, and the required imports. This is the largest single addition.

- [ ] **Add imports at the top of MatchDetailScreen.tsx**

```typescript
import type { LiveMatchAnalysis } from '../data/liveStatsAnalysis';
import { getLiveMatchAnalysis } from '../data/matchApi';
import FIVBCourtDiagram from '../components/FIVBCourtDiagram';
```

- [ ] **Add LiveTab component before the `MatchDetailScreen` main component**

```typescript
// ── Onglet 4 : Live Analysis ───────────────────────────────────
type LiveTabProps = { matchId: string };

const LiveTab = ({ matchId }: LiveTabProps) => {
  const [data, setData]       = useState<LiveMatchAnalysis | null>(null);
  const [status, setStatus]   = useState<'loading' | 'error' | 'not_found' | 'ok'>('loading');
  const [expandedSet, setExpandedSet]       = useState<number | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
  const [expandedPlayerSet, setExpandedPlayerSet] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    setData(null);
    getLiveMatchAnalysis(matchId)
      .then(d => { setData(d); setStatus('ok'); })
      .catch((err: Error & { status?: number }) => {
        setStatus(err.status === 404 ? 'not_found' : 'error');
      });
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.blue} size="large" />
      </View>
    );
  }

  if (status === 'not_found') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Pas de stats live pour ce match.</Text>
      </View>
    );
  }

  if (status === 'error' || data === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Impossible de charger l'analyse live.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.tabContent}>

        {/* ── Résumé global ── */}
        <Text style={styles.sectionTitle}>RÉSUMÉ GLOBAL</Text>
        <View style={styles.card}>
          <ActionsBlock actions={data.globalStats.actions} />
          <FIVBCourtDiagram mode="attacks" data={data.globalStats.attacks} />
          <FIVBCourtDiagram mode="aces"    data={data.globalStats.acesByZone} />
        </View>

        {/* ── Par set ── */}
        <Text style={styles.sectionTitle}>PAR SET</Text>
        {data.sets.map(set => {
          const expanded = expandedSet === set.setNumber;
          const won = set.wonBy === 'mine';
          return (
            <View key={set.setNumber} style={styles.card}>
              <TouchableOpacity
                style={styles.setHeader}
                onPress={() => setExpandedSet(expanded ? null : set.setNumber)}
                activeOpacity={0.7}
              >
                <Text style={styles.setLabel}>Set {set.setNumber}</Text>
                <View style={styles.setScoreRow}>
                  <Text style={[styles.setScore, won ? styles.setScoreWon : styles.setScoreLost]}>
                    {set.myScore}
                  </Text>
                  <Text style={styles.setScoreSep}> – </Text>
                  <Text style={[styles.setScore, won ? styles.setScoreLost : styles.setScoreWon]}>
                    {set.oppScore}
                  </Text>
                </View>
                <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded && (
                <>
                  <SetGraph
                    timeline={set.timeline}
                    finalMyScore={set.myScore}
                    finalOppScore={set.oppScore}
                  />
                  <ActionsBlock actions={set.stats.actions} />
                  <FIVBCourtDiagram mode="attacks" data={set.stats.attacks} />
                  <FIVBCourtDiagram mode="aces"    data={set.stats.acesByZone} />
                </>
              )}
            </View>
          );
        })}

        {/* ── Joueurs ── */}
        <Text style={styles.sectionTitle}>JOUEURS</Text>
        {data.players.map(player => {
          const pExpanded = expandedPlayer === player.playerId;
          return (
            <View key={player.playerId} style={styles.card}>
              <TouchableOpacity
                style={styles.playerHeader}
                onPress={() => {
                  setExpandedPlayer(pExpanded ? null : player.playerId);
                  setExpandedPlayerSet(null);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.playerNum}>
                  <Text style={styles.playerNumText}>#{player.jersey}</Text>
                </View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.expandChevron}>{pExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              <ActionsBlock actions={player.matchStats.actions} />

              {pExpanded && player.setStats.map(ss => {
                const ssExpanded = expandedPlayerSet === ss.setNumber;
                return (
                  <View key={ss.setNumber} style={styles.setStatBlock}>
                    <TouchableOpacity
                      style={styles.setStatHeader}
                      onPress={() => setExpandedPlayerSet(ssExpanded ? null : ss.setNumber)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.setStatLabel}>SET {ss.setNumber}</Text>
                      <Text style={styles.expandChevron}>{ssExpanded ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {ssExpanded && <ActionsBlock actions={ss.stats.actions} />}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: SPACING.xxl * 2 }} />
      </View>
    </ScrollView>
  );
};
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Commit**

```bash
git add src/screens/MatchDetailScreen.tsx
git commit -m "feat(live-analysis): add LiveTab component with sets + players accordion"
```

---

## Task 7 — Wire up the Live tab in MatchDetailScreen

**Files:**
- Modify: `src/screens/MatchDetailScreen.tsx`

- [ ] **Add `'live'` to the TABS array** (around line 23)

```typescript
// Before
const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',  label: 'Résumé'  },
  { id: 'sets',    label: 'Par set' },
  { id: 'players', label: 'Joueurs' },
];
```

```typescript
// After
type TabId = 'resume' | 'sets' | 'players' | 'live';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',  label: 'Résumé'  },
  { id: 'sets',    label: 'Par set' },
  { id: 'players', label: 'Joueurs' },
  { id: 'live',    label: 'Live'    },
];
```

- [ ] **Render LiveTab inside the existing tab switch** (find the block with `activeTab === 'players'`)

```typescript
// Add after the players render block, before the closing </> :
{activeTab === 'live' && <LiveTab matchId={matchId} />}
```

Note: The `ScrollView` wrapper is already handled inside `LiveTab` itself, so it renders directly — unlike `ResumeTab`/`SetsTab`/`PlayersTab` which wrap their content inside the outer `ScrollView`. The outer ScrollView in the existing code wraps `ResumeTab`, `SetsTab`, `PlayersTab`. Move the `LiveTab` render **outside** that ScrollView:

Current structure in `MatchDetailScreen`:
```tsx
<ScrollView style={styles.scrollView} ...>
  {activeTab === 'resume'  && <ResumeTab  ... />}
  {activeTab === 'sets'    && <SetsTab    ... />}
  {activeTab === 'players' && <PlayersTab ... />}
  <View style={{ height: SPACING.xxl * 2 }} />
</ScrollView>
```

Change to:
```tsx
{activeTab !== 'live' ? (
  <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
    {activeTab === 'resume'  && <ResumeTab  data={data} />}
    {activeTab === 'sets'    && <SetsTab    data={data} playerName={playerName} playerInfo={playerInfo} />}
    {activeTab === 'players' && <PlayersTab data={data} playerName={playerName} />}
    <View style={{ height: SPACING.xxl * 2 }} />
  </ScrollView>
) : (
  <LiveTab matchId={matchId} />
)}
```

- [ ] **TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Final commit**

```bash
git add src/screens/MatchDetailScreen.tsx
git commit -m "feat(live-analysis): wire up Live tab in MatchDetailScreen"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| 4e onglet "Live" sur MatchDetailScreen | Task 7 |
| `FIVBCourtDiagram` mode attacks (flèches colorées, épaisseur ∝ count, croix pour fautes) | Task 3 |
| `FIVBCourtDiagram` mode aces (opacité ∝ count) | Task 3 |
| `getLiveMatchAnalysis()` API call avec gestion 404 | Task 4 |
| Types TypeScript dans `liveStatsAnalysis.ts` | Task 1 |
| SetGraph compatible nouveau format | Task 2 |
| `ActionsBlock` (points/fautes/neutres) | Task 5 |
| `LiveTab` : Résumé global avec diagrams | Task 6 |
| `LiveTab` : Par set collapsible + timeline + diagrams | Task 6 |
| `LiveTab` : Joueurs collapsible + stats par set | Task 6 |
| États loading / error / not_found | Task 6 |
| Chargement lazy (au 1er render du tab) | Task 6 |

### Type consistency check

- `ActionStats` defined in Task 1, used in `ActionsBlockProps` Task 5 ✓
- `LiveMatchAnalysis` defined in Task 1, used as state type in `LiveTab` Task 6 ✓
- `AttackZone` / `AceZone` defined in Task 1, used in `FIVBCourtDiagramProps` Task 3 ✓
- `getLiveMatchAnalysis` defined in Task 4, imported in Task 6 ✓
- `FIVBCourtDiagram` default export Task 3, imported in Task 6 ✓
- `SetGraph` wider type from Task 2 accepts `TimelineEntry[]` from Task 1 ✓ (`myScore`/`oppScore` present on both)