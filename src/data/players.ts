// ─────────────────────────────────────────────
//  DONNÉES JOUEURS (simulées depuis une API)
//
//  En production, remplacer fetchPlayers() par
//  un vrai appel HTTP :
//    const res = await fetch('https://mon-api.com/players');
//    return await res.json();
//
//  La structure de chaque joueur doit respecter
//  l'interface ci-dessous pour que l'app fonctionne.
// ─────────────────────────────────────────────

// Simule un délai réseau de 500ms pour reproduire
// un vrai appel API (à supprimer en production)
const FAKE_DELAY_MS = 500;

// ── Type joueur ──
export type Player = {
  id: number;
  name: string;
  numero: number;
  age: number;
  taille: string;
}

// ── Clés des actions joueur ──
export type ActionKey = 'pt' | 'atk' | 'block' | 'ace' | 'atk_out' | 'srv_out' | 'recv';

// ── Stats d'un joueur (une valeur par type d'action) ──
export type PlayerStats = Record<ActionKey, number>;

// ── Liste complète des joueuses disponibles ──
// Interface attendue :
//   id     : number  – identifiant unique
//   name   : string  – nom complet
//   numero : number  – numéro de maillot
//   age    : number  – âge
//   taille : string  – taille (ex: "1m80")
const PLAYERS_DATA: Player[] = [
  { id: 1,  name: 'Léa Martin',    numero: 1,  age: 24, taille: '1m68' },
  { id: 2,  name: 'Sophie Dubois', numero: 7,  age: 26, taille: '1m72' },
  { id: 3,  name: 'Marie Leroy',   numero: 11, age: 22, taille: '1m80' },
  { id: 4,  name: 'Julie Bernard', numero: 4,  age: 25, taille: '1m84' },
  { id: 5,  name: 'Camille Petit', numero: 9,  age: 23, taille: '1m76' },
  { id: 6,  name: 'Emma Robert',   numero: 14, age: 21, taille: '1m79' },
  { id: 7,  name: 'Clara Moreau',  numero: 3,  age: 27, taille: '1m78' },
  { id: 8,  name: 'Jade Fontaine', numero: 6,  age: 24, taille: '1m85' },
  { id: 9,  name: 'Lucie Perrin',  numero: 2,  age: 22, taille: '1m65' },
  { id: 10, name: 'Anaïs Girard',  numero: 5,  age: 28, taille: '1m70' },
  { id: 11, name: 'Chloé Simon',   numero: 13, age: 20, taille: '1m77' },
  { id: 12, name: 'Nina Dupont',   numero: 8,  age: 23, taille: '1m83' },
  { id: 13, name: 'Laura Blanc',   numero: 10, age: 25, taille: '1m75' },
  { id: 14, name: 'Sarah Morel',   numero: 12, age: 22, taille: '1m71' },
  { id: 15, name: 'Inès Laurent',  numero: 16, age: 19, taille: '1m81' },
];

// Fonction principale d'accès aux données
// Retourne une Promise pour rester compatible avec un vrai appel API futur
export const fetchPlayers = (): Promise<Player[]> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(PLAYERS_DATA), FAKE_DELAY_MS);
  });

// ── Positions de départ sur le terrain ──
// Les 6 titulaires sont placés dans cet ordre de postes : [6, 1, 4, 3, 2, 5]
// Poste 1 = zone service (arrière droit)
// Poste 2 = avant droit
// Poste 3 = avant centre
// Poste 4 = avant gauche
// Poste 5 = arrière gauche
// Poste 6 = arrière centre
export const INITIAL_POSITIONS: number[] = [6, 1, 4, 3, 2, 5];

// Ordre d'affichage des postes sur le terrain (grille 3×2)
// Rangée du haut (proche du filet) : postes 4, 3, 2
// Rangée du bas (service)          : postes 5, 6, 1
export const COURT_DISPLAY_ORDER: number[] = [4, 3, 2, 5, 6, 1];

// Génère les stats initiales vides pour un joueur entrant en match
export const createEmptyStats = (): PlayerStats => ({
  pt:      0,   // points marqués (action générique)
  atk:     0,   // attaques réussies
  block:   0,   // contres réussis
  ace:     0,   // services ace
  atk_out: 0,   // attaques hors limites
  srv_out: 0,   // services hors limites
  recv:    0,   // réceptions ratées
});

// Calcule le total de points positifs d'un joueur
export const getTotalPoints = (stats: PlayerStats): number =>
  stats.pt + stats.atk + stats.block + stats.ace;

// Calcule le total de fautes d'un joueur
export const getTotalFaults = (stats: PlayerStats): number =>
  stats.atk_out + stats.srv_out + stats.recv;