import type { LiveStatEvent, LiveTeam } from './liveStats';
import type { PlayerRole } from './players';
import { LIVE_ACTION_BY_KEY, scoredFor, isTimeout } from './liveStats';

// ─── Types payload backend ────────────────────────────────────────────────────

export type EventResultScored = 'mine' | 'opp' | null;

export type EventTrajectory = {
  from: number | null;  // null pour ace / service (zone départ non saisie)
  to:   number;
};

export type EventPlayerPayload = {
  id:       number | null;  // id interne (mine) ou null (opp)
  jersey:   number;
  name:     string;
  position: number | null;  // zone terrain 1-6 au moment de l'action
  poste:    PlayerRole | null;  // poste tactique pendant le set (null pour l'adversaire)
};

export type EventActionPayload = {
  key:      string;
  label:    string;
  category: 'point' | 'fault' | 'neutral';
};

export type LiveStatEventPayload = {
  id:         string;
  sequence:   number;
  ts:         number;
  team:       LiveTeam;              // pour un temps mort : l'équipe qui l'a demandé
  player:     EventPlayerPayload | null;  // null uniquement pour un temps mort
  action:     EventActionPayload;
  trajectory: EventTrajectory | null;
  scoredFor:  EventResultScored;
};

export type SetPayload = {
  setNumber: number;
  scoreTeam: number;          // points marqués par "mine" dans ce set
  scoreOpp:  number;          // points marqués par "opp" dans ce set
  wonBy:     'mine' | 'opp' | null;  // null si set encore en cours ou égalité
  events:    LiveStatEventPayload[];
};

export type MatchLiveStatsPayload = {
  matchId:    string;
  teamId:     number;
  teamName:   string;
  title:      string;          // nom du match saisi en début de match
  venue:      'home' | 'away';
  recordedAt: string;          // ISO 8601
  setsWon:    { mine: number; opp: number };
  sets:       SetPayload[];
};

// ─── Sérialisation ────────────────────────────────────────────────────────────

function serializeEvent(e: LiveStatEvent, sequence: number): LiveStatEventPayload {
  const def = LIVE_ACTION_BY_KEY[e.actionKey];
  return {
    id:       e.id,
    sequence,
    ts:       e.ts,
    team:     e.team,
    player: isTimeout(e) ? null : {
      id:       e.team === 'mine' ? e.playerId : null,
      jersey:   e.jersey,
      name:     e.playerName,
      position: e.playerPos,
      poste:    e.team === 'mine' ? e.poste : null,
    },
    action: {
      key:      e.actionKey,
      label:    def.label,
      category: def.category,
    },
    trajectory: e.zone !== null
      ? { from: e.zoneStart, to: e.zone }
      : null,
    scoredFor: scoredFor(e.team, def),
  };
}

// Métadonnées du match fournies par l'appelant (le reste est dérivé des événements).
export type LiveStatsMatchMeta = Pick<MatchLiveStatsPayload, 'matchId' | 'teamId' | 'teamName' | 'title' | 'venue'>;

type BuildOptions = {
  // Set encore en cours (diffusion live) : toujours inclus, même vide, avec wonBy = null
  // pour que le backend ne le compte pas dans setsWon.
  ongoingSet?: number | null;
};

export function buildLiveStatsPayload(
  meta: LiveStatsMatchMeta,
  sets: Record<number, LiveStatEvent[]>,
  options: BuildOptions = {},
): MatchLiveStatsPayload {
  const ongoingSet = options.ongoingSet ?? null;
  let setsWonMine = 0, setsWonOpp = 0;

  const setsPayload: SetPayload[] = Object.entries(sets)
    .map(([key, events]) => [Number(key), events] as [number, LiveStatEvent[]])
    .filter(([setNumber, events]) => events.length > 0 || setNumber === ongoingSet)
    .sort(([a], [b]) => a - b)
    .map(([setNumber, events]) => {
      let mine = 0, opp = 0;
      const serialized: LiveStatEventPayload[] = events.map((e, i) => {
        const s = serializeEvent(e, i + 1);
        if (s.scoredFor === 'mine') mine++;
        else if (s.scoredFor === 'opp') opp++;
        return s;
      });
      const wonBy: 'mine' | 'opp' | null =
        setNumber === ongoingSet ? null
        : mine > opp ? 'mine' : opp > mine ? 'opp' : null;
      if (wonBy === 'mine') setsWonMine++;
      else if (wonBy === 'opp') setsWonOpp++;
      return { setNumber, scoreTeam: mine, scoreOpp: opp, wonBy, events: serialized };
    });

  return {
    ...meta,
    recordedAt: new Date().toISOString(),
    setsWon: { mine: setsWonMine, opp: setsWonOpp },
    sets: setsPayload,
  };
}
