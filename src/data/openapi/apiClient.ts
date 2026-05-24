/**
 * Configures the default hey-api generated client with:
 *  - baseUrl from API_URL (overrides the localhost:8080 hardcoded in client.gen.ts)
 *  - request interceptor: injects Authorization: Bearer <accessToken>
 *  - response interceptor: on 401 → refresh token → retry;
 *                          on refresh failure → triggerUnauthenticated()
 *
 * NOTE: This file is named apiClient.ts (not client.ts) to avoid a TypeScript
 * module resolution collision with the generated client/ directory barrel
 * (src/data/openapi/client/index.ts). The generated files import './client'
 * which resolves to that directory; naming ours 'client.ts' would shadow it.
 *
 * Import this file before any SDK call — the side effects register the interceptors.
 */

import { API_URL, doRefresh } from '../api';
import { tokenStore } from '../tokenStore';
import { client } from './client.gen';
import type { ResolvedRequestOptions } from './client/types.gen';

// ── 1. Override baseUrl (client.gen.ts hardcodes localhost:8080) ──────────────
client.setConfig({ baseUrl: API_URL });

// ── 2. Request interceptor — inject Bearer token ──────────────────────────────
client.interceptors.request.use((request: Request): Request => {
  const { accessToken } = tokenStore.getTokens();
  if (!accessToken) return request;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return new Request(request, { headers });
});

// ── 3. Response interceptor — handle 401: refresh + retry ────────────────────
client.interceptors.response.use(
  async (response: Response, request: Request, opts: ResolvedRequestOptions): Promise<Response> => {
    if (response.status !== 401) return response;

    const refreshed = await doRefresh();

    if (!refreshed) {
      tokenStore.triggerUnauthenticated();
      return response;
    }

    // Rebuild request from scratch — request.body is consumed after the initial fetch,
    // so new Request(request, { headers }) would send an empty body on retry.
    const { accessToken: newToken } = tokenStore.getTokens();
    const headers = new Headers(request.headers);
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
    }
    return fetch(new Request(request.url, {
      method: request.method,
      redirect: request.redirect,
      headers,
      body: opts.serializedBody ?? null,
    }));
  },
);

export { client };
