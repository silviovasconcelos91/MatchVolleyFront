import type { MatchState } from '../context/MatchContext';
import type { Team } from './teams';
import {
  getTeamMatches as sdkGetTeamMatches,
  getPlayerSeasonStats as sdkGetPlayerSeasonStats,
} from './openapi/sdk.gen';

// ─────────────────────────────────────────────
//  Re-exports — generated types aliased to old names
// ─────────────────────────────────────────────

export type { StatsDto as MatchDetailStats } from './openapi/types.gen';
export type { MatchDto as MatchSummary } from './openapi/types.gen';
export type { PlayerSeasonStatsResponse as PlayerSeasonStats } from './openapi/types.gen';
export type { PositionStatsDto as PositionStats } from './openapi/types.gen';

// ─────────────────────────────────────────────
//  Network wrappers — maintain old call signatures
// ─────────────────────────────────────────────

import type {
  MatchDto,
  PlayerSeasonStatsResponse,
} from './openapi/types.gen';
import { client } from './openapi/client.gen';
import type { MatchLiveStatsPayload } from './liveStatsPayload';
import { buildLiveStatsPayload } from './liveStatsPayload';
import type { LiveStatEvent } from './liveStats';
import type { LiveMatchAnalysis } from './liveStatsAnalysis';

export const getTeamMatches = async (teamId: number): Promise<MatchDto[]> => {
  const { data, error } = await sdkGetTeamMatches({ path: { id: teamId } });
  if (error !== undefined || data === undefined) {
    throw new Error('Failed to fetch team matches');
  }
  return data.data ?? [];
};

export const getPlayerSeasonStats = async (
  playerId: number,
  teamId: number,
): Promise<PlayerSeasonStatsResponse> => {
  const { data, error } = await sdkGetPlayerSeasonStats({ path: { id: playerId }, query: { teamId } });
  if (error !== undefined || data === undefined) {
    throw new Error('Failed to fetch player season stats');
  }
  const result = data.data;
  if (result === undefined) {
    throw new Error('No data in player season stats response');
  }
  return result;
};


// liveSessionId (optionnel) : le backend lie la session de diffusion au match et la passe en ENDED.
type LiveStatsSubmission = MatchLiveStatsPayload & { liveSessionId?: string };

export const sendLiveStats = async (
  matchId: string,
  payload: LiveStatsSubmission,
): Promise<void> => {
  const { error } = await client.post({
    url: '/api/v1/matches/{matchId}/live-stats',
    path: { matchId },
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });
  if (error !== undefined) throw new Error('Failed to send live stats');
};

export const getLiveMatchAnalysis = async (
  matchId: string,
): Promise<LiveMatchAnalysis> => {
  const response = await client.get({
    url: '/api/v1/matches/{matchId}/live-stats/analysis',
    path: { matchId },
  });

  if (response.response?.status === 404) {
    const err = new Error('No live stats for this match');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (response.error !== undefined || response.data === undefined) {
    throw new Error('Failed to fetch live match analysis');
  }

  const body = response.data as { data: LiveMatchAnalysis };
  return body.data;
};

// Sends the finished live-recorded match to the backend.
export const submitMatch = (
  matchState: MatchState,
  team: Team,
  liveSets: Record<number, LiveStatEvent[]>,
  liveSessionId?: string,
): Promise<void> => {
  const matchId = String(Date.now());
  const payload = buildLiveStatsPayload({
    matchId,
    teamId:   team.id,
    teamName: team.name,
    // matchName est obligatoire dans MatchSetupScreen ; null impossible ici en pratique.
    title:    matchState.matchName ?? '',
    venue:    matchState.isHome ? 'home' : 'away',
  }, liveSets);
  return sendLiveStats(matchId, liveSessionId ? { ...payload, liveSessionId } : payload);
};
