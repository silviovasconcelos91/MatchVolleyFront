// Board entraîneur : types partagés.
//
// Repère « terrain » indépendant de l'écran (survit à la rotation portrait ↔ paysage) :
//   u : largeur du terrain en mètres, 0 → 9 (zone 4 côté u = 0 vue de mon fond de court)
//   v : distance au filet en mètres, positive dans mon camp (0 → 9), négative chez l'adversaire.

export type CourtPoint = { u: number; v: number };

export type BoardTool = 'move' | 'pen' | 'arrow' | 'eraser';

export type StrokeKind = 'pen' | 'arrow';

export type Stroke = {
  id: number;
  kind: StrokeKind;
  color: string;
  width: number;
  points: CourtPoint[]; // flèche : [départ, arrivée]
};

// Contenu annulable du board : positions des pions + dessins.
// Un joueur de mon équipe absent de `positions` est sur le banc.
export type BoardContent = {
  positions: Record<number, CourtPoint>;
  strokes: Stroke[];
};

export type BoardToken = {
  id: number;          // id joueur (mon équipe) ; négatif pour les adversaires
  team: 'mine' | 'opp';
  label: string;       // numéro affiché dans le pion
  name: string;        // prénom affiché sous le pion ; '' pour les adversaires
  color: string;
};

export type Orientation = 'portrait' | 'landscape';
