# Live Stats — Envoi backend via EndMatchModal

**Date:** 2026-06-06
**Statut:** Approuvé

## Objectif

Quand l'utilisateur clique "Envoyer et terminer" en mode saisie temps réel, envoyer les stats au backend via `POST /api/matches/{matchId}/live-stats` avec la payload définie dans `docs/live-stats-api-contract.md`, au lieu du endpoint classique.

## Contexte

- `EndMatchModal` est partagé entre mode classique et mode live (rendu par `ScoreHeader`)
- En mode live, `ScoreHeader` est à l'intérieur de `LiveStatsProvider` (App.tsx:411)
- `buildLiveStatsPayload` existe déjà dans `src/data/liveStatsPayload.ts`
- Le endpoint live-stats n'est pas dans l'OpenAPI spec → appel `client` direct

## Architecture — 3 fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/context/LiveStatsContext.tsx` | Ajouter `useLiveStatsMaybe()` — retourne `null` hors provider |
| `src/data/matchApi.ts` | Ajouter `sendLiveStats(matchId, payload)` — POST direct |
| `src/components/EndMatchModal.tsx` | Détecter mode live via `useLiveStatsMaybe`, bifurquer payload + endpoint |

## Détail des changements

### `useLiveStatsMaybe`

```ts
export const useLiveStatsMaybe = (): LiveStatsContextValue | null => {
  return useContext(LiveStatsContext);
};
```

Permet à `EndMatchModal` de détecter le mode sans prop drilling. Retourne `null` en mode classique (hors provider), valeur non-null en mode live.

### `sendLiveStats`

```ts
export const sendLiveStats = async (
  matchId: string,
  payload: MatchLiveStatsPayload,
): Promise<void> => {
  const response = await client.post({
    url: '/api/matches/{matchId}/live-stats',
    path: { matchId },
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.error !== undefined) throw new Error('Failed to send live stats');
};
```

### `EndMatchModal` — logique bifurquée

```ts
const liveCtx = useLiveStatsMaybe();
const isLive = liveCtx !== null;

// handleConfirm:
if (isLive) {
  const matchId = String(Date.now());
  const venue = matchState.isHome ? 'home' : 'away';
  const payload = buildLiveStatsPayload(
    matchId, selectedTeam.id, selectedTeam.name,
    venue, liveCtx.state.setsWon, liveCtx.state.events,
  );
  await sendLiveStats(matchId, payload);
} else {
  const payload = buildMatchResult(matchState, selectedTeam);
  await sendMatchResult(payload);
}
```

Résumé affiché en mode live : `liveCtx.state.events.length` events au lieu de `matchHistory.length` points.

## Données disponibles pour buildLiveStatsPayload

| Paramètre | Source |
|---|---|
| `matchId` | `String(Date.now())` |
| `teamId` | `selectedTeam.id` |
| `teamName` | `selectedTeam.name` |
| `title` | `matchState.matchName` |
| `venue` | `matchState.isHome ? 'home' : 'away'` |
| `setsWon` | `liveCtx.state.setsWon` |
| `events` | `liveCtx.state.events` |

## Hors scope

- Aucun changement à `ScoreHeader` ni `App.tsx`
- `useLiveStats()` (avec throw) reste inchangé pour les écrans qui en ont besoin
- Pas de retry automatique — même comportement que mode classique