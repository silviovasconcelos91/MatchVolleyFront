// Board entraîneur : scène interactive (terrain + pions + dessins).
// Un seul PanResponder couvre toute la scène ; tous les enfants sont en
// pointerEvents="none" et les contacts sont résolus par calcul géométrique.

import React, { useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Rect as SvgRect, Line, Circle, Path, Polygon, G, ClipPath, Defs, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import {
  WINDOW_FULL, WINDOW_HALF, makeViewport, toScreen, toCourt, clampToWindow, distToSegment,
} from './boardGeometry';
import type { Rect, Viewport } from './boardGeometry';
import type { BoardContent, BoardToken, BoardTool, CourtPoint, Orientation, Stroke } from './CoachBoardScreen.types';
import { stageStyles as styles } from './CoachBoardScreen.styles';

type Props = {
  content: BoardContent;
  tokens: BoardToken[];
  showOpp: boolean;
  orientation: Orientation;
  tool: BoardTool;
  color: string;
  strokeWidth: number;
  onChange: (next: BoardContent) => void;
};

type Gesture =
  | { kind: 'drag'; tokenId: number; x: number; y: number }
  | { kind: 'draw'; stroke: Omit<Stroke, 'id'> }
  | { kind: 'erase'; ids: number[] };

type Placed = { token: BoardToken; x: number; y: number };

const MIN_PEN_STEP_PX = 3;
const MIN_ARROW_PX = 12;
const ERASE_TOLERANCE_PX = 14;

const tokenRadius = (scale: number): number => Math.min(24, Math.max(14, scale * 0.75));

// ── Pion (mémoïsé : rendu à chaque mouvement de doigt) ──
type TokenProps = { token: BoardToken; x: number; y: number; r: number; lifted?: boolean; ghost?: boolean };

const TokenView = React.memo(({ token, x, y, r, lifted = false, ghost = false }: TokenProps) => {
  const isOpp = token.team === 'opp';
  const size = r * 2;
  const boxW = Math.max(size, 76); // laisse la place au nom sous le pion
  return (
    <View style={[styles.token, { left: x - boxW / 2, top: y - r, width: boxW }, ghost && styles.tokenGhost]}>
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: r, backgroundColor: isOpp ? COLORS.borderLight : token.color },
          isOpp && styles.discOpp,
          lifted && styles.discLifted,
        ]}
      >
        <Text style={[styles.discText, { fontSize: Math.round(r * 0.75) }, isOpp && styles.discTextOpp]}>
          {token.label}
        </Text>
      </View>
      {token.name !== '' && <Text style={styles.name} numberOfLines={1}>{token.name}</Text>}
    </View>
  );
});

// ── Dessin d'un trait en coordonnées écran ──
const arrowHead = (from: { x: number; y: number }, to: { x: number; y: number }, width: number): string => {
  const len = 8 + width * 2;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = { x: to.x - len * Math.cos(angle - Math.PI / 7), y: to.y - len * Math.sin(angle - Math.PI / 7) };
  const right = { x: to.x - len * Math.cos(angle + Math.PI / 7), y: to.y - len * Math.sin(angle + Math.PI / 7) };
  return `${to.x},${to.y} ${left.x},${left.y} ${right.x},${right.y}`;
};

const StrokeShape = ({ stroke, vp, faded = false }: { stroke: Omit<Stroke, 'id'>; vp: Viewport; faded?: boolean }) => {
  const pts = stroke.points.map(p => toScreen(vp, p));
  const opacity = faded ? 0.3 : 1;
  const first = pts[0];
  if (!first) return null;
  if (stroke.kind === 'arrow') {
    const last = pts[pts.length - 1] ?? first;
    return (
      <G opacity={opacity}>
        <Line
          x1={first.x} y1={first.y} x2={last.x} y2={last.y}
          stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round"
        />
        <Polygon points={arrowHead(first, last, stroke.width)} fill={stroke.color} />
      </G>
    );
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <Path
      d={d} opacity={opacity} fill="none"
      stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round"
    />
  );
};

const strokeHit = (stroke: Stroke, vp: Viewport, x: number, y: number): boolean => {
  const pts = stroke.points.map(p => toScreen(vp, p));
  const tol = ERASE_TOLERANCE_PX + stroke.width / 2;
  if (pts.length === 1) {
    const only = pts[0];
    return only !== undefined && Math.hypot(x - only.x, y - only.y) <= tol;
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a && b && distToSegment(x, y, a.x, a.y, b.x, b.y) <= tol) return true;
  }
  return false;
};

// ── Terrain dessiné ──
const CourtDrawing = ({ vp, court, orientation, full }: { vp: Viewport; court: Rect; orientation: Orientation; full: boolean }) => {
  const rectOf = (a: CourtPoint, b: CourtPoint) => {
    const p = toScreen(vp, a);
    const q = toScreen(vp, b);
    return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y) };
  };
  const line = (a: CourtPoint, b: CourtPoint) => {
    const p = toScreen(vp, a);
    const q = toScreen(vp, b);
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y };
  };
  const lineW = Math.max(2, vp.scale * 0.08);
  const postA = toScreen(vp, { u: -0.5, v: 0 });
  const postB = toScreen(vp, { u: 9.5, v: 0 });
  const labelSize = Math.max(9, Math.min(12, vp.scale * 0.4));
  const zoneLabels: { z: number; p: CourtPoint }[] = [
    { z: 4, p: { u: 0.45, v: 3.6 } }, { z: 3, p: { u: 3.45, v: 3.6 } }, { z: 2, p: { u: 6.45, v: 3.6 } },
    { z: 5, p: { u: 0.45, v: 8.6 } }, { z: 6, p: { u: 3.45, v: 8.6 } }, { z: 1, p: { u: 6.45, v: 8.6 } },
  ];
  const textAt = (p: CourtPoint) => toScreen(vp, p);
  const oppLabel = orientation === 'landscape'
    ? textAt({ u: -0.45, v: -4.5 })
    : full ? textAt({ u: 4.5, v: -10.6 }) : textAt({ u: 4.5, v: -1.3 });
  const mineLabel = orientation === 'landscape' ? textAt({ u: -0.45, v: 4.5 }) : null;

  return (
    <>
      <Defs>
        <ClipPath id="courtClip">
          <SvgRect x={court.x} y={court.y} width={court.w} height={court.h} rx={16} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#courtClip)">
        <SvgRect x={court.x} y={court.y} width={court.w} height={court.h} fill={COLORS.courtFreeZone} />
        <SvgRect {...rectOf({ u: 0, v: -9 }, { u: 9, v: 0 })} fill={COLORS.courtFloorOpp} />
        <SvgRect {...rectOf({ u: 0, v: 0 }, { u: 9, v: 9 })} fill={COLORS.courtFloor} />
        <SvgRect {...rectOf({ u: 0, v: -9 }, { u: 9, v: 9 })} fill="none" stroke={COLORS.courtLine} strokeWidth={lineW} />
        <Line {...line({ u: 0, v: 3 }, { u: 9, v: 3 })} stroke={COLORS.courtLine} strokeWidth={lineW} />
        <Line {...line({ u: 0, v: -3 }, { u: 9, v: -3 })} stroke={COLORS.courtLine} strokeWidth={lineW} />
        {zoneLabels.map(({ z, p }) => {
          const s = textAt(p);
          return (
            <SvgText key={z} x={s.x} y={s.y} fill={COLORS.courtLine} opacity={0.45} fontSize={labelSize} fontWeight="700">
              {String(z)}
            </SvgText>
          );
        })}
        {/* Filet + poteaux */}
        <Line x1={postA.x} y1={postA.y} x2={postB.x} y2={postB.y} stroke={COLORS.textPrimary} strokeWidth={lineW * 3} />
        <Line x1={postA.x} y1={postA.y} x2={postB.x} y2={postB.y} stroke={COLORS.bgApp} strokeWidth={lineW} strokeDasharray="2 4" />
        <Circle cx={postA.x} cy={postA.y} r={lineW * 2.5} fill={COLORS.textPrimary} />
        <Circle cx={postB.x} cy={postB.y} r={lineW * 2.5} fill={COLORS.textPrimary} />
        <SvgText
          x={oppLabel.x} y={oppLabel.y} fill={COLORS.textPrimary} opacity={0.75}
          fontSize={labelSize} fontWeight="700" textAnchor="middle" letterSpacing={2}
        >
          ADVERSAIRE
        </SvgText>
        {mineLabel && (
          <SvgText
            x={mineLabel.x} y={mineLabel.y} fill={COLORS.textPrimary} opacity={0.75}
            fontSize={labelSize} fontWeight="700" textAnchor="middle" letterSpacing={2}
          >
            NOUS
          </SvgText>
        )}
      </G>
    </>
  );
};

const BoardStage = ({ content, tokens, showOpp, orientation, tool, color, strokeWidth, onChange }: Props) => {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [gesture, setGestureState] = useState<Gesture | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const setGesture = (g: Gesture | null) => {
    gestureRef.current = g;
    setGestureState(g);
  };

  // ── Géométrie de la scène ──
  const court: Rect = { x: 0, y: 0, w: size.w, h: size.h };
  const full = orientation === 'landscape' || showOpp;
  const win = full ? WINDOW_FULL : WINDOW_HALF;
  const vp = makeViewport(court, orientation, win);
  const r = tokenRadius(vp.scale);

  // ── Pions placés (calcul léger, refait à chaque rendu) ──
  const onCourt: Placed[] = [];
  tokens.forEach(token => {
    if (token.team === 'opp' && !showOpp) return;
    const p = content.positions[token.id];
    if (!p) return;
    const s = toScreen(vp, p);
    onCourt.push({ token, x: s.x, y: s.y });
  });


  // ── Gestes (handlers relus via ref : le PanResponder est créé une seule fois) ──
  const local = (e: GestureResponderEvent) => ({
    x: e.nativeEvent.pageX - originRef.current.x,
    y: e.nativeEvent.pageY - originRef.current.y,
  });

  const eraseAt = (x: number, y: number, current: number[]): number[] => {
    const hits = content.strokes.filter(s => !current.includes(s.id) && strokeHit(s, vp, x, y)).map(s => s.id);
    return hits.length > 0 ? [...current, ...hits] : current;
  };

  const handleGrant = (x: number, y: number) => {
    if (tool === 'move') {
      for (let i = onCourt.length - 1; i >= 0; i--) {
        const p = onCourt[i];
        if (p && Math.hypot(x - p.x, y - p.y) <= r + 6) {
          setGesture({ kind: 'drag', tokenId: p.token.id, x, y });
          return;
        }
      }
      return;
    }
    if (tool === 'eraser') {
      setGesture({ kind: 'erase', ids: eraseAt(x, y, []) });
      return;
    }
    const pt = toCourt(vp, x, y);
    setGesture({
      kind: 'draw',
      stroke: { kind: tool === 'arrow' ? 'arrow' : 'pen', color, width: strokeWidth, points: tool === 'arrow' ? [pt, pt] : [pt] },
    });
  };

  const handleMove = (x: number, y: number) => {
    const g = gestureRef.current;
    if (!g) return;
    if (g.kind === 'drag') {
      setGesture({ ...g, x, y });
    } else if (g.kind === 'erase') {
      const ids = eraseAt(x, y, g.ids);
      if (ids !== g.ids) setGesture({ kind: 'erase', ids });
    } else {
      const pt = toCourt(vp, x, y);
      if (g.stroke.kind === 'arrow') {
        const start = g.stroke.points[0] ?? pt;
        setGesture({ kind: 'draw', stroke: { ...g.stroke, points: [start, pt] } });
        return;
      }
      const lastPt = g.stroke.points[g.stroke.points.length - 1];
      if (lastPt) {
        const s = toScreen(vp, lastPt);
        if (Math.hypot(x - s.x, y - s.y) < MIN_PEN_STEP_PX) return;
      }
      setGesture({ kind: 'draw', stroke: { ...g.stroke, points: [...g.stroke.points, pt] } });
    }
  };

  const nextStrokeId = () => content.strokes.reduce((max, s) => Math.max(max, s.id), 0) + 1;

  const handleRelease = () => {
    const g = gestureRef.current;
    setGesture(null);
    if (!g) return;

    if (g.kind === 'erase') {
      if (g.ids.length > 0) onChange({ ...content, strokes: content.strokes.filter(s => !g.ids.includes(s.id)) });
      return;
    }

    if (g.kind === 'draw') {
      const pts = g.stroke.points;
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (!first || !last) return;
      if (g.stroke.kind === 'arrow') {
        const a = toScreen(vp, first);
        const b = toScreen(vp, last);
        if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_ARROW_PX) return;
      } else if (pts.length < 2) {
        return;
      }
      onChange({ ...content, strokes: [...content.strokes, { ...g.stroke, id: nextStrokeId() }] });
      return;
    }

    // Déplacement d'un pion (gardé dans la portion visible du terrain)
    const dropped = clampToWindow(toCourt(vp, g.x, g.y), win, 0.4);
    onChange({ ...content, positions: { ...content.positions, [g.tokenId]: dropped } });
  };

  const handlers = { handleGrant, handleMove, handleRelease };
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: e => {
        // Tous les enfants ignorent les touches : locationX est relatif à la scène.
        originRef.current = {
          x: e.nativeEvent.pageX - e.nativeEvent.locationX,
          y: e.nativeEvent.pageY - e.nativeEvent.locationY,
        };
        const p = local(e);
        handlersRef.current.handleGrant(p.x, p.y);
      },
      onPanResponderMove: e => {
        const p = local(e);
        handlersRef.current.handleMove(p.x, p.y);
      },
      onPanResponderRelease: () => handlersRef.current.handleRelease(),
      onPanResponderTerminate: () => {
        gestureRef.current = null;
        setGestureState(null);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const drag = gesture?.kind === 'drag' ? gesture : null;
  const erasing = gesture?.kind === 'erase' ? gesture.ids : [];
  const draft = gesture?.kind === 'draw' ? gesture.stroke : null;
  const dragToken = drag ? tokens.find(t => t.id === drag.tokenId) : undefined;
  const dragOrigin = drag ? onCourt.find(p => p.token.id === drag.tokenId) : undefined;
  const ready = size.w > 0 && size.h > 0;

  return (
    <View style={styles.stage} onLayout={onLayout} {...pan.panHandlers}>
      {ready && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <CourtDrawing vp={vp} court={court} orientation={orientation} full={full} />
          </Svg>

          {/* Pions sur le terrain */}
          {onCourt.map(p => (
            <TokenView
              key={p.token.id} token={p.token} x={p.x} y={p.y} r={r}
              ghost={drag?.tokenId === p.token.id}
            />
          ))}

          {/* Dessins (au-dessus des pions) */}
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            {drag && dragOrigin && (
              <Line
                x1={dragOrigin.x} y1={dragOrigin.y} x2={drag.x} y2={drag.y}
                stroke={COLORS.yellow} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round"
              />
            )}
            {content.strokes.map(s => (
              <StrokeShape key={s.id} stroke={s} vp={vp} faded={erasing.includes(s.id)} />
            ))}
            {draft && <StrokeShape stroke={draft} vp={vp} />}
          </Svg>

          {drag && dragToken && (
            <TokenView token={dragToken} x={drag.x} y={drag.y} r={r * 1.15} lifted />
          )}
        </View>
      )}
    </View>
  );
};

export default BoardStage;
