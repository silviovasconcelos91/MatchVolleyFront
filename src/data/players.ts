const FAKE_DELAY_MS = 500;

export type PlayerRole = 'R4' | 'Central' | 'Passeur' | 'Pointu' | 'Libero';

export const PLAYER_ROLES: PlayerRole[] = ['R4', 'Central', 'Passeur', 'Pointu', 'Libero'];

export type Player = {
  id: number;
  name: string;
  numero: number;
  age: number;
  taille: string;
  roles?: PlayerRole[];
}

export type ActionKey = 'pt' | 'atk' | 'block' | 'ace' | 'atk_out' | 'srv_out' | 'recv' | 'fault';

export type PlayerStats = Record<ActionKey, number>;

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

export const fetchPlayers = (): Promise<Player[]> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(PLAYERS_DATA), FAKE_DELAY_MS);
  });

// Poste 1 = arrière droit (service), 2 = avant droit, 3 = avant centre,
// 4 = avant gauche, 5 = arrière gauche, 6 = arrière centre
export const INITIAL_POSITIONS: number[] = [6, 1, 4, 3, 2, 5];
export const COURT_DISPLAY_ORDER: number[] = [4, 3, 2, 5, 6, 1];
export const BACK_ROW_POSITIONS = new Set([1, 5, 6]);

export const createEmptyStats = (): PlayerStats => ({
  pt: 0, atk: 0, block: 0, ace: 0, atk_out: 0, srv_out: 0, recv: 0, fault: 0,
});

export const getTotalPoints = (stats: PlayerStats): number =>
  stats.pt + stats.atk + stats.block + stats.ace;

export const getTotalFaults = (stats: PlayerStats): number =>
  stats.atk_out + stats.srv_out + stats.recv + stats.fault;
