# Design: OpenAPI Generated Client

**Date:** 2026-05-22  
**Status:** Approved

## Goal

Replace manually coded API DTOs and fetch calls in `matchApi.ts` and `teams.ts` with auto-generated code from the OpenAPI spec. `authApi.ts` stays untouched (complex token logic).

## Stack

- `@hey-api/openapi-ts` — code generator (devDependency)
- `@hey-api/client-fetch` — runtime fetch client with interceptors

## Folder Structure

```
src/data/
├── openapi/               ← committed to repo (not git-ignored)
│   ├── types.gen.ts       ← all DTOs
│   ├── services.gen.ts    ← one function per endpoint
│   └── client.ts          ← configured client instance (interceptors)
├── api.ts                 ← exports doRefresh(), keeps tokenStore logic
├── authApi.ts             ← unchanged
├── matchApi.ts            ← keeps buildMatchResult() + computePlayerSetStats()
├── teams.ts               ← deleted (replaced by generated TeamsService)
└── tokenStore.ts          ← unchanged
```

## Generated Client Configuration (`openapi/client.ts`)

```typescript
import { createClient, createConfig } from '@hey-api/client-fetch';
import { tokenStore } from '../tokenStore';
import { doRefresh } from '../api';

export const apiClient = createClient(createConfig({
  baseUrl: API_URL,
}));

apiClient.interceptors.request.use((request) => {
  const { accessToken } = tokenStore.getTokens();
  if (accessToken) {
    request.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return request;
});

apiClient.interceptors.response.use(async (response, request) => {
  if (response.status !== 401) return response;
  const refreshed = await doRefresh();
  if (refreshed) {
    const { accessToken } = tokenStore.getTokens();
    if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
    return apiClient.instance.fetch(request);
  }
  tokenStore.triggerUnauthenticated();
  return response;
});
```

## Auth Flow

1. Every request → request interceptor injects `Bearer <accessToken>` from `tokenStore`
2. 401 response → response interceptor calls `doRefresh()` from `api.ts`
3. Refresh success → retry original request with new token
4. Refresh fail → `tokenStore.triggerUnauthenticated()` → AuthGate logs user out

## Migration Plan

### `teams.ts`
- Delete file
- All callers use generated `TeamsService.getTeams()` directly

### `matchApi.ts`
- Remove: `StatsDto`, `TimelineEntry`, `SetStatDto`, `PlayerSetStatDto`, `PlayerStatDto`, `MatchDto`, `MetaDto`, `MatchStatRequest` — all replaced by `types.gen.ts`
- Remove: `sendMatchResult`, `getMatchDetail`, `getTeamMatches`, `getPlayerSeasonStats` — replaced by generated service functions
- Keep: `buildMatchResult()`, `computePlayerSetStats()`, `aggregateStats()`, `toStatsDto()` — business logic, not generatable
- Re-export public types (`MatchDetail`, `MatchSummary`, `PlayerSeasonStats`, etc.) from `types.gen.ts` to avoid breaking screen imports

### `api.ts`
- Export `doRefresh()` (currently unexported)
- Keep `apiFetch` for now (used by `authApi.ts`); can be removed in a follow-up once all callers migrated

## Generation Script

```json
"scripts": {
  "generate-api": "openapi-ts --input src/data/openapi-spec.json --output src/data/openapi --client @hey-api/client-fetch"
}
```

OpenAPI spec file: `src/data/openapi-spec.json` (committed to repo).

Generated files are committed — no build step required, compatible with Expo managed workflow.

## Constraints

- No ejecting from Expo managed workflow
- `@hey-api/client-fetch` uses native `fetch` — no axios, no polyfill needed
- `@hey-api/openapi-ts` is devDependency only — zero runtime cost
- TypeScript strict: generated types must satisfy `no any`, `no !` rules from CLAUDE.md
