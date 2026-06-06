export type ActionCount = {
  key: string;
  label: string;
  count: number;
};

export type ActionStats = {
  points: ActionCount[];
  faults: ActionCount[];
  neutral: ActionCount[];
};

export type AceZone = {
  zone: number;
  count: number;
};

export type AttackZone = {
  playerPosition: number | null;
  from: number | null;
  to: number | null;
  result: 'attack_pt' | 'attack_no_pt' | 'attack_fault';
  count: number;
};

export type ScopeStats = {
  actions: ActionStats;
  acesByZone: AceZone[];
  attacks: AttackZone[];
};

export type TimelineEntry = {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
  occurredAt: string;
};

export type SetAnalysis = {
  setNumber: number;
  myScore: number;
  oppScore: number;
  wonBy: 'mine' | 'opp' | null;
  stats: ScopeStats;
  timeline: TimelineEntry[];
};

export type PlayerSetStats = {
  setNumber: number;
  stats: ScopeStats;
};

export type PlayerAnalysis = {
  playerId: number;
  jersey: number;
  name: string;
  matchStats: ScopeStats;
  setStats: PlayerSetStats[];
};

export type LiveMatchAnalysis = {
  matchId: string;
  globalStats: ScopeStats;
  sets: SetAnalysis[];
  players: PlayerAnalysis[];
};