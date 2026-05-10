import { createEmptyStats } from './players';
import type { PlayerStats, ActionKey } from './players';
import type { MatchState, MatchHistoryEvent } from '../context/MatchContext';
import type { Team } from './teams';
import { API_URL, apiFetch } from './api';

// ─────────────────────────────────────────────
//  DTOs — mirror exact du backend Kotlin
// ─────────────────────────────────────────────

type StatsDto = {
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
};

type TimelineEntry = {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
};

type SetStatDto = {
  set: number;
  myScore: number;
  oppScore: number;
  teamStats: StatsDto;
  timeline: TimelineEntry[];
};

export type PlayerRole = 'R4' | 'Central' | 'Passeur' | 'Pointu' | 'Libero';

type PlayerSetStatDto = {
  set: number;
  position: string | null;
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
};

type PlayerStatDto = {
  playerId: number;
  number: number;
  role: PlayerRole;
  matchStats: StatsDto;
  setStats: PlayerSetStatDto[];
};

type MatchDto = {
  id: string;
  teamId: number;
  opponentId: number | null;
  seasonId: string | null;
  competitionId: number | null;
  date: string;        // LocalDate : "2026-04-07"
  result: 'won' | 'lost';
  mySets: number;
  oppSets: number;
  title: string | null;
  home: boolean | null;
};

type MetaDto = {
  clientGeneratedAt: string; // Instant ISO 8601
  appVersion: string;
};

type MatchStatRequest = {
  match: MatchDto;
  sets: SetStatDto[];
  players: PlayerStatDto[];
  teamMatchStats: StatsDto;
  meta: MetaDto;
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

const toStatsDto = (s: PlayerStats): StatsDto => ({
  points:        s.pt,
  attackPoints:  s.atk,
  blockPoints:   s.block,
  acePoints:     s.ace,
  attackErrors:  s.atk_out,
  serviceErrors: s.srv_out,
  receptions:    s.recv,
});

const aggregateStats = (statsArray: PlayerStats[]): StatsDto =>
  toStatsDto(
    statsArray.reduce(
      (acc, s) => {
        const key: ActionKey[] = ['pt', 'atk', 'block', 'ace', 'atk_out', 'srv_out', 'recv'];
        const next = { ...acc };
        for (const k of key) next[k] += s[k];
        return next;
      },
      createEmptyStats(),
    ),
  );

const computePlayerSetStats = (
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
  const { mySets, oppSets, matchHistory, setResults, matchPlayers, myScore, oppScore, setNum, setBannerVisible, setWinner } = matchState;

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
  const sets: SetStatDto[] = allSetResults.map(setResult => {
    const timeline: TimelineEntry[] = matchHistory
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

    const oppFaultsInSet = matchHistory.filter(
      e => e.setNum === setResult.setNum && e.source === 'opp_fault',
    ).length;

    const baseTeamStats = aggregateStats(perPlayerSetStats);

    return {
      set:      setResult.setNum,
      myScore:  setResult.myScore,
      oppScore: setResult.oppScore,
      teamStats: baseTeamStats,
      timeline,
    };
  });

  // ── Joueurs ──
  const players: PlayerStatDto[] = matchPlayers.map(player => ({
    playerId:   player.id,
    number:     player.numero,
    role:       player.tacticalRole as PlayerRole,
    matchStats: toStatsDto(player.stats),
    setStats:   setNums.map(sn => {
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
  }));

  return {
    match: {
      id:            String(Date.now()),
      teamId:        team.id,
      opponentId:    null,
      seasonId:      null,
      competitionId: null,
      date:          new Date().toISOString().split('T')[0], // "2026-04-07"
      result:        mySets >= oppSets ? 'won' : 'lost',
      mySets,
      oppSets,
      title:         matchState.matchName,
      home:          matchState.isHome,
    },
    sets,
    players,
    teamMatchStats: aggregateStats(matchPlayers.map(p => p.stats)),
    meta: {
      clientGeneratedAt: new Date().toISOString(),
      appVersion:        '1.0.0',
    },
  };
};

// ─────────────────────────────────────────────
//  ENVOI AU BACKEND
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  GET /api/v1/match-stats/{matchId} — types réponse
// ─────────────────────────────────────────────

export type MatchDetailStats = {
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
};

export type MatchDetailTimelineEntry = {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
  occurredAt: string;
};

export type MatchDetailSetStat = {
  set: number;
  myScore: number;
  oppScore: number;
  teamStats: MatchDetailStats;
  timeline: MatchDetailTimelineEntry[];
};

export type MatchDetailPlayerSetStat = {
  set: number;
  position?: string | null;
  points: number;
  attackPoints: number;
  blockPoints: number;
  acePoints: number;
  attackErrors: number;
  serviceErrors: number;
  receptions: number;
};

export type MatchDetailPlayerStat = {
  playerId: number;
  number: number;
  role: string;
  matchStats: MatchDetailStats;
  setStats: MatchDetailPlayerSetStat[];
};

export type MatchDetail = {
  id: string;
  teamId: number;
  date: string;
  result: string;
  mySets: number;
  oppSets: number;
  title?: string | null;
  home?: boolean | null;
  teamMatchStats: MatchDetailStats;
  sets: MatchDetailSetStat[];
  players: MatchDetailPlayerStat[];
};

export const getMatchDetail = async (matchId: string): Promise<MatchDetail> => {
  const res = await apiFetch(`${API_URL}/api/v1/match-stats/${matchId}`);
  if (!res.ok) {
    const body = await res.text();
    console.error('[matchApi] GET /match-stats/:id HTTP', res.status, body);
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json() as { data: MatchDetail };
  return json.data;
};

export type MatchSummary = {
  id: string;
  teamId: number;
  date: string;
  result: string;
  mySets: number;
  oppSets: number;
  title?: string | null;
  home?: boolean | null;
};

export const getTeamMatches = async (teamId: number): Promise<MatchSummary[]> => {
  const res = await apiFetch(`${API_URL}/api/v1/teams/${teamId}/matches`);
  if (!res.ok) {
    const body = await res.text();
    console.error('[matchApi] GET /teams/matches HTTP', res.status, body);
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json() as { data: MatchSummary[] };
  return json.data;
};

// ─────────────────────────────────────────────
//  GET /api/v1/players/{id}/season-stats
// ─────────────────────────────────────────────

export type PositionStats = {
  matchCount: number;
  setCount: number;
  stats: MatchDetailStats;
};

export type PlayerSeasonStats = {
  playerId: number;
  matchCount: number;
  setCount: number;
  totalStats: MatchDetailStats;
  statsByPosition: Record<string, PositionStats>;
};

export const getPlayerSeasonStats = async (
  playerId: number,
  teamId: number,
): Promise<PlayerSeasonStats> => {
  const res = await apiFetch(
    `${API_URL}/api/v1/players/${playerId}/season-stats?teamId=${teamId}`,
  );
  if (!res.ok) {
    const body = await res.text();
    console.error('[matchApi] GET /players/season-stats HTTP', res.status, body);
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json() as { data: PlayerSeasonStats };
  return json.data;
};

export const sendMatchResult = async (payload: MatchStatRequest): Promise<void> => {
  const res = await apiFetch(`${API_URL}/api/v1/match-stats`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[matchApi] POST /match-stats HTTP', res.status, body);
    throw new Error(`HTTP ${res.status}`);
  }
};