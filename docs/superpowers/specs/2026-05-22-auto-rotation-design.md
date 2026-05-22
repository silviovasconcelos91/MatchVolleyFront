# Auto-Rotation — Design Spec
_2026-05-22_

## Context

Volleyball rotation rule: when a team wins a rally while the opponent is serving, that team gains the serve and all players rotate one position clockwise (pos - 1, pos 1 → 6).

Currently the app requires the coach to tap the Rotation button manually. This spec describes automating that rotation and the associated libero swap.

---

## Trigger Logic

- **Opponent scores** (`PLAYER_ACTION` mine:false, `OPP_SCORE`) → `opponentServing: true`
- **My team scores while opponent serving** (`PLAYER_ACTION` mine:true or `OPP_FAULT`, and `opponentServing === true`) → auto-rotate + `opponentServing: false`
- **My team scores while already serving** → score only, no rotation

---

## State Changes

### `MatchState`

```typescript
opponentServing: boolean;  // true = opponent currently holds serve
```

Initialized to `false` in `initialState`.

### `AssignSetRolesPayload`

```typescript
opponentServesFirst: boolean;
```

`ASSIGN_SET_ROLES` writes this value to `opponentServing`.

**Set 1:** coach selects in SetSetupScreen.  
**Sets 2+:** auto-derived from `setResults` — if opponent won the previous set → `true`, else `false`. Coach can override in SetSetupScreen.

### `HistoryEntry` — optional rotation fields

```typescript
rotated?: true;
liberoAutoSwapped?: { liberoId: number; centralId: number; liberoPos: number };
```

Added as optional fields on all variants. `liberoPos` = libero's position **after** rotation (= position where the auto-swap occurred). Needed by UNDO to restore the correct state.

---

## Reducer Changes

### Helper: `applyRotation`

```typescript
function applyRotation(players: MatchPlayer[]): MatchPlayer[] {
  return players.map(p => {
    if (!p.onCourt || p.pos === null) return p;
    return { ...p, pos: p.pos === 1 ? 6 : p.pos - 1 };
  });
}
```

### Helper: `applyAutoLiberoSwap`

Iterates over **all** entries in `liberoReplacements` (supports two liberos). For each active libero that has landed on a front-row position (2, 3, 4) after rotation, swaps them out. In practice only one libero is on court at a time, but the loop handles both. Front-row trigger in practice: libero at pos 5 rotates to pos 4.

```typescript
function applyAutoLiberoSwap(
  liberoReplacements: Record<number, number>,
  players: MatchPlayer[],
): {
  players: MatchPlayer[];
  swapInfo?: { liberoId: number; centralId: number; liberoPos: number };
  newLiberoReplacements: Record<number, number>;
} 
```

If triggered:
- Libero → `{ onCourt: false, pos: null }`
- Central → `{ onCourt: true, pos: liberoPos }` (takes libero's front-row position)
- `liberoReplacements` entry removed

Returns unchanged players + original replacements if no trigger condition.

### `PLAYER_ACTION` & `OPP_FAULT` (mine: true)

After score update, if `state.opponentServing === true`:
1. `rotatedPlayers = applyRotation(updatedPlayers)`
2. `{ players, swapInfo, newLiberoReplacements } = applyAutoLiberoSwap(state.liberoReplacements, rotatedPlayers)`
3. History entry includes `rotated: true` and `liberoAutoSwapped: swapInfo`
4. State: `opponentServing: false`, `liberoReplacements: newLiberoReplacements`

### `PLAYER_ACTION` (mine: false) & `OPP_SCORE`

State: `opponentServing: true`. No rotation.

### `UNDO`

If `last.rotated === true`:
1. If `last.liberoAutoSwapped`:
   - Libero → `{ onCourt: true, pos: liberoPos }`
   - Central → `{ onCourt: true, pos: null }`
   - Restore `liberoReplacements` entry
2. Un-rotate all `onCourt` players: `pos === 6 ? 1 : pos + 1`
3. `opponentServing: true`

Score/stats reverted as before.

### `CLOSE_SET_BANNER`

No reset of `opponentServing` — it will be overwritten by the next `ASSIGN_SET_ROLES`.

---

## UI Changes

### SetSetupScreen — "Qui sert en premier ?"

New toggle block in the header section (below title, above court grid).

Two buttons: **Mon équipe** / **Adversaire**.

Sets 2+: pre-filled from previous set result. Coach can override.

`handleConfirm` passes `opponentServesFirst` to `assignSetRoles(...)`.

### CourtScreen — Serve indicator

Small badge in `rotationRow`, left of the Rotation button:

- Opponent serving → `⚡ Adv. sert` in yellow (`COLORS.yellow`)
- My team serving → `Mon service` in muted grey (`COLORS.textDark`)

Font: `FONT_SIZE.xs`, no border, text only.

The manual Rotation button remains fully functional for manual corrections.

No toast or animation on auto-rotation — the updated court positions are sufficient feedback.

---

## Files Modified

| File | Change |
|------|--------|
| `src/context/MatchContext.tsx` | `opponentServing` state field; `AssignSetRolesPayload` extension; `HistoryEntry` extension; reducer handlers for PLAYER_ACTION, OPP_FAULT, OPP_SCORE, UNDO, ASSIGN_SET_ROLES; two helper functions |
| `src/screens/SetSetupScreen.tsx` | Serve-first toggle UI; pass `opponentServesFirst` to `assignSetRoles` |
| `src/screens/CourtScreen.tsx` | Serve indicator badge in `rotationRow` |
