// Formats de match : 6x6 (volley classique) et 4x4 (placement fixe, sans rotation ni libéro).

export type MatchFormat = '6x6' | '4x4';

export type FieldRole = 'R4' | 'Central' | 'Passeur' | 'Pointu';

export type FormatConfig = {
  label: string;
  courtSize: number;                              // joueurs terrain
  slots: number[];                                // zones utilisées, ordre de remplissage initial
  slotRoles: Partial<Record<number, FieldRole>>;  // zone → poste fixe ({} = postes libres)
  gridRows: (number | null)[][];                  // grille de placement haut → bas, null = case vide
  oppFillOrder: number[];                         // zones adverses remplies par les maillots 1..n
  rotation: boolean;
  libero: boolean;
};

export const FORMAT_CONFIG: Record<MatchFormat, FormatConfig> = {
  '6x6': {
    label:        '6 x 6',
    courtSize:    6,
    slots:        [6, 1, 4, 3, 2, 5],
    slotRoles:    {},
    gridRows:     [[4, 3, 2], [5, 6, 1]],
    oppFillOrder: [4, 3, 2, 5, 6, 1],
    rotation:     true,
    libero:       true,
  },
  '4x4': {
    label:        '4 x 4',
    courtSize:    4,
    slots:        [4, 3, 2, 6],
    slotRoles:    { 4: 'R4', 3: 'Central', 2: 'Pointu', 6: 'Passeur' },
    gridRows:     [[4, 3, 2], [null, 6, null]],
    oppFillOrder: [4, 3, 2, 6],
    rotation:     false,
    libero:       false,
  },
};

export const MATCH_FORMATS: MatchFormat[] = ['6x6', '4x4'];
