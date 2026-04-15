import Constants from 'expo-constants';
import { createEmptyStats } from './players';
import type { PlayerStats, ActionKey } from './players';
import type { MatchState, MatchHistoryEvent } from '../context/MatchContext';
import type { Team } from './teams';

const getApiUrl = (): string => {
  const configured: string | undefined = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  const hostUri: string | undefined = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080`;
  }

  return 'http://localhost:8080';
};

const API_URL = getApiUrl();

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

type PlayerSetStatDto = {
  set: number;
  stats: StatsDto;
};

type PlayerStatDto = {
  playerId: number;
  number: number;
  role: string;
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

    return {
      set:       setResult.setNum,
      myScore:   setResult.myScore,
      oppScore:  setResult.oppScore,
      teamStats: aggregateStats(perPlayerSetStats),
      timeline,
    };
  });

  // ── Joueurs ──
  const players: PlayerStatDto[] = matchPlayers.map(player => ({
    playerId:   player.id,
    number:     player.numero,
    role:       player.tacticalRole,
    matchStats: toStatsDto(player.stats),
    setStats:   setNums.map(sn => ({
      set:   sn,
      stats: toStatsDto(computePlayerSetStats(matchHistory, sn, player.id)),
    })),
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

export const sendMatchResult = async (payload: MatchStatRequest): Promise<void> => {
  const res = await fetch(`${API_URL}/api/v1/match-stats`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};