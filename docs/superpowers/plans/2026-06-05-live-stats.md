# LiveStats — Saisie temps réel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un écran de saisie temps réel des actions (mon équipe + adversaire, avec zone d'arrivée 1-6), accessible via un choix de mode après la sélection d'équipe, totalement isolé du flux de match classique.

**Architecture:** Un contexte dédié `LiveStatsContext` (useReducer, source unique de vérité `events[]`) alimente un écran plein écran `LiveStatsScreen`. L'accès se fait par un `MatchModeScreen` (fork classique / temps réel) inséré dans `App.tsx` après la sélection d'équipe. Le modèle de données pur vit dans `src/data/liveStats.ts` (déjà écrit).

**Tech Stack:** React Native, Expo, TypeScript strict, Context API + useReducer, StyleSheet, tokens `constants/theme.ts`.

**Vérification:** Le projet n'a pas de test runner (pas de jest). La porte de vérification est `npx tsc --noEmit` (commande projet documentée dans CLAUDE.md) + smoke manuel via `npx expo start`. Chaque tâche se termine par un tsc check vert + commit.

**Pré-requis déjà en place :** `src/data/liveStats.ts` (types, catalogue 15 actions, `LIVE_ACTION_BY_KEY`, `LIVE_ZONE_DISPLAY_ORDER`, `OPP_JERSEYS`).

---

### Task 1: LiveStatsContext

**Files:**
- Create: `src/context/LiveStatsContext.tsx`

- [ ] **Step 1: Write the context file**

```tsx
import React, { createContext, useContext, useReducer } from 'react';
import type { LiveStatEvent } from '../data/liveStats';

type LiveStatsState = { events: LiveStatEvent[] };

const LIVE_ACTION_TYPES = {
  ADD_EVENT: 'ADD_EVENT',
  UNDO:      'UNDO',
  RESET:     'RESET',
} as const;

type AddEventPayload = Omit<LiveStatEvent, 'id' | 'ts'>;

type LiveStatsAction =
  | { type: typeof LIVE_ACTION_TYPES.ADD_EVENT; payload: AddEventPayload }
  | { type: typeof LIVE_ACTION_TYPES.UNDO }
  | { type: typeof LIVE_ACTION_TYPES.RESET };

type LiveStatsContextValue = {
  state: LiveStatsState;
  actions: {
    addEvent: (payload: AddEventPayload) => void;
    undo:     () => void;
    reset:    () => void;
  };
};

const initialState: LiveStatsState = { events: [] };

// Compteur monotone pour garantir des ids uniques même à la même ms.
let eventCounter = 0;
const makeEventId = (): string => {
  eventCounter += 1;
  return `evt_${Date.now()}_${eventCounter}`;
};

function liveStatsReducer(state: LiveStatsState, action: LiveStatsAction): LiveStatsState {
  switch (action.type) {
    case LIVE_ACTION_TYPES.ADD_EVENT: {
      const event: LiveStatEvent = {
        ...action.payload,
        id: makeEventId(),
        ts: Date.now(),
      };
      return { events: [...state.events, event] };
    }
    case LIVE_ACTION_TYPES.UNDO:
      if (state.events.length === 0) return state;
      return { events: state.events.slice(0, -1) };
    case LIVE_ACTION_TYPES.RESET:
      return initialState;
    default:
      return state;
  }
}

const LiveStatsContext = createContext<LiveStatsContextValue | null>(null);

export const LiveStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(liveStatsReducer, initialState);

  const actions: LiveStatsContextValue['actions'] = {
    addEvent: (payload) => dispatch({ type: LIVE_ACTION_TYPES.ADD_EVENT, payload }),
    undo:     ()        => dispatch({ type: LIVE_ACTION_TYPES.UNDO }),
    reset:    ()        => dispatch({ type: LIVE_ACTION_TYPES.RESET }),
  };

  return (
    <LiveStatsContext.Provider value={{ state, actions }}>
      {children}
    </LiveStatsContext.Provider>
  );
};

export const useLiveStats = (): LiveStatsContextValue => {
  const ctx = useContext(LiveStatsContext);
  if (!ctx) throw new Error('useLiveStats doit être utilisé dans un LiveStatsProvider');
  return ctx;
};
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/context/LiveStatsContext.tsx
git commit -m "feat(live-stats): add LiveStatsContext reducer (addEvent/undo/reset)"
```

---

### Task 2: MatchModeScreen (fork de mode)

**Files:**
- Create: `src/screens/MatchModeScreen.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  teamName: string;
  onSelectClassic: () => void;
  onSelectLive: () => void;
  onBack: () => void;
};

const MatchModeScreen = ({ teamName, onSelectClassic, onSelectLive, onBack }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.back}>‹ Retour</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.body}>
      <Text style={styles.team}>{teamName}</Text>
      <Text style={styles.title}>Choisir le mode</Text>

      <TouchableOpacity style={[styles.card, styles.cardClassic]} onPress={onSelectClassic} activeOpacity={0.85}>
        <Text style={styles.cardTitle}>Match classique</Text>
        <Text style={styles.cardSub}>Composition, terrain, score, rotations…</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.cardLive]} onPress={onSelectLive} activeOpacity={0.85}>
        <Text style={styles.cardTitle}>Saisie temps réel</Text>
        <Text style={styles.cardSub}>Saisie rapide des actions des 2 équipes — TEST</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  back: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  team: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardClassic: {
    backgroundColor: `${COLORS.blue}18`,
    borderColor: `${COLORS.blue}55`,
  },
  cardLive: {
    backgroundColor: `${COLORS.green}18`,
    borderColor: `${COLORS.green}55`,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default MatchModeScreen;
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MatchModeScreen.tsx
git commit -m "feat(live-stats): add MatchModeScreen mode fork"
```

---

### Task 3: LiveStatsScreen — styles

**Files:**
- Create: `src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts`

- [ ] **Step 1: Write the stylesheet**

```ts
import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  headerBtn: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerReset: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.redLight,
  },

  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },

  // ── Segmented team toggle ──
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentItemActiveMine: {
    backgroundColor: `${COLORS.blue}33`,
  },
  segmentItemActiveOpp: {
    backgroundColor: `${COLORS.pink}33`,
  },
  segmentText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  // ── Section labels ──
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },

  // ── Player grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  playerCell: {
    width: '23.5%',
    minHeight: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: 2,
  },
  playerNum: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 9,
    color: COLORS.textMuted,
    maxWidth: '95%',
  },
  playerCount: {
    fontSize: 9,
    color: COLORS.textDark,
  },

  // ── Action groups ──
  actionGroupLabel: {
    fontSize: FONT_SIZE.xs,
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '31%',
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },

  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  // ── Undo + recent ──
  undoBtn: {
    height: 48,
    marginTop: SPACING.sm,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.redLight,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  recentZone: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  // ── Zone overlay ──
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13,27,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  overlayTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    width: '80%',
    justifyContent: 'center',
  },
  zoneCell: {
    width: '30%',
    aspectRatio: 1.4,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCellText: {
    fontSize: FONT_SIZE.score,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  zoneNet: {
    width: '80%',
    height: 3,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginVertical: SPACING.md,
  },
  zoneCancel: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  zoneCancelText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.redLight,
  },
});
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (file is imported in Task 4; standalone it still compiles).

- [ ] **Step 3: Commit**

```bash
git add src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts
git commit -m "feat(live-stats): add LiveStatsScreen styles"
```

---

### Task 4: LiveStatsScreen — component + barrel

**Files:**
- Create: `src/screens/LiveStatsScreen/LiveStatsScreen.tsx`
- Create: `src/screens/LiveStatsScreen/index.ts`

- [ ] **Step 1: Write the component**

```tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Team } from '../../data/teams';
import {
  LIVE_ACTIONS,
  LIVE_ACTION_BY_KEY,
  LIVE_ZONE_DISPLAY_ORDER,
  OPP_JERSEYS,
} from '../../data/liveStats';
import type { LiveTeam, LiveActionKey, LiveActionCategory } from '../../data/liveStats';
import { useLiveStats } from '../../context/LiveStatsContext';
import { getPositionColor, getPlayerColor, COLORS } from '../../constants/theme';
import { styles } from './LiveStatsScreen.styles';

type Props = { team: Team; onBack: () => void };

type GridPlayer = { id: number; jersey: number; name: string; color: string };

const CATEGORY_ORDER: LiveActionCategory[] = ['point', 'fault', 'neutral'];

const CATEGORY_LABEL: Record<LiveActionCategory, string> = {
  point:   'POINTS REMPORTÉS',
  fault:   'FAUTES',
  neutral: 'SANS POINT',
};

const CATEGORY_COLOR: Record<LiveActionCategory, string> = {
  point:   COLORS.green,
  fault:   COLORS.red,
  neutral: COLORS.textMuted,
};

const LiveStatsScreen = ({ team, onBack }: Props) => {
  const { state, actions } = useLiveStats();

  const [activeTeam, setActiveTeam] = useState<LiveTeam>('mine');
  const [selected, setSelected] = useState<GridPlayer | null>(null);
  const [pendingAction, setPendingAction] = useState<LiveActionKey | null>(null);

  // Grille de joueurs selon l'équipe active (dérivée, jamais dupliquée en state).
  const gridPlayers: GridPlayer[] = useMemo(() => {
    if (activeTeam === 'opp') {
      return OPP_JERSEYS.map(j => ({
        id: j,
        jersey: j,
        name: `Adv #${j}`,
        color: COLORS.pink,
      }));
    }
    return team.players.map(p => ({
      id: p.id,
      jersey: p.numero,
      name: p.name,
      color: p.roles[0] ? getPositionColor(p.roles[0]) : getPlayerColor(p.id),
    }));
  }, [activeTeam, team.players]);

  // Nb d'événements par joueur (team:id) pour affichage compteur.
  const countByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of state.events) {
      const k = `${e.team}:${e.playerId}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [state.events]);

  const selectTeam = (t: LiveTeam) => {
    if (t === activeTeam) return;
    setActiveTeam(t);
    setSelected(null);
    setPendingAction(null);
  };

  const record = useCallback((actionKey: LiveActionKey, zone: number | null) => {
    if (!selected) return;
    actions.addEvent({
      team:       activeTeam,
      playerId:   selected.id,
      jersey:     selected.jersey,
      playerName: selected.name,
      actionKey,
      zone,
    });
    setPendingAction(null);
  }, [actions, activeTeam, selected]);

  const handleAction = (actionKey: LiveActionKey) => {
    if (!selected) return;
    if (LIVE_ACTION_BY_KEY[actionKey].needsZone) {
      setPendingAction(actionKey);
      return;
    }
    record(actionKey, null);
  };

  const recent = useMemo(() => state.events.slice(-6).reverse(), [state.events]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saisie temps réel</Text>
        <TouchableOpacity onPress={actions.reset} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerReset}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Toggle équipe ── */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, activeTeam === 'mine' && styles.segmentItemActiveMine]}
            onPress={() => selectTeam('mine')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTeam === 'mine' && styles.segmentTextActive]}>
              {team.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, activeTeam === 'opp' && styles.segmentItemActiveOpp]}
            onPress={() => selectTeam('opp')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTeam === 'opp' && styles.segmentTextActive]}>
              Adversaire
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Grille joueurs ── */}
        <Text style={styles.sectionLabel}>JOUEUR</Text>
        <View style={styles.grid}>
          {gridPlayers.map(p => {
            const isSel = selected?.id === p.id;
            const count = countByPlayer.get(`${activeTeam}:${p.id}`) ?? 0;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.playerCell,
                  isSel && { borderColor: p.color, borderWidth: 2, backgroundColor: `${p.color}22` },
                ]}
                onPress={() => setSelected(isSel ? null : p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.playerNum, { color: p.color }]}>{p.jersey}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {activeTeam === 'opp' ? 'Adv.' : p.name.split(' ')[0]}
                </Text>
                <Text style={styles.playerCount}>{count > 0 ? `${count} act.` : ' '}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Actions ── */}
        <Text style={styles.hint}>
          {selected ? `Action pour ${selected.name}` : '↑ Choisis d\'abord un joueur'}
        </Text>

        {CATEGORY_ORDER.map(cat => (
          <View key={cat}>
            <Text style={[styles.actionGroupLabel, { color: CATEGORY_COLOR[cat] }]}>
              {CATEGORY_LABEL[cat]}
            </Text>
            <View style={styles.actionsRow}>
              {LIVE_ACTIONS.filter(a => a.category === cat).map(a => {
                const color = CATEGORY_COLOR[cat];
                return (
                  <TouchableOpacity
                    key={a.key}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: `${color}1f`, borderColor: `${color}55` },
                      !selected && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleAction(a.key)}
                    disabled={!selected}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionBtnText, { color }]}>
                      {a.label}{a.needsZone ? ' °' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Undo ── */}
        <TouchableOpacity
          style={[styles.undoBtn, state.events.length === 0 && styles.actionBtnDisabled]}
          onPress={actions.undo}
          disabled={state.events.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.undoBtnText}>↩ Annuler la dernière saisie</Text>
        </TouchableOpacity>

        {/* ── Récents ── */}
        <Text style={styles.sectionLabel}>DERNIÈRES SAISIES</Text>
        {recent.length === 0 ? (
          <Text style={styles.hint}>Aucune saisie pour l'instant.</Text>
        ) : (
          recent.map(e => (
            <View key={e.id} style={styles.recentRow}>
              <Text style={styles.recentText}>
                {e.team === 'opp' ? `Adv #${e.jersey}` : e.playerName} — {LIVE_ACTION_BY_KEY[e.actionKey].label}
              </Text>
              <Text style={styles.recentZone}>{e.zone !== null ? `Z${e.zone}` : ''}</Text>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Overlay zone d'arrivée ── */}
      {pendingAction !== null && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            Zone d'arrivée — {LIVE_ACTION_BY_KEY[pendingAction].label}
          </Text>
          <View style={styles.zoneNet} />
          <View style={styles.zoneGrid}>
            {LIVE_ZONE_DISPLAY_ORDER.map(z => (
              <TouchableOpacity
                key={z}
                style={styles.zoneCell}
                onPress={() => record(pendingAction, z)}
                activeOpacity={0.7}
              >
                <Text style={styles.zoneCellText}>{z}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.zoneCancel} onPress={() => setPendingAction(null)} activeOpacity={0.7}>
            <Text style={styles.zoneCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default LiveStatsScreen;
```

- [ ] **Step 2: Write the barrel**

`src/screens/LiveStatsScreen/index.ts`:

```ts
export { default } from './LiveStatsScreen';
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/LiveStatsScreen/LiveStatsScreen.tsx src/screens/LiveStatsScreen/index.ts
git commit -m "feat(live-stats): add LiveStatsScreen component"
```

---

### Task 5: Wire into App.tsx (provider + mode fork)

**Files:**
- Modify: `App.tsx`

Le flux actuel (App.tsx:342-345) affiche `TeamSelectionScreen` quand `!selectedTeam`,
puis enchaîne directement sur le roster/SetSetup. On insère le fork de mode entre les deux.

- [ ] **Step 1: Add imports**

Après la ligne `import PlayerSeasonStatsScreen  from './src/screens/PlayerSeasonStatsScreen';` (App.tsx:74), ajouter :

```tsx
import MatchModeScreen from './src/screens/MatchModeScreen';
import LiveStatsScreen from './src/screens/LiveStatsScreen';
import { LiveStatsProvider } from './src/context/LiveStatsContext';
```

- [ ] **Step 2: Add matchMode state**

Dans `AppContent`, juste après `const [playerMgmtVisible, setPlayerMgmtVisible] = useState(false);` (App.tsx:176), ajouter :

```tsx
  const [matchMode, setMatchMode] = useState<'classic' | 'live' | null>(null);
```

- [ ] **Step 3: Reset matchMode when team is cleared**

Remplacer le bloc useEffect existant (App.tsx:184-188) :

```tsx
  useEffect(() => {
    if (!selectedTeam || !rosterValidated) {
      setRosterOverlayVisible(false);
    }
  }, [selectedTeam, rosterValidated]);
```

par :

```tsx
  useEffect(() => {
    if (!selectedTeam || !rosterValidated) {
      setRosterOverlayVisible(false);
    }
  }, [selectedTeam, rosterValidated]);

  // Si l'équipe est désélectionnée, on oublie le mode choisi.
  useEffect(() => {
    if (!selectedTeam) setMatchMode(null);
  }, [selectedTeam]);
```

- [ ] **Step 4: Handle Android back from mode screen / live screen**

Dans `handleBack` (App.tsx:205), ajouter une branche AVANT `if (selectedTeam && !rosterValidated)` (App.tsx:226). Insérer :

```tsx
    if (selectedTeam && matchMode !== null) {
      setMatchMode(null);
      return true;
    }
```

Puis ajouter `matchMode` au tableau de dépendances de `handleBack` (App.tsx:240-244), à côté de `selectedTeam`.

- [ ] **Step 5: Insert mode fork + live render in the flow**

Localiser l'étape 2 (App.tsx:342-345) :

```tsx
  // ── Étape 2 : sélection de l'équipe ──
  if (!selectedTeam) {
    return <TeamSelectionScreen />;
  }
```

Juste APRÈS ce bloc, insérer :

```tsx
  // ── Étape 2bis : choix du mode (classique / saisie temps réel) ──
  if (selectedTeam && matchMode === null) {
    return (
      <MatchModeScreen
        teamName={selectedTeam.name}
        onSelectClassic={() => setMatchMode('classic')}
        onSelectLive={() => setMatchMode('live')}
        onBack={() => teamActions.clearTeam()}
      />
    );
  }

  // ── Mode saisie temps réel : écran isolé, hors flux match classique ──
  if (matchMode === 'live') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <LiveStatsProvider>
          <LiveStatsScreen team={selectedTeam} onBack={() => setMatchMode(null)} />
        </LiveStatsProvider>
      </SafeAreaView>
    );
  }
```

Le reste (étape 3 SetSetup, roster, onglets) reste inchangé et ne s'exécute que
lorsque `matchMode === 'classic'`.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Smoke test manuel**

Run: `npx expo start --clear`
Vérifier le parcours :
1. Home → Nouveau match → nom/lieu → sélection équipe.
2. Écran de mode apparaît → 2 boutons.
3. "Saisie temps réel" → écran LiveStats.
4. Toggle Mon équipe / Adversaire change la grille de joueurs.
5. Sélection joueur → tap "Attaque" → overlay zone → tap zone → saisie listée.
6. Tap "Contre" (sans zone) → saisie directe.
7. Undo retire la dernière, Reset vide tout.
8. Retour → revient au choix de mode ; "Match classique" → flux normal intact.

- [ ] **Step 8: Commit**

```bash
git add App.tsx
git commit -m "feat(live-stats): wire mode fork + LiveStats screen into App"
```

---

## Notes d'implémentation

- Le symbole `°` après un libellé d'action signale qu'une zone sera demandée (léger indice visuel, voir Task 4 Step 1).
- `getPositionColor` / `getPlayerColor` viennent de `constants/theme.ts` (déjà existants).
- Aucune modification de `MatchContext`, `players.ts`, ou du flux classique : isolation totale, suppression facile après test (retirer le fork dans App.tsx + le dossier/fichiers créés).