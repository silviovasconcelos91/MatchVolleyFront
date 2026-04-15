// ─────────────────────────────────────────────
//  THÈME GLOBAL DE L'APPLICATION
//  Toutes les couleurs, tailles et espacements
//  sont centralisés ici pour faciliter les
//  modifications visuelles sans toucher aux
//  composants.
// ─────────────────────────────────────────────

export const COLORS = {
  // ── Fond de l'application ──
  bgApp:        '#0d1b2a',   // fond principal (bleu très sombre)
  bgCard:       '#111f2e',   // fond des cartes et sections
  bgInput:      '#0d1b2a',   // fond des champs / boutons secondaires

  // ── Bordures ──
  border:       '#1e3a50',   // bordure standard
  borderLight:  '#2a4a60',   // bordure plus visible (hover, focus)

  // ── Textes ──
  textPrimary:  '#dde8f0',   // texte principal (blanc cassé)
  textSecondary:'#7aabb8',   // texte secondaire (bleu clair)
  textMuted:    '#4a7a9b',   // texte discret (labels, hints)
  textDark:     '#2a4a60',   // texte très discret / désactivé

  // ── Couleurs d'action ──
  green:        '#00b06a',   // succès, points gagnés
  greenLight:   '#00d47a',   // variante plus claire du vert
  red:          '#ff3b30',   // erreur, fautes
  redLight:     '#ff6b6b',   // variante plus claire du rouge
  yellow:       '#ffd166',   // roster, sélection
  blue:         '#3d9eff',   // information, terrain
  pink:         '#ff5c8a',   // points adversaires sur le graphe

  // ── Score ──
  scoreHome:    '#ffffff',   // score de mon équipe
  scoreAway:    '#4a7a9b',   // score adversaire

  // ── Blanc pur pour le fond du point actif graphe ──
  dot:          '#0d1b2a',
};

// Palette de couleurs pour distinguer les joueurs
// Chaque joueur reçoit une couleur unique basée sur son index
export const PLAYER_COLORS: string[] = [
  '#00b06a', // vert
  '#3d9eff', // bleu
  '#ff8c42', // orange
  '#e040fb', // violet
  '#ff5c8a', // rose
  '#ffd166', // jaune
  '#00d4d4', // cyan
  '#ff9f43', // orange clair
  '#a29bfe', // lavande
  '#26de81', // vert clair
  '#fd9644', // pêche
  '#45aaf2', // bleu ciel
  '#fc5c65', // rouge clair
  '#a55eea', // mauve
  '#2bcbba', // turquoise
];

// Retourne la couleur d'un joueur en fonction de son id
export const getPlayerColor = (id: number): string =>
  PLAYER_COLORS[(id - 1) % PLAYER_COLORS.length];

// ── Espacements ──
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
};

// ── Rayons de bordure ──
export const RADIUS = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999, // cercle parfait
};

// ── Tailles de police ──
export const FONT_SIZE = {
  xs:   9,
  sm:   10,
  md:   12,
  lg:   13,
  xl:   15,
  xxl:  18,
  score:50,  // taille du score affiché
};