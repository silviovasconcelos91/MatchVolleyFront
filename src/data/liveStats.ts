// ─────────────────────────────────────────────
//  LIVE STATS — modèle de saisie temps réel
//  Écran de test : saisie des actions joueur par
//  joueur, mon équipe + adversaire, avec zone
//  d'arrivée (1-6) pour les attaques / services.
//  Volontairement indépendant de MatchContext.
// ─────────────────────────────────────────────

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
  | 'attack_out'
  | 'attack_net'
  | 'serve_net'
  | 'serve_out'
  | 'recv_shank'
  | 'bad_defense'
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
};

// Catalogue ordonné par catégorie (sert au rendu groupé de l'écran).
export const LIVE_ACTIONS: LiveActionDef[] = [
  // ── Points ──
  { key: 'attack_pt',   label: 'Attaque',          category: 'point',   needsZone: true  },
  { key: 'ace',         label: 'Ace',              category: 'point',   needsZone: true  },
  { key: 'block_pt',    label: 'Contre',           category: 'point',   needsZone: false },
  { key: 'relance_pt',  label: 'Relance',          category: 'point',   needsZone: true  },
  // ── Fautes ──
  { key: 'attack_out',  label: 'Attaque out',      category: 'fault',   needsZone: false },
  { key: 'attack_net',  label: 'Attaque filet',    category: 'fault',   needsZone: false },
  { key: 'serve_net',   label: 'Service filet',    category: 'fault',   needsZone: false },
  { key: 'serve_out',   label: 'Service out',      category: 'fault',   needsZone: false },
  { key: 'recv_shank',  label: 'Réception zippée', category: 'fault',   needsZone: false },
  { key: 'bad_defense', label: 'Mauvaise défense', category: 'fault',   needsZone: false },
  // ── Neutres ──
  { key: 'good_recv',   label: 'Bonne réception',  category: 'neutral', needsZone: false },
  { key: 'bad_recv',    label: 'Mauvaise récept.', category: 'neutral', needsZone: false },
  { key: 'block_touch', label: 'Contre touché',    category: 'neutral', needsZone: false },
  { key: 'serve_in',    label: 'Service réussi',   category: 'neutral', needsZone: true  },
  { key: 'attack_no_pt',label: 'Attaque (sans pt)',category: 'neutral', needsZone: true  },
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
  team: LiveTeam;
  playerId: number;       // id joueur (mine) ou numéro maillot (opp)
  jersey: number;         // numéro affiché
  playerName: string;     // nom (mine) ou "Adv #N" (opp)
  actionKey: LiveActionKey;
  zone: number | null;    // 1-6 ou null
  ts: number;
};

// Numéros de maillot proposés côté adversaire.
export const OPP_JERSEYS: number[] = Array.from({ length: 15 }, (_, i) => i + 1);

// Combien de points/fautes rapporte une action, du point de vue de l'équipe qui la réalise.
export const isPointFor = (def: LiveActionDef): boolean => def.category === 'point';
export const isFaultFor = (def: LiveActionDef): boolean => def.category === 'fault';