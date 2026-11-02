// ─────────────────────────────────────────────
//  LIVE STATS — modèle de saisie temps réel
//  Écran de test : saisie des actions joueur par
//  joueur, mon équipe + adversaire, avec zone
//  d'arrivée (1-6) pour les attaques / services.
//  Volontairement indépendant de MatchContext.
// ─────────────────────────────────────────────

import { PLAYER_ROLES } from './players';
import type { PlayerRole } from './players';

// Normalise un rôle tactique libre ('' ou inconnu → null) vers les valeurs
// exactes acceptées par le backend (toute autre valeur → HTTP 400).
export const toPoste = (role: string): PlayerRole | null =>
  PLAYER_ROLES.find(r => r === role) ?? null;

// mine = mon équipe / opp = adversaire
export type LiveTeam = 'mine' | 'opp';

export type LiveActionCategory = 'point' | 'fault' | 'neutral';

export type LiveActionKey =
  // Points remportés
  | 'attack_pt'
  | 'ace'
  | 'block_pt'
  | 'relance_pt'
  // Fautes (point pour l'autre équipe)
  | 'attack_fault'
  | 'serve_fault'
  | 'recv_fault'
  | 'fault'
  // Sans incidence sur le score
  | 'good_recv'
  | 'bad_recv'
  | 'block_touch'
  | 'serve_in'
  | 'attack_no_pt';

export type LiveActionDef = {
  key: LiveActionKey;
  label: string;
  category: LiveActionCategory;
  // true → demande la zone d'arrivée (1-6) : balle qui retombe dans le camp adverse
  needsZone: boolean;
  // true → demande aussi la zone de départ (trajectoire d'attaque)
  needsStartZone?: boolean;
};

// Catalogue ordonné par catégorie (sert au rendu groupé de l'écran).
export const LIVE_ACTIONS: LiveActionDef[] = [
  // ── Points ──
  { key: 'attack_pt',   label: 'Attaque',          category: 'point',   needsZone: true,  needsStartZone: true },
  { key: 'ace',         label: 'Ace',              category: 'point',   needsZone: true  },
  { key: 'block_pt',    label: 'Contre',           category: 'point',   needsZone: false },
  { key: 'relance_pt',  label: 'Relance',          category: 'point',   needsZone: true  },
  // ── Fautes ──
  { key: 'attack_fault',  label: 'Attaque',    category: 'fault',   needsZone: false },
  { key: 'serve_fault',   label: 'Service',    category: 'fault',   needsZone: false },
  { key: 'recv_fault',  label: 'Réception',        category: 'fault',   needsZone: false },
  { key: 'fault', label: 'Faute',            category: 'fault',   needsZone: false },
  // ── Neutres ──
  { key: 'good_recv',   label: 'Bonne réception',  category: 'neutral', needsZone: false },
  { key: 'bad_recv',    label: 'Mauvaise récept.', category: 'neutral', needsZone: false },
  { key: 'block_touch', label: 'Contre touché',    category: 'neutral', needsZone: false },
  { key: 'serve_in',    label: 'Service réussi',   category: 'neutral', needsZone: true  },
  { key: 'attack_no_pt',label: 'Attaque (sans pt)',category: 'neutral', needsZone: true,  needsStartZone: true },
];

export const LIVE_ACTION_BY_KEY: Record<LiveActionKey, LiveActionDef> =
  LIVE_ACTIONS.reduce((acc, def) => {
    acc[def.key] = def;
    return acc;
  }, {} as Record<LiveActionKey, LiveActionDef>);

// Zones disposées en grille volley : avant 4-3-2, arrière 5-6-1.
export const LIVE_ZONE_DISPLAY_ORDER: number[] = [4, 3, 2, 5, 6, 1];

// Un événement saisi. Pour l'adversaire, playerId = numéro de maillot.
export type LiveStatEvent = {
  id: string;
  setNumber: number;      // numéro du set (1-5)
  team: LiveTeam;
  playerId: number;       // id joueur (mine) ou numéro maillot (opp)
  jersey: number;         // numéro affiché
  playerName: string;     // nom (mine) ou "Adv #N" (opp)
  actionKey: LiveActionKey;
  zone: number | null;       // zone d'arrivée 1-6 ou null
  zoneStart: number | null;  // zone de départ 1-6 ou null (attaques)
  playerPos: number | null;  // position (1-6) du joueur au moment de l'action
  poste: PlayerRole | null;  // poste tactique du joueur pendant le set (null pour l'adversaire)
  ts: number;
};

// Numéros de maillot proposés côté adversaire.
export const OPP_JERSEYS: number[] = Array.from({ length: 15 }, (_, i) => i + 1);

// Combien de points/fautes rapporte une action, du point de vue de l'équipe qui la réalise.
export const isPointFor = (def: LiveActionDef): boolean => def.category === 'point';
export const isFaultFor = (def: LiveActionDef): boolean => def.category === 'fault';

// Équipe qui marque le point suite à l'action (null si action neutre).
export const scoredFor = (team: LiveTeam, def: LiveActionDef): LiveTeam | null => {
  if (isPointFor(def)) return team;
  if (isFaultFor(def)) return team === 'mine' ? 'opp' : 'mine';
  return null;
};

// Score d'une liste d'événements (un set ou le match entier).
export const scoreForEvents = (events: LiveStatEvent[]): Record<LiveTeam, number> => {
  const score: Record<LiveTeam, number> = { mine: 0, opp: 0 };
  for (const e of events) {
    const winner = scoredFor(e.team, LIVE_ACTION_BY_KEY[e.actionKey]);
    if (winner) score[winner]++;
  }
  return score;
};

// Tous les événements de tous les sets, à plat.
export const flattenSets = (sets: Record<number, LiveStatEvent[]>): LiveStatEvent[] =>
  Object.values(sets).flat();

// Disposition des zones sur le terrain (lignes affichées de haut en bas).
export const MINE_ROWS = [[4, 3, 2], [5, 6, 1]] as const; // avant (près filet) en haut, arrière en bas
export const OPP_ROWS  = [[1, 6, 5], [2, 3, 4]] as const; // arrière en haut, avant (près filet) en bas