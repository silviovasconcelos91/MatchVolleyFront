const FAKE_DELAY_MS = 500;

export type PlayerRole = 'R4' | 'Central' | 'Passeur' | 'Pointu' | 'Libero';

export const PLAYER_ROLES: PlayerRole[] = ['R4', 'Central', 'Passeur', 'Pointu', 'Libero'];

export type Player = {
  id: number;
  name: string;
  numero: number;
  roles?: PlayerRole[];
}

export type ActionKey = 'pt' | 'atk' | 'block' | 'ace' | 'atk_out' | 'srv_out' | 'recv' | 'fault';

export type PlayerStats = Record<ActionKey, number>;

const PLAYERS_DATA: Player[] = [
  { id: 1,  name: 'Léa Martin',    numero: 1  },
  { id: 2,  name: 'Sophie Dubois', numero: 7  },
  { id: 3,  name: 'Marie Leroy',   numero: 11 },
  { id: 4,  name: 'Julie Bernard', numero: 4  },
  { id: 5,  name: 'Camille Petit', numero: 9  },
  { id: 6,  name: 'Emma Robert',   numero: 14 },
  { id: 7,  name: 'Clara Moreau',  numero: 3  },
  { id: 8,  name: 'Jade Fontaine', numero: 6  },
  { id: 9,  name: 'Lucie Perrin',  numero: 2  },
  { id: 10, name: 'Anaïs Girard',  numero: 5  },
  { id: 11, name: 'Chloé Simon',   numero: 13 },
  { id: 12, name: 'Nina Dupont',   numero: 8  },
  { id: 13, name: 'Laura Blanc',   numero: 10 },
  { id: 14, name: 'Sarah Morel',   numero: 12 },
  { id: 15, name: 'Inès Laurent',  numero: 16 },
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
