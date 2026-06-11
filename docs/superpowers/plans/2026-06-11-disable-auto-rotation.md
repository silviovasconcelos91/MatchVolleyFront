# Disable Auto-Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the coach to turn automatic player rotation on/off live from `LiveStatsScreen`; when off, rotations are 100% manual via the ↻ button.

**Architecture:** Add `autoRotateEnabled: boolean` to `MatchContext` state (default `true`). The side-out rotation blocks in the reducer (`PLAYER_ACTION`, `OPP_FAULT`) only rotate when the flag is on; serve-tracking (`opponentServing`) is unaffected. Manual `ROTATE` is upgraded to also run the auto-libero swap for parity. A `Switch` in the footer toggles the flag.

**Tech Stack:** React Native (Expo), TypeScript strict, Context API + useReducer, StyleSheet.

**Verification note:** This repo has **no unit-test runner** (no `jest`/`vitest`, no `test` script in `package.json`). The verification gate for every task is `npx tsc --noEmit` (type check) plus the manual UI check described. Do **not** invent a test runner — adding one is out of scope.

---

## File Structure

- Modify: `src/context/MatchContext.tsx`
  - `ACTION_TYPES` — add `TOGGLE_AUTO_ROTATE`
  - `MatchState` type — add `autoRotateEnabled: boolean`
  - `MatchAction` union — add the new action
  - `MatchContextValue.actions` — add `toggleAutoRotate: () => void`
  - `initialState` — add `autoRotateEnabled: true`
  - reducer `PLAYER_ACTION` (~L436) — gate rotation on the flag
  - reducer `OPP_FAULT` (~L524) — gate rotation on the flag
  - reducer `ROTATE` (~L635) — add libero swap parity
  - reducer — add `TOGGLE_AUTO_ROTATE` case
  - `actions` object (~L803) — wire `toggleAutoRotate`
- Modify: `src/screens/LiveStatsScreen/LiveStatsScreen.tsx` — footer `Switch`
- Modify: `src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts` — toggle styles

---

## Task 1: Add `autoRotateEnabled` state + toggle action (no behavior change yet)

**Files:**
- Modify: `src/context/MatchContext.tsx`

- [ ] **Step 1: Add the action type**

In `ACTION_TYPES` (`src/context/MatchContext.tsx`, after the `ROTATE`/`LIBERO_SWAP` block ~L22-23), add under a new comment:

```ts
  // Terrain
  ROTATE:             'ROTATE',             // effectuer une rotation
  LIBERO_SWAP:        'LIBERO_SWAP',        // faire entrer/sortir le libero
  TOGGLE_AUTO_ROTATE: 'TOGGLE_AUTO_ROTATE', // activer/désactiver la rotation auto au side-out
```

- [ ] **Step 2: Add the state field to the `MatchState` type**

After `opponentServing: boolean;` (~L114):

```ts
  opponentServing: boolean;                   // true = adversaire au service
  autoRotateEnabled: boolean;                 // true = rotation auto au side-out (sinon 100% manuelle)
```

- [ ] **Step 3: Add the action to the `MatchAction` union**

After the `ROTATE` line (~L160):

```ts
  | { type: typeof ACTION_TYPES.ROTATE }
  | { type: typeof ACTION_TYPES.TOGGLE_AUTO_ROTATE }
```

- [ ] **Step 4: Add the action to `MatchContextValue.actions` type**

After `rotate: () => void;` (~L180):

```ts
    rotate:          () => void;
    toggleAutoRotate: () => void;
```

- [ ] **Step 5: Add the field to `initialState`**

After `opponentServing: false,` (~L201):

```ts
  opponentServing:     false,
  autoRotateEnabled:   true,
```

- [ ] **Step 6: Add the reducer case**

Add a new `case` next to the `ROTATE` case (~L635-643):

```ts
    case ACTION_TYPES.TOGGLE_AUTO_ROTATE:
      return { ...state, autoRotateEnabled: !state.autoRotateEnabled };
```

- [ ] **Step 7: Wire the action creator**

After `rotate: () => dispatch({ type: ACTION_TYPES.ROTATE }),` (~L813):

```ts
    rotate:          ()        => dispatch({ type: ACTION_TYPES.ROTATE }),
    toggleAutoRotate: ()       => dispatch({ type: ACTION_TYPES.TOGGLE_AUTO_ROTATE }),
```

- [ ] **Step 8: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The new field/action are wired everywhere the union/types require.

- [ ] **Step 9: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(match): add autoRotateEnabled state + toggle action"
```

---

## Task 2: Gate side-out rotation on the flag

**Files:**
- Modify: `src/context/MatchContext.tsx` — `PLAYER_ACTION` (~L436) and `OPP_FAULT` (~L524)

- [ ] **Step 1: Gate the `PLAYER_ACTION` rotation block**

Replace the existing block (~L436-446):

```ts
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
```

with:

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

Note: `newOpponentServing = false` stays **outside** the `autoRotateEnabled` check — serve tracking is independent of the toggle.

- [ ] **Step 2: Gate the `OPP_FAULT` rotation block**

Replace the existing block (~L524-532):

```ts
      if (state.opponentServing) {
        const rotatedPlayers = applyRotation(state.matchPlayers);
        const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
        finalPlayers = result.players;
        newLiberoReplacements = result.newLiberoReplacements;
        rotated = true;
        liberoAutoSwapped = result.swapInfo;
        newOpponentServing = false;
      }
```

with:

```ts
      if (state.opponentServing) {
        if (state.autoRotateEnabled) {
          const rotatedPlayers = applyRotation(state.matchPlayers);
          const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
          finalPlayers = result.players;
          newLiberoReplacements = result.newLiberoReplacements;
          rotated = true;
          liberoAutoSwapped = result.swapInfo;
        }
        newOpponentServing = false;
      }
```

- [ ] **Step 2b: Sanity — undo stays correct**

No code change. Confirm by reading: when `autoRotateEnabled` is false, `rotated` stays `undefined`, so the history entry has no `rotated` marker and the UNDO case (~L597 `if (last.rotated)`) will not try to un-rotate. Nothing to edit.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `npx expo start --clear`, open a live match.
- With auto ON (default): score a point at side-out (opponent was serving) → players rotate (existing behavior, not regressed).
- (Toggle UI not built yet; manual flag flip can be confirmed in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(match): skip auto-rotation at side-out when disabled"
```

---

## Task 3: Manual `ROTATE` runs libero swap (parity)

**Files:**
- Modify: `src/context/MatchContext.tsx` — `ROTATE` case (~L635-643)

- [ ] **Step 1: Upgrade the `ROTATE` case**

Replace (~L635-643):

```ts
    case ACTION_TYPES.ROTATE:
      return {
        ...state,
        // Règle officielle : chaque poste -1, poste 1 revient à 6
        matchPlayers: state.matchPlayers.map(p => {
          if (!p.onCourt || p.pos === null) return p;
          return { ...p, pos: p.pos === 1 ? 6 : p.pos - 1 };
        }),
      };
```

with:

```ts
    case ACTION_TYPES.ROTATE: {
      // Règle officielle : chaque poste -1, poste 1 revient à 6.
      // On applique aussi le swap libéro auto pour la parité avec la rotation auto.
      const rotatedPlayers = applyRotation(state.matchPlayers);
      const result = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers);
      return {
        ...state,
        matchPlayers:       result.players,
        liberoReplacements: result.newLiberoReplacements,
      };
    }
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual verification**

In a live match with a libero replacement active, press the footer ↻ button. The rotation occurs AND the libero auto-swap fires when the libero reaches the back/front transition — same as auto-rotation did.

- [ ] **Step 4: Commit**

```bash
git add src/context/MatchContext.tsx
git commit -m "feat(match): manual rotate triggers auto-libero swap"
```

---

## Task 4: Footer toggle UI in `LiveStatsScreen`

**Files:**
- Modify: `src/screens/LiveStatsScreen/LiveStatsScreen.tsx` (footer ~L337-365)
- Modify: `src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts`

- [ ] **Step 1: Read the current footer + how match state is accessed**

Read `src/screens/LiveStatsScreen/LiveStatsScreen.tsx` around L337-365 (footer) and locate where `matchActions` / match `state` come from (search for `useContext`/`useMatch`/`matchActions` near the top of the file). Use the same hook to read `autoRotateEnabled`. If the screen currently only destructures `actions`, also destructure `state` from the same context value.

- [ ] **Step 2: Import `Switch`**

Ensure `Switch` is in the `react-native` import at the top of `LiveStatsScreen.tsx` (add it to the existing import list if absent):

```ts
import { View, Text, TouchableOpacity, Switch /*, …existing… */ } from 'react-native';
```

- [ ] **Step 3: Add the toggle to the footer**

In the footer `View` (~L338), insert before the ↻ `TouchableOpacity` (~L350):

```tsx
        <View style={styles.autoRotateToggle}>
          <Text style={styles.autoRotateLabel}>Rotation auto</Text>
          <Switch
            value={matchState.autoRotateEnabled}
            onValueChange={matchActions.toggleAutoRotate}
          />
        </View>
```

Use whatever the local variable name for the match state is (e.g. `state`, `matchState`); replace `matchState` above accordingly. The ↻ button stays unchanged (always active, both modes).

- [ ] **Step 4: Add styles**

In `src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts`, add to the `StyleSheet.create({ … })` object, using tokens from `constants/theme.ts`:

```ts
  autoRotateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  autoRotateLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
```

Verify `SPACING.xs`, `FONT_SIZE.sm`, and `COLORS.text` exist in `constants/theme.ts`; if a token name differs, use the nearest existing equivalent (check the top imports of this styles file for what's already imported). Add `SPACING`/`FONT_SIZE`/`COLORS` to the theme import in this file if not already present.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npx expo start --clear`, open a live match.
- Toggle "Rotation auto" OFF. Score a point at side-out → players do **not** rotate; serve flips to our side.
- Press ↻ → players rotate manually.
- Toggle ON → score at side-out → players rotate automatically again.
- Undo after an OFF-mode side-out → no rotation is reverted; score/serve revert cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/screens/LiveStatsScreen/LiveStatsScreen.tsx src/screens/LiveStatsScreen/LiveStatsScreen.styles.ts
git commit -m "feat(live-stats): footer toggle for auto-rotation"
```

---

## Done criteria

- `autoRotateEnabled` defaults to `true`; persists across sets (CLOSE_SET_BANNER spreads `...state`), resets with RESET_MATCH (returns `initialState`).
- Auto OFF → no rotation at side-out, serve still tracked, undo clean.
- Manual ↻ rotates and runs libero swap in both modes.
- Toggle live-switchable from the footer, ↻ always active.
- `npx tsc --noEmit` passes.