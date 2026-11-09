// ─────────────────────────────────────────────
//  API — DIFFUSION LIVE PUBLIQUE (overlay OBS / Twitch)
//  Contrat : docs/live-overlay-api-doc.md
//
//  - Endpoints /live-sessions/** : authentifiés (client hey-api + interceptors).
//  - GET /public/live/{code}     : fetch nu, jamais de token ni de refresh 401.
// ─────────────────────────────────────────────

import { client } from './openapi/client.gen';
import { API_URL } from './api';
import type { MatchLiveStatsPayload } from './liveStatsPayload';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LiveVenue = 'home' | 'away';
export type LiveSide = 'mine' | 'opp';
export type LiveSessionStatus = 'LIVE' | 'ENDED';

export type LiveSession = {
  sessionId:       string;
  code:            string;
  publicUrl:       string;
  title:           string;
  venue:           LiveVenue;
  status:          LiveSessionStatus;
  showPlayerNames: boolean;
  revision:        number;
  matchId:         string | null;
  createdAt:       string;
  updatedAt:       string;
  endedAt:         string | null;
  expiresAt:       string;
};

export type CreateLiveSessionRequest = {
  teamId:           number;
  title:            string;
  venue:            LiveVenue;
  showPlayerNames?: boolean;
};

export type SnapshotResult = { revision: number; applied: boolean };

export type SidesScore = { mine: number; opp: number };

export type PublicLivePoint = {
  sequence:   number;
  setNumber:  number;
  scoredFor:  LiveSide;
  scoreAfter: SidesScore;
  team:       LiveSide;
  player:     { jersey: number; name: string | null };
  action:     { key: string; label: string; category: 'point' | 'fault' | 'neutral' };
};

export type PublicLiveView = {
  code:      string;
  title:     string;
  teamName:  string;
  venue:     LiveVenue;
  status:    LiveSessionStatus;
  updatedAt: string;
  setsWon:   SidesScore;
  currentSet: {
    setNumber:  number;
    score:      SidesScore;
    serving:    LiveSide | null;
    trajectory: SidesScore[];
  } | null;
  sets:       { setNumber: number; score: SidesScore; wonBy: LiveSide | null }[];
  lastPoints: PublicLivePoint[];
  topScorers: { jersey: number; name: string | null; points: number }[];
};

type ApiEnvelope<T> = { data: T; message: string; status: number };

// Erreur portant le statut HTTP (404 expirée, 409 terminée…)
export class LiveApiError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }
}

// ─── Endpoints authentifiés ───────────────────────────────────────────────────

const unwrap = <T>(
  response: { data?: unknown; error?: unknown; response?: Response },
  message: string,
): T => {
  if (response.error !== undefined || response.data === undefined) {
    throw new LiveApiError(message, response.response?.status ?? null);
  }
  return (response.data as ApiEnvelope<T>).data;
};

export const createLiveSession = async (body: CreateLiveSessionRequest): Promise<LiveSession> => {
  const response = await client.post({
    url: '/api/v1/live-sessions',
    body,
    headers: { 'Content-Type': 'application/json' },
  });
  return unwrap<LiveSession>(response, 'Failed to create live session');
};

export const pushLiveSnapshot = async (
  sessionId: string,
  revision: number,
  payload: MatchLiveStatsPayload,
): Promise<SnapshotResult> => {
  const response = await client.put({
    url: '/api/v1/live-sessions/{sessionId}/snapshot',
    path: { sessionId },
    body: { revision, payload },
    headers: { 'Content-Type': 'application/json' },
  });
  return unwrap<SnapshotResult>(response, 'Failed to push live snapshot');
};

export const endLiveSession = async (sessionId: string): Promise<LiveSession> => {
  const response = await client.post({
    url: '/api/v1/live-sessions/{sessionId}:end',
    path: { sessionId },
  });
  return unwrap<LiveSession>(response, 'Failed to end live session');
};

export const setLiveShowPlayerNames = async (
  sessionId: string,
  showPlayerNames: boolean,
): Promise<LiveSession> => {
  const response = await client.patch({
    url: '/api/v1/live-sessions/{sessionId}',
    path: { sessionId },
    body: { showPlayerNames },
    headers: { 'Content-Type': 'application/json' },
  });
  return unwrap<LiveSession>(response, 'Failed to update live session');
};

// ─── Endpoint public (overlay) ────────────────────────────────────────────────

export type PublicLiveResult =
  | { kind: 'ok'; view: PublicLiveView; etag: string | null }
  | { kind: 'notModified' }
  | { kind: 'notFound' }
  | { kind: 'rateLimited'; retryAfterMs: number };

export const getPublicLiveView = async (
  code: string,
  etag: string | null,
  signal?: AbortSignal,
): Promise<PublicLiveResult> => {
  const headers: Record<string, string> = {};
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(`${API_URL}/api/v1/public/live/${encodeURIComponent(code)}`, {
    headers,
    signal,
    credentials: 'omit',
    cache: 'no-store',
  });

  if (res.status === 304) return { kind: 'notModified' };
  if (res.status === 404) return { kind: 'notFound' };
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After'));
    return { kind: 'rateLimited', retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 10_000 };
  }
  if (!res.ok) throw new LiveApiError('Failed to fetch live view', res.status);

  const body = await res.json() as ApiEnvelope<PublicLiveView>;
  return { kind: 'ok', view: body.data, etag: res.headers.get('ETag') };
};
