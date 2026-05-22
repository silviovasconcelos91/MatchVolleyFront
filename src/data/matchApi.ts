import { createEmptyStats } from './players';
import type { PlayerStats, ActionKey, PlayerRole } from './players';
import type { MatchState, MatchHistoryEvent } from '../context/MatchContext';
import type { Team } from './teams';
import {
  getMatchStat,
  getTeamMatches as sdkGetTeamMatches,
  getPlayerSeasonStats as sdkGetPlayerSeasonStats,
  saveMatchStat,
} from './openapi/sdk.gen';
import type { MatchStatRequest } from './openapi/types.gen';

// ─────────────────────────────────────────────
//  Re-exports — generated types aliased to old names
// ─────────────────────────────────────────────

export type { MatchDetailResponse as MatchDetail } from './openapi/types.gen';
export type { StatsDto as MatchDetailStats } from './openapi/types.gen';
export type { TimelineEntryDto as MatchDetailTimelineEntry } from './openapi/types.gen';
export type { SetStatDto as MatchDetailSetStat } from './openapi/types.gen';
export type { PlayerSetStatDto as MatchDetailPlayerSetStat } from './openapi/types.gen';
export type { PlayerStatDto as MatchDetailPlayerStat } from './openapi/types.gen';
export type { MatchDto as MatchSummary } from './openapi/types.gen';
export type { PlayerSeasonStatsResponse as PlayerSeasonStats } from './openapi/types.gen';
export type { PositionStatsDto as PositionStats } from './openapi/types.gen';

// ─────────────────────────────────────────────
//  Local internal DTOs — used only inside buildMatchResult
// ─────────────────────────────────────────────

type LocalStatsDto = {
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
  faults: number;
};

type LocalTimelineEntry = {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
};

type LocalSetStatDto = {
  set: number;
  myScore: number;
  oppScore: number;
  teamStats: LocalStatsDto;
  timeline: LocalTimelineEntry[];
};

type LocalPlayerSetStatDto = {
  set: number;
  position: string | null;
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
  faults: number;
};

type LocalPlayerStatDto = {
  playerId: number;
  number: number;
  role: PlayerRole;
  matchStats: LocalStatsDto;
  setStats: LocalPlayerSetStatDto[];
};

type LocalMatchDto = {
  id: string;
  teamId: number;
  opponentId?: number;
  seasonId?: string;
  competitionId?: number;
  date: string;
  result: 'won' | 'lost';
  mySets: number;
  oppSets: number;
  title: string | null;
  home?: boolean;
};

type LocalMetaDto = {
  clientGeneratedAt: string;
  appVersion: string;
};

type LocalMatchStatRequest = {
  match: LocalMatchDto;
  sets: LocalSetStatDto[];
  players: LocalPlayerStatDto[];
  teamMatchStats: LocalStatsDto;
  meta: LocalMetaDto;
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

const toStatsDto = (s: PlayerStats): LocalStatsDto => ({
  points:        s.pt,
  attackPoints:  s.atk,
  blockPoints:   s.block,
  acePoints:     s.ace,
  attackErrors:  s.atk_out,
  serviceErrors: s.srv_out,
  receptions:    s.recv,
  faults:        s.fault,
});

const aggregateStats = (statsArray: PlayerStats[]): LocalStatsDto =>
  toStatsDto(
    statsArray.reduce(
      (acc, s) => {
        const key: ActionKey[] = ['pt', 'atk', 'block', 'ace', 'atk_out', 'srv_out', 'recv', 'fault'];
        const next = { ...acc };
        for (const k of key) next[k] += s[k];
        return next;
      },
      createEmptyStats(),
    ),
  );

export const computePlayerSetStats = (
  events: MatchHistoryEvent[],
  setNum: number,
  playerId: number,
): PlayerStats => {
  const stats = createEmptyStats();
  for (const event of events) {
    if (
      event.setNum === setNum &&
      event.source === 'player' &&
      event.playerId === playerId &&
      event.actionKey
    ) {
      stats[event.actionKey] += 1;
    }
  }
  return stats;
};

// ─────────────────────────────────────────────
//  CONSTRUCTION DU PAYLOAD
// ─────────────────────────────────────────────

export const buildMatchResult = (matchState: MatchState, team: Team): MatchStatRequest => {
  const { mySets, oppSets, matchHistory, setResults, matchPlayers, myScore, oppScore, setNum, setBannerVisible, setWinner, playerSetPresence } = matchState;

  // Si la bannière est visible, le set vient de se terminer mais n'est pas encore
  // persisté dans setResults (CLOSE_SET_BANNER n'a pas encore été appelé).
  // On l'inclut avec son vrai vainqueur.
  const pendingFinishedSet = setBannerVisible
    ? [{ setNum, myScore, oppScore, winner: setWinner }]
    : [];

  // Set en cours s'il a eu de l'activité (et que la bannière n'est pas visible)
  const currentSetInProgress =
    !setBannerVisible &&
    (matchHistory.some(e => e.setNum === setNum) || myScore > 0 || oppScore > 0)
      ? [{ setNum, myScore, oppScore, winner: null as null }]
      : [];

  const allSetResults = [...setResults, ...pendingFinishedSet, ...currentSetInProgress];

  const setNums = allSetResults.map(s => s.setNum);

  // ── Sets ──
  const sets: LocalSetStatDto[] = allSetResults.map(setResult => {
    const timeline: LocalTimelineEntry[] = matchHistory
      .filter(e => e.setNum === setResult.setNum)
      .map(e => ({
        myScore:  e.scoreAfter.my,
        oppScore: e.scoreAfter.opp,
        playerId: e.playerId ?? null,
        action:   e.actionKey ?? e.source,
      }));

    const perPlayerSetStats = matchPlayers.map(p =>
      computePlayerSetStats(matchHistory, setResult.setNum, p.id),
    );

    const baseTeamStats = aggregateStats(perPlayerSetStats);

    return {
      set:      setResult.setNum,
      myScore:  setResult.myScore,
      oppScore: setResult.oppScore,
      teamStats: baseTeamStats,
      timeline,
    };
  });

  // ── Joueurs ── (uniquement ceux qui ont foulé le terrain au moins un set)
  const players: LocalPlayerStatDto[] = matchPlayers
    .filter(player => (playerSetPresence[player.id]?.length ?? 0) > 0)
    .map(player => {
      const playedSets = playerSetPresence[player.id] ?? [];
      return {
        playerId:   player.id,
        number:     player.numero,
        role:       player.tacticalRole as PlayerRole,
        matchStats: toStatsDto(player.stats),
        // setStats uniquement pour les sets où le joueur était sur le terrain
        setStats: setNums
          .filter(sn => playedSets.includes(sn))
          .map(sn => {
            const posEvent = matchHistory.find(
              e => e.setNum === sn && e.playerId === player.id && e.playerRole,
            );
            const position = posEvent?.playerRole ?? matchState.setRoles[sn]?.[player.id] ?? null;
            return {
              set:      sn,
              position,
              ...toStatsDto(computePlayerSetStats(matchHistory, sn, player.id)),
            };
          }),
      };
    });

  const payload: LocalMatchStatRequest = {
    match: {
      id:            String(Date.now()),
      teamId:        team.id,
      opponentId:    undefined,
      seasonId:      undefined,
      competitionId: undefined,
      date:          new Date().toISOString().split('T')[0], // "2026-04-07"
      result:        mySets >= oppSets ? 'won' : 'lost',
      mySets,
      oppSets,
      title:         matchState.matchName,
      home:          matchState.isHome ?? undefined,
    },
    sets,
    players,
    teamMatchStats: aggregateStats(matchPlayers.map(p => p.stats)),
    meta: {
      clientGeneratedAt: new Date().toISOString(),
      appVersion:        '1.0.0',
    },
  };

  // Cast to generated MatchStatRequest — fields are a superset (all optional in generated type)
  return payload as MatchStatRequest;
};

// ─────────────────────────────────────────────
//  Network wrappers — maintain old call signatures
// ─────────────────────────────────────────────

import type {
  MatchDetailResponse,
  MatchDto,
  PlayerSeasonStatsResponse,
} from './openapi/types.gen';

export const getMatchDetail = async (matchId: string): Promise<MatchDetailResponse> => {
  const { data, error } = await getMatchStat({ path: { matchId } });
  if (error !== undefined || data === undefined) {
    throw new Error('Failed to fetch match detail');
  }
  const result = data.data;
  if (result === undefined) {
    throw new Error('No data in match detail response');
  }
  return result;
};

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

export const sendMatchResult = async (payload: MatchStatRequest): Promise<void> => {
  const { error } = await saveMatchStat({ body: payload });
  if (error !== undefined) {
    throw new Error('Failed to send match result');
  }
};
