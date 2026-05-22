# Auto-Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically rotate players and handle libero swap when my team scores while the opponent is serving.

**Architecture:** All logic lives in the reducer (Approach A from spec). Two pure helper functions (`applyRotation`, `applyAutoLiberoSwap`) are added before `matchReducer`. `HistoryEntry` is extended with optional rotation fields so `UNDO` can fully reverse an auto-rotation. `SetSetupScreen` gains a serve-first toggle. `CourtScreen` gains a serve indicator.

**Tech Stack:** React Native · TypeScript strict · useReducer (MatchContext)

---

## File Map

| File | What changes |
|------|-------------|
| `src/context/MatchContext.tsx` | Types, state, helpers, reducer cases |
| `src/screens/SetSetupScreen.tsx` | Serve-first toggle UI |
| `src/screens/CourtScreen.tsx` | Serve indicator badge |

---

### Task 1: Extend types and initial state in MatchContext

**Files:**
- Modify: `src/context/MatchContext.tsx`

- [ ] **Step 1: Extend `HistoryEntry` with optional rotation fields (line 74)**

Replace:
```typescript
type HistoryEntry =
  | { source: 'player'; playerId: number; actionKey: ActionKey; mine: boolean }
  | { source: 'opp'; mine: false }
  | { source: 'opp_fault'; mine: true };
```
With:
```typescript
type LiberoSwapInfo = { liberoId: number; centralId: number; liberoPos: number };

type HistoryEntry =
  | { source: 'player'; playerId: number; actionKey: ActionKey; mine: boolean; rotated?: true; liberoAutoSwapped?: LiberoSwapInfo }
  | { source: 'opp'; mine: false; rotated?: true; liberoAutoSwapped?: LiberoSwapInfo }
  | { source: 'opp_fault'; mine: true; rotated?: true; liberoAutoSwapped?: LiberoSwapInfo };
```

`liberoPos` = the position the libero occupied after rotation (where the auto-swap happened). Used by UNDO to put the libero back before un-rotating.

- [ ] **Step 2: Add `opponentServing` to `MatchState` (after `liberoReplacements` line ~110)**

The field goes between `liberoReplacements` and `myScore`:
```typescript
  liberoReplacements: Record<number, number>; // liberoId → replacedPlayerId (présent = libero sur terrain)
  opponentServing: boolean;                   // true = adversaire au service
  myScore: number;
```

- [ ] **Step 3: Add `opponentServesFirst` to `AssignSetRolesPayload` (lines 138–143)**

Replace:
```typescript
type AssignSetRolesPayload = {
  positionMap: Record<number, number>;   // pos (1-6) → playerId
  tacticalRoles: Record<number, string>; // playerId → rôle tactique
  liberoActive: boolean;                 // false = libero joue comme joueur normal ce set
  newLiberoId?: number | null;           // désigner un libero si aucun n'était au roster
};
```
With:
```typescript
type AssignSetRolesPayload = {
  positionMap: Record<number, number>;   // pos (1-6) → playerId
  tacticalRoles: Record<number, string>; // playerId → rôle tactique
  liberoActive: boolean;                 // false = libero joue comme joueur normal ce set
  newLiberoId?: number | null;           // désigner un libero si aucun n'était au roster
  opponentServesFirst: boolean;          // true = adversaire sert en premier ce set
};
```

- [ ] **Step 4: Add `opponentServing: false` to `initialState` (after `liberoReplacements` in initialState ~line 196)**

```typescript
  liberoReplacements:  {},
  opponentServing:     false,
  myScore:             0,
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: errors about `opponentServesFirst` not yet used in reducer (or 0 errors if TypeScript infers it). If errors mention the new fields, they are legitimate — they will be fixed in Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(rotation): extend types and state for auto-rotation"
```

---

### Task 2: Add helper functions before `matchReducer`

**Files:**
- Modify: `src/context/MatchContext.tsx` (insert before line `function matchReducer`)

- [ ] **Step 1: Add `applyRotation` helper**

Insert immediately before `function matchReducer(state: MatchState, action: MatchAction): MatchState {`:

```typescript
function applyRotation(players: MatchPlayer[]): MatchPlayer[] {
  return players.map(p => {
    if (!p.onCourt || p.pos === null) return p;
    return { ...p, pos: p.pos === 1 ? 6 : p.pos - 1 };
  });
}

function applyAutoLiberoSwap(
  liberoReplacements: Record<number, number>,
  players: MatchPlayer[],
): {
  players: MatchPlayer[];
  swapInfo?: LiberoSwapInfo;
  newLiberoReplacements: Record<number, number>;
} {
  let currentPlayers = players;
  let swapInfo: LiberoSwapInfo | undefined;
  let newLiberoReplacements = liberoReplacements;

  for (const [liberoIdStr, centralId] of Object.entries(liberoReplacements)) {
    const liberoId = Number(liberoIdStr);
    const libero = currentPlayers.find(p => p.id === liberoId);
    if (!libero || !libero.onCourt || libero.pos === null) continue;
    if (BACK_ROW_POSITIONS.has(libero.pos)) continue; // still in back row — no swap needed

    const liberoPos = libero.pos;
    swapInfo = { liberoId, centralId, liberoPos };

    const { [liberoId]: _removed, ...remaining } = newLiberoReplacements;
    newLiberoReplacements = remaining;

    currentPlayers = currentPlayers.map(p => {
      if (p.id === liberoId) return { ...p, onCourt: false, pos: null };
      if (p.id === centralId) return { ...p, onCourt: true, pos: liberoPos };
      return p;
    });

    break; // only one libero on court at a time in practice
  }

  return { players: currentPlayers, swapInfo, newLiberoReplacements };
}
```

`BACK_ROW_POSITIONS` is already imported at the top of the file (`new Set([1, 5, 6])`). Any libero whose post-rotation position is NOT in the back row (i.e., is in front row 2, 3, or 4) triggers the auto-swap.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: 0 errors (or only errors about `opponentServesFirst` not being passed yet in the reducer — those get fixed in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(rotation): add applyRotation and applyAutoLiberoSwap helpers"
```

---

### Task 3: Update reducer cases in MatchContext

**Files:**
- Modify: `src/context/MatchContext.tsx`

- [ ] **Step 1: Update `ASSIGN_SET_ROLES` case to set `opponentServing`**

In the `ASSIGN_SET_ROLES` return (around line 334), add `opponentServing`:

```typescript
      return {
        ...state,
        setSetupPending:          false,
        liberoId:                 effectiveLiberoId,
        liberoReplacements:       {},
        originalLiberoId:         resolvedOriginalLiberoId,
        matchPlayers:             updatedPlayers,
        lastSetStartPositionMap:  positionMap,
        playerSetPresence,
        opponentServing:          action.payload.opponentServesFirst,
        setRoles: {
          ...state.setRoles,
          [state.setNum]: tacticalRoles,
        },
      };
```

- [ ] **Step 2: Replace the `PLAYER_ACTION` case entirely**

Replace the entire `case ACTION_TYPES.PLAYER_ACTION:` block with:

```typescript
    case ACTION_TYPES.PLAYER_ACTION: {
      const { playerId, actionKey } = action.payload;
      const playerAction = PLAYER_ACTIONS[actionKey];

      const updatedPlayers = state.matchPlayers.map(p => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          stats: {
            ...p.stats,
            [actionKey]: p.stats[actionKey] + 1,
          },
        };
      });

      const newMyScore  = playerAction.mine ? state.myScore + 1  : state.myScore;
      const newOppScore = playerAction.mine ? state.oppScore     : state.oppScore + 1;

      let finalPlayers = updatedPlayers;
      let newLiberoReplacements = state.liberoReplacements;
      let rotated: true | undefined;
      let liberoAutoSwapped: LiberoSwapInfo | undefined;
      let newOpponentServing = state.opponentServing;

      if (playerAction.mine && state.opponentServing) {
        const rotatedPlayers = applyRotation(updatedPlayers);
        const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
        finalPlayers = result.players;
        newLiberoReplacements = result.newLiberoReplacements;
        rotated = true;
        liberoAutoSwapped = result.swapInfo;
        newOpponentServing = false;
      } else if (!playerAction.mine) {
        newOpponentServing = true;
      }

      const historyEntry: HistoryEntry = {
        source: 'player',
        playerId,
        actionKey,
        mine: playerAction.mine,
        ...(rotated ? { rotated } : {}),
        ...(liberoAutoSwapped ? { liberoAutoSwapped } : {}),
      };

      const newTrajectory = [...state.trajectory, { x: newMyScore, y: newOppScore }];

      const player = state.matchPlayers.find(p => p.id === playerId);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'player',
        playerId,
        actionKey,
        playerRole: player?.tacticalRole,
        mine:       playerAction.mine,
        scoreAfter: { my: newMyScore, opp: newOppScore },
      };

      const winner = checkSetEnd(newMyScore, newOppScore, state.mySets === 2 && state.oppSets === 2);

      return {
        ...state,
        matchPlayers:       finalPlayers,
        liberoReplacements: newLiberoReplacements,
        opponentServing:    newOpponentServing,
        myScore:            newMyScore,
        oppScore:           newOppScore,
        history:            [...state.history, historyEntry],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         newTrajectory,
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             winner === 'me'  ? state.mySets + 1  : state.mySets,
        oppSets:            winner === 'opp' ? state.oppSets + 1 : state.oppSets,
      };
    }
```

- [ ] **Step 3: Update `OPP_SCORE` case — add `opponentServing: true`**

Replace:
```typescript
    case ACTION_TYPES.OPP_SCORE: {
      const newOppScore = state.oppScore + 1;
      const winner = checkSetEnd(state.myScore, newOppScore, state.mySets === 2 && state.oppSets === 2);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'opp',
        mine:       false,
        scoreAfter: { my: state.myScore, opp: newOppScore },
      };
      return {
        ...state,
        oppScore:           newOppScore,
        history:            [...state.history, { source: 'opp', mine: false }],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         [...state.trajectory, { x: state.myScore, y: newOppScore }],
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             state.mySets,
        oppSets:            winner === 'opp' ? state.oppSets + 1 : state.oppSets,
      };
    }
```
With:
```typescript
    case ACTION_TYPES.OPP_SCORE: {
      const newOppScore = state.oppScore + 1;
      const winner = checkSetEnd(state.myScore, newOppScore, state.mySets === 2 && state.oppSets === 2);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'opp',
        mine:       false,
        scoreAfter: { my: state.myScore, opp: newOppScore },
      };
      return {
        ...state,
        oppScore:           newOppScore,
        opponentServing:    true,
        history:            [...state.history, { source: 'opp', mine: false }],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         [...state.trajectory, { x: state.myScore, y: newOppScore }],
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             state.mySets,
        oppSets:            winner === 'opp' ? state.oppSets + 1 : state.oppSets,
      };
    }
```

- [ ] **Step 4: Replace the `OPP_FAULT` case entirely**

Replace the entire `case ACTION_TYPES.OPP_FAULT:` block with:

```typescript
    case ACTION_TYPES.OPP_FAULT: {
      const newMyScore = state.myScore + 1;
      const winner = checkSetEnd(newMyScore, state.oppScore, state.mySets === 2 && state.oppSets === 2);

      let finalPlayers = state.matchPlayers;
      let newLiberoReplacements = state.liberoReplacements;
      let rotated: true | undefined;
      let liberoAutoSwapped: LiberoSwapInfo | undefined;
      let newOpponentServing = state.opponentServing;

      if (state.opponentServing) {
        const rotatedPlayers = applyRotation(state.matchPlayers);
        const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
        finalPlayers = result.players;
        newLiberoReplacements = result.newLiberoReplacements;
        rotated = true;
        liberoAutoSwapped = result.swapInfo;
        newOpponentServing = false;
      }

      const historyEntry: HistoryEntry = {
        source: 'opp_fault',
        mine: true,
        ...(rotated ? { rotated } : {}),
        ...(liberoAutoSwapped ? { liberoAutoSwapped } : {}),
      };

      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'opp_fault',
        mine:       true,
        scoreAfter: { my: newMyScore, opp: state.oppScore },
      };

      return {
        ...state,
        matchPlayers:       finalPlayers,
        liberoReplacements: newLiberoReplacements,
        opponentServing:    newOpponentServing,
        myScore:            newMyScore,
        history:            [...state.history, historyEntry],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         [...state.trajectory, { x: newMyScore, y: state.oppScore }],
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             winner === 'me' ? state.mySets + 1 : state.mySets,
        oppSets:            state.oppSets,
      };
    }
```

- [ ] **Step 5: Replace the `UNDO` case entirely**

Replace the entire `case ACTION_TYPES.UNDO:` block with:

```typescript
    case ACTION_TYPES.UNDO: {
      if (state.history.length === 0) return state;

      const last = state.history[state.history.length - 1];
      const newHistory    = state.history.slice(0, -1);
      const newTrajectory = state.trajectory.length > 1
        ? state.trajectory.slice(0, -1)
        : state.trajectory;

      let newMyScore  = state.myScore;
      let newOppScore = state.oppScore;

      if (last.mine) newMyScore  = Math.max(0, newMyScore - 1);
      else           newOppScore = Math.max(0, newOppScore - 1);

      let updatedPlayers = state.matchPlayers;
      if (last.source === 'player') {
        updatedPlayers = state.matchPlayers.map(p => {
          if (p.id !== last.playerId) return p;
          return {
            ...p,
            stats: {
              ...p.stats,
              [last.actionKey]: Math.max(0, p.stats[last.actionKey] - 1),
            },
          };
        });
      }

      let restoredLiberoReplacements = state.liberoReplacements;
      let newOpponentServing = state.opponentServing;

      if (last.rotated) {
        if (last.liberoAutoSwapped) {
          const { liberoId, centralId, liberoPos } = last.liberoAutoSwapped;
          updatedPlayers = updatedPlayers.map(p => {
            if (p.id === liberoId) return { ...p, onCourt: true, pos: liberoPos };
            if (p.id === centralId) return { ...p, onCourt: true, pos: null };
            return p;
          });
          restoredLiberoReplacements = { ...state.liberoReplacements, [liberoId]: centralId };
        }
        updatedPlayers = updatedPlayers.map(p => {
          if (!p.onCourt || p.pos === null) return p;
          return { ...p, pos: p.pos === 6 ? 1 : p.pos + 1 };
        });
        newOpponentServing = true;
      }

      const undoingSetWinner = state.setBannerVisible;
      const newMySets  = undoingSetWinner && last.mine  ? state.mySets  - 1 : state.mySets;
      const newOppSets = undoingSetWinner && !last.mine ? state.oppSets - 1 : state.oppSets;

      return {
        ...state,
        myScore:            newMyScore,
        oppScore:           newOppScore,
        history:            newHistory,
        matchHistory:       state.matchHistory.slice(0, -1),
        trajectory:         newTrajectory,
        matchPlayers:       updatedPlayers,
        liberoReplacements: restoredLiberoReplacements,
        opponentServing:    newOpponentServing,
        setBannerVisible:   undoingSetWinner ? false : state.setBannerVisible,
        setWinner:          undoingSetWinner ? null  : state.setWinner,
        mySets:             newMySets,
        oppSets:            newOppSets,
      };
    }
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: 0 errors. If TypeScript complains about `opponentServesFirst` not being passed in `actions.assignSetRoles` calls in SetSetupScreen, that's expected — it gets fixed in Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(rotation): implement auto-rotation in reducer with undo support"
```

---

### Task 4: Add serve-first toggle to SetSetupScreen

**Files:**
- Modify: `src/screens/SetSetupScreen.tsx`

- [ ] **Step 1: Add `setResults` to destructuring and `opponentServesFirst` local state**

Find:
```typescript
  const { originalStarterIds, originalLiberoId, availableLiberoIds, matchPlayers, setNum, lastSetStartPositionMap } = state;
```

Replace with:
```typescript
  const { originalStarterIds, originalLiberoId, availableLiberoIds, matchPlayers, setNum, lastSetStartPositionMap, setResults } = state;
```

Then add a new `useState` call immediately after the existing `useState` calls (after `liberoActive` state, before the `liberoIdSet` useMemo):

```typescript
  const [opponentServesFirst, setOpponentServesFirst] = useState<boolean>(() => {
    const lastResult = setResults[setResults.length - 1];
    return lastResult ? lastResult.winner === 'opp' : false;
  });
```

- [ ] **Step 2: Pass `opponentServesFirst` in `handleConfirm`**

Find:
```typescript
  const handleConfirm = useCallback(() => {
    actions.assignSetRoles({ positionMap, tacticalRoles, liberoActive });
  }, [actions, positionMap, tacticalRoles, liberoActive]);
```

Replace with:
```typescript
  const handleConfirm = useCallback(() => {
    actions.assignSetRoles({ positionMap, tacticalRoles, liberoActive, opponentServesFirst });
  }, [actions, positionMap, tacticalRoles, liberoActive, opponentServesFirst]);
```

- [ ] **Step 3: Add the serve toggle UI in the header section**

Find the header section ending tag (the closing `</View>` of the header `View` that contains `headerSet`, `headerTitle`, `headerHint`):

```tsx
        <Text style={styles.headerHint}>
          Place 6 joueurs sur le terrain et assigne les rôles
        </Text>
      </View>
```

Replace with:
```tsx
        <Text style={styles.headerHint}>
          Place 6 joueurs sur le terrain et assigne les rôles
        </Text>

        <View style={styles.serveToggle}>
          <Text style={styles.serveLabel}>QUI SERT EN PREMIER ?</Text>
          <View style={styles.serveButtons}>
            <TouchableOpacity
              style={[styles.serveBtn, !opponentServesFirst && styles.serveBtnActive]}
              onPress={() => setOpponentServesFirst(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.serveBtnText, !opponentServesFirst && styles.serveBtnActiveText]}>
                Mon équipe
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.serveBtn, opponentServesFirst && styles.serveBtnActive]}
              onPress={() => setOpponentServesFirst(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.serveBtnText, opponentServesFirst && styles.serveBtnActiveText]}>
                Adversaire
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
```

- [ ] **Step 4: Add styles for the serve toggle**

In `StyleSheet.create({...})`, add after `headerHint`:

```typescript
  serveToggle: {
    marginTop: SPACING.sm,
    alignSelf: 'stretch',
    gap: SPACING.xs,
  },
  serveLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
  },
  serveButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  serveBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
  },
  serveBtnActive: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: `${COLORS.blue}66`,
  },
  serveBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  serveBtnActiveText: {
    color: COLORS.blue,
    fontWeight: '600',
  },
```

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/SetSetupScreen.tsx
git commit -m "feat(rotation): add serve-first toggle to SetSetupScreen"
```

---

### Task 5: Add serve indicator to CourtScreen

**Files:**
- Modify: `src/screens/CourtScreen.tsx`

- [ ] **Step 1: Add `opponentServing` to the state destructuring**

Find:
```typescript
  const { matchPlayers, setBannerVisible, rosterValidated, availableLiberoIds, liberoReplacements, matchHistory, setNum, history } = state;
```

Replace with:
```typescript
  const { matchPlayers, setBannerVisible, rosterValidated, availableLiberoIds, liberoReplacements, matchHistory, setNum, history, opponentServing } = state;
```

- [ ] **Step 2: Add the serve indicator in the `rotationRow`**

Find the `rotationRow` View opening and the Rotation button:
```tsx
        <View style={styles.rotationRow}>
          <TouchableOpacity
            style={[styles.btnRotation, disabled && styles.btnDisabled]}
```

Replace with:
```tsx
        <View style={styles.rotationRow}>
          <View style={styles.serveIndicator}>
            <Text style={[styles.serveIndicatorText, { color: opponentServing ? COLORS.yellow : COLORS.textDark }]}>
              {opponentServing ? '⚡ Adv. sert' : '● Mon service'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnRotation, disabled && styles.btnDisabled]}
```

- [ ] **Step 3: Add styles for the serve indicator**

In `StyleSheet.create({...})`, add after `btnRotationText`:

```typescript
  serveIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  serveIndicatorText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CourtScreen.tsx
git commit -m "feat(rotation): add serve indicator to CourtScreen"
```

---

## Manual Test Checklist

After all tasks complete, verify in the app:

1. **Set setup toggle** — SetSetupScreen shows "QUI SERT EN PREMIER ?" with two buttons. Set 1 defaults to "Mon équipe". Set 2+ auto-selects based on who won the last set.

2. **No rotation when I serve** — Start a set with "Mon équipe" serving. Score a point via any action. Players do NOT move. Indicator shows "● Mon service".

3. **Rotation when opponent serves** — Switch to "Adversaire" serving. Tap "Point adv." to register opponent score. Indicator changes to "⚡ Adv. sert". Now score any point for my team → players rotate one position clockwise (pos decrements, P1 → P6). Indicator returns to "● Mon service".

4. **Libero auto-swap** — Set up with libero on court at position 5 (back row). Register opponent score → my team score. After rotation, libero (was P5, now would be P4 = front row) is automatically swapped out; central takes P4. Libero button shows as inactive.

5. **Undo rotation** — After an auto-rotation, tap "↩ Annuler". Positions revert to pre-rotation state. Libero returns to court (if swap occurred). Indicator shows "⚡ Adv. sert" again.

6. **Undo without rotation** — Score a point while "Mon équipe" is serving. Undo. Only the score reverts. Positions unchanged.

7. **OPP_FAULT trigger** — With opponent serving, tap "Faute adv." (+1 mon équipe). Rotation fires. Indicator updates.
