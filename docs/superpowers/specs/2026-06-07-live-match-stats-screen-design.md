# Live Match Stats Screen — Design Spec
**Date:** 2026-06-07

## Goal

Replace `LiveStatsSummaryScreen` in the live mode stats tab with a component (`LiveMatchStatsScreen`) that mirrors `StatsScreen`'s layout — set section + match total section, TeamSummary, PlayerCard — but reads stat data from `LiveStatsContext` instead of `MatchContext`.

Player display metadata (name, numero, tacticalRole, onCourt, pos, color) continues to come from `MatchContext.matchPlayers`.

Classic mode and `StatsScreen` are not touched (scheduled for deletion when classic mode is removed).

---

## Architecture

### Data sources

| Data | Source |
|------|--------|
| Stat numbers (pt, atk, block…) | `useLiveStats()` |
| Player metadata (name, numero, tacticalRole, onCourt, pos) | `useMatch()` |
| Current set number | `useLiveStats().state.currentSet` |
| Set events | `useLiveStats().state.sets[setNum]` |

### LiveActionKey → ActionKey mapping

Only `mine`-team events are mapped to a player's `PlayerStats`. Opponent events affect score but not individual player stats.

| LiveActionKey | ActionKey | Note |
|---------------|-----------|------|
| `attack_pt` | `atk` | attack point |
| `ace` | `ace` | |
| `block_pt` | `block` | |
| `relance_pt` | `pt` | other point |
| `attack_fault` | `atk_out` | |
| `serve_fault` | `srv_out` | |
| `recv_fault` | `recv` | |
| `fault` | `fault` | |
| neutral keys | — | ignored |

### Score computation

`computeScoreFromLive(events: LiveStatEvent[]): { mine: number; opp: number }`

```
mine  team + point  category → mine++
mine  team + fault  category → opp++
opp   team + point  category → opp++
opp   team + fault  category → mine++
```

### Set stats computation

`computeSetStatsFromLive(events: LiveStatEvent[], playerIds: number[]): Record<number, PlayerStats>`

- Only processes events where `team === 'mine'` and `playerId` is in `playerIds`
- Maps `actionKey` via the table above
- Returns a `PlayerStats` record per player (zeroed for players with no events)

---

## Component: LiveMatchStatsScreen

**File:** `src/screens/LiveMatchStatsScreen.tsx`

**Hooks used:**
- `useLiveStats()` — events + currentSet
- `useMatch()` — matchPlayers (metadata + accumulated stats not used for display)

**Render structure** (identical to `StatsScreen`):

```
ScrollView
  ── Section "SET {currentSet}"
     TeamSummary (score from live events for current set)
     PlayerCard × matchPlayers sorted by set points desc

  ── SectionDivider

  ── Section "MATCH TOTAL"
     TeamSummary (score summed across all sets)
     PlayerCard × matchPlayers sorted by match points desc
```

**Empty state:** if `matchPlayers` is empty or no events recorded, render same "Valider l'équipe" guard as `StatsScreen`.

**Score for MATCH TOTAL:**
- Per-set score computed from each `state.sets[n]` events
- Summed across all sets (not using `setsWon` — keep score tied to event source)

**PlayerCard props:**
- `stats` — from `computeSetStatsFromLive` or match aggregate
- `name`, `numero`, `tacticalRole`, `onCourt`, `pos` — from `matchPlayers`
- `color` — from `getPositionColor(player.tacticalRole)`

**Sorting:**
- Set section: sorted by `getTotalPoints(setStats[player.id])`
- Match section: sorted by total points across all sets

---

## Files changed

| File | Change |
|------|--------|
| `src/screens/LiveMatchStatsScreen.tsx` | New file |
| `App.tsx` | Line ~438: `LiveStatsSummaryScreen` → `LiveMatchStatsScreen` |

`StatsScreen` and `LiveStatsSummaryScreen` are not modified.

---

## Out of scope

- Modifying `StatsScreen` (classic mode, to be deleted later)
- Modifying `LiveStatsSummaryScreen` (stays in codebase, just no longer rendered)
- Any changes to `LiveStatsContext` or `MatchContext`
- Styling changes beyond matching `StatsScreen`'s existing style