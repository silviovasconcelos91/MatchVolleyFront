// Board entraîneur : conversion repère terrain (mètres) ↔ écran (px) et tests de contact.
// Portrait : filet en haut, mon camp en bas (vu depuis mon fond de court).
// Paysage  : mon camp à gauche, filet vertical au centre, adversaire à droite.

import type { CourtPoint, Orientation } from './CoachBoardScreen.types';

export type Rect = { x: number; y: number; w: number; h: number };

// Portion du terrain affichée, en mètres.
export type CourtWindow = { uMin: number; uMax: number; vMin: number; vMax: number };

// Mon demi-terrain + une bande adverse et la zone de service.
export const WINDOW_HALF: CourtWindow = { uMin: -1, uMax: 10, vMin: -2.5, vMax: 12 };
// Terrain complet (adversaires visibles).
export const WINDOW_FULL: CourtWindow = { uMin: -1, uMax: 10, vMin: -11.5, vMax: 11.5 };

export type Viewport = {
  orientation: Orientation;
  win: CourtWindow;
  scale: number; // px par mètre
  ox: number;    // origine du terrain dessiné dans la scène
  oy: number;
};

export const makeViewport = (rect: Rect, orientation: Orientation, win: CourtWindow): Viewport => {
  const uRange = win.uMax - win.uMin;
  const vRange = win.vMax - win.vMin;
  const [spanW, spanH] = orientation === 'portrait' ? [uRange, vRange] : [vRange, uRange];
  const scale = Math.max(0, Math.min(rect.w / spanW, rect.h / spanH));
  return {
    orientation,
    win,
    scale,
    ox: rect.x + (rect.w - spanW * scale) / 2,
    oy: rect.y + (rect.h - spanH * scale) / 2,
  };
};

export const toScreen = (vp: Viewport, p: CourtPoint): { x: number; y: number } => {
  const { win, scale, ox, oy } = vp;
  if (vp.orientation === 'portrait') {
    return { x: ox + (p.u - win.uMin) * scale, y: oy + (p.v - win.vMin) * scale };
  }
  return { x: ox + (win.vMax - p.v) * scale, y: oy + (p.u - win.uMin) * scale };
};

export const toCourt = (vp: Viewport, x: number, y: number): CourtPoint => {
  const { win, scale, ox, oy } = vp;
  if (scale === 0) return { u: 0, v: 0 };
  if (vp.orientation === 'portrait') {
    return { u: win.uMin + (x - ox) / scale, v: win.vMin + (y - oy) / scale };
  }
  return { u: win.uMin + (y - oy) / scale, v: win.vMax - (x - ox) / scale };
};

// Garde un pion dans la portion visible du terrain.
export const clampToWindow = (p: CourtPoint, win: CourtWindow, margin: number): CourtPoint => ({
  u: Math.min(win.uMax - margin, Math.max(win.uMin + margin, p.u)),
  v: Math.min(win.vMax - margin, Math.max(win.vMin + margin, p.v)),
});

export const inRect = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Position type de chaque zone dans mon camp.
const MINE_ZONE_POINTS: Record<number, CourtPoint> = {
  4: { u: 1.5, v: 2 },
  3: { u: 4.5, v: 2 },
  2: { u: 7.5, v: 2 },
  5: { u: 1.5, v: 6.75 },
  6: { u: 4.5, v: 6.75 },
  1: { u: 7.5, v: 6.75 },
};

export const zonePoint = (team: 'mine' | 'opp', zone: number): CourtPoint | null => {
  const p = MINE_ZONE_POINTS[zone];
  if (!p) return null;
  // Camp adverse = symétrie centrale (leur zone 4 est face à ma zone 2).
  return team === 'mine' ? p : { u: 9 - p.u, v: -p.v };
};

// Distance d'un point à un segment, en px.
export const distToSegment = (
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
};
