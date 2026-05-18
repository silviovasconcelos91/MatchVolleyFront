# Malus Feature Design
Date: 2026-05-18

## Summary

Allow the user to apply a point penalty (−1 or −2) to either team during a set, triggered by long-pressing the team's score in the ScoreHeader.

## Interaction Flow

1. User long-presses a score in `ScoreHeader` (left = my team, right = opponent).
2. `MalusModal` opens with the target team pre-set.
3. User selects amount: −1 or −2.
4. User taps Confirm → `APPLY_MALUS` dispatched → modal closes.
5. Score updates immediately; set-end check is NOT run (penalty is a deduction, not a gain).

## Components

### `ScoreHeader.tsx` (modified)

- Wrap each score `Text` in a `Pressable` with `onLongPress`.
- Disabled when `setBannerVisible` or `!rosterValidated` (same gate as other controls).
- Visual feedback: `opacity` on press via `Pressable`'s `style` callback.
- State: `malusTarget: 'me' | 'opp' | null` — controls modal visibility.

### `MalusModal.tsx` (new component)

- Receives: `target: 'me' | 'opp'`, `onConfirm: (amount: 1 | 2) => void`, `onClose: () => void`.
- Reuses `ModalBase`.
- Title: `"Malus — Mon équipe"` or `"Malus — Adversaire"`.
- Two toggle buttons: `−1` / `−2`.
- Confirm button: disabled until an amount is selected.
- Cancel closes without dispatching.
- Resets selected amount on close.

## State / Reducer

### New action

```ts
APPLY_MALUS: 'APPLY_MALUS'
```

### Payload type

```ts
{ target: 'me' | 'opp'; amount: 1 | 2 }
```

### Reducer logic

```ts
case ACTION_TYPES.APPLY_MALUS: {
  const { target, amount } = action.payload;
  const newMyScore  = target === 'me'  ? Math.max(0, state.myScore  - amount) : state.myScore;
  const newOppScore = target === 'opp' ? Math.max(0, state.oppScore - amount) : state.oppScore;
  const matchEvent: MatchHistoryEvent = {
    index:  state.matchHistory.length,
    setNum: state.setNum,
    source: 'malus',
    target,
    amount,
    mine:   target === 'me',
    scoreAfter: { my: newMyScore, opp: newOppScore },
  };
  return {
    ...state,
    myScore:      newMyScore,
    oppScore:     newOppScore,
    matchHistory: [...state.matchHistory, matchEvent],
    // NOT added to `history` → not undoable
  };
}
```

### `MatchHistoryEvent` type extension

Add new source variant: `source: 'malus'` with fields `target: 'me' | 'opp'` and `amount: 1 | 2`.

### Context action

```ts
applyMalus: (payload: { target: 'me' | 'opp'; amount: 1 | 2 }) => void
```

## Constraints

- Score clamped at 0 (`Math.max(0, score - amount)`).
- Not undoable — not added to `state.history`.
- No set-end check after malus.
- Disabled when `setBannerVisible` or `!rosterValidated`.
- Modal resets amount selection on each open.

## Out of scope

- Displaying malus events in the graph or stats screens (existing screens unaffected).
- Malus history display.
