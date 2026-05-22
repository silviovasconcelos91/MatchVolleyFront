# Manual Set End — Design Spec
_2026-05-22_

## Context

Tournament play can use time-based sets. A set may end at any score (e.g. 8-6) rather than reaching 25 points. The app currently only ends a set automatically when `checkSetEnd` fires. This spec adds a manual set-end triggered by the coach.

---

## Trigger

Long press (600ms) on the **"SET X"** label in `ScoreHeader`. The 600ms delay avoids conflict with the existing malus long press (400ms) on the score numbers.

Disabled when:
- `!rosterValidated` (match not started)
- `setBannerVisible === true` (set already ended, banner showing)

---

## Winner Derivation

```typescript
const winner: SetWinner =
  state.myScore > state.oppScore ? 'me' :
  state.oppScore > state.myScore ? 'opp' :
  null; // equal scores → no declared winner
```

---

## New Action: `FORCE_END_SET`

```typescript
FORCE_END_SET: 'FORCE_END_SET'
```

No payload. Added to `ACTION_TYPES`, `MatchAction` union, and `actions` in context.

### Reducer case

```typescript
case ACTION_TYPES.FORCE_END_SET: {
  const winner: SetWinner =
    state.myScore > state.oppScore ? 'me' :
    state.oppScore > state.myScore ? 'opp' :
    null;
  return {
    ...state,
    setBannerVisible: true,
    setWinner:        winner,
    mySets:           winner === 'me'  ? state.mySets + 1  : state.mySets,
    oppSets:          winner === 'opp' ? state.oppSets + 1 : state.oppSets,
  };
}
```

Scores are **not reset here** — the existing `CLOSE_SET_BANNER` action handles that when the coach dismisses the banner. `SetResult` is recorded by `CLOSE_SET_BANNER` with the current (non-zero) scores intact.

---

## UI

### `ScoreHeader.tsx`

- Add local state: `const [forceEndVisible, setForceEndVisible] = useState(false)`
- Wrap the existing `<Text style={styles.setLabel}>SET {setNum}</Text>` in a `<Pressable>`:

```tsx
<Pressable
  onLongPress={() => { if (forceEndEnabled) setForceEndVisible(true); }}
  delayLongPress={600}
>
  <Text style={styles.setLabel}>SET {setNum}</Text>
</Pressable>
```

Where `forceEndEnabled = rosterValidated && !setBannerVisible`.

- Render `<ForceEndSetModal>` with current scores + handlers.

### `ForceEndSetModal.tsx` (new file)

Follows the pattern of `MalusModal` / `ModalBase`.

**Props:**
```typescript
type Props = {
  visible: boolean;
  setNum: number;
  myScore: number;
  oppScore: number;
  onConfirm: () => void;
  onClose: () => void;
};
```

**Content:**
- Title: `"Terminer le Set {setNum} ?"`
- Score display: `"{myScore} – {oppScore}"` using `COLORS.scoreHome` / `COLORS.scoreAway`
- Winner badge:
  - `myScore > oppScore` → `"→ Mon équipe gagne"` (green)
  - `oppScore > myScore` → `"→ Adversaire gagne"` (red)
  - Equal → `"Égalité"` (muted)
- **Confirmer** button → calls `onConfirm()`
- **Annuler** button → calls `onClose()`

---

## Files Modified / Created

| File | Change |
|------|--------|
| `src/context/MatchContext.tsx` | `FORCE_END_SET` in `ACTION_TYPES`; `MatchAction` union; reducer case; `forceEndSet` in `actions` |
| `src/components/ScoreHeader.tsx` | `forceEndVisible` local state; `Pressable` wrapper on SET label; `ForceEndSetModal` rendered |
| `src/components/ForceEndSetModal.tsx` | New component |

---

## Flow Summary

1. Coach long-presses "SET X" → `ForceEndSetModal` opens
2. Modal shows current score + derived winner
3. Coach taps **Confirmer** → `FORCE_END_SET` dispatched
4. Reducer sets `setBannerVisible: true`, `setWinner`, increments set count
5. `SetBanner` appears (existing component, no change)
6. Coach taps to close banner → `CLOSE_SET_BANNER` (existing, no change)
7. `SetResult` recorded with scores as-is, scores reset to 0, `setNum++`, `setSetupPending: true`
