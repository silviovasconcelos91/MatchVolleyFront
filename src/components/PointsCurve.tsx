// ─────────────────────────────────────────────
//  COMPOSANT : COURBE DES POINTS D'UN SET
//
//  x = score de mon équipe, y = score adverse.
//  Sous la diagonale = mon équipe mène.
//  Utilisé par SetGraph, GraphScreen et l'overlay live public.
// ─────────────────────────────────────────────

import React from 'react';
import Svg, { Line, Polyline, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/theme';

export type CurvePoint = { x: number; y: number };

// Repère ponctuel sur la courbe (ex. temps mort) au score (x, y).
export type CurveMarker = CurvePoint & { team: 'mine' | 'opp' };

export const markerColor = (team: CurveMarker['team']): string =>
  team === 'mine' ? COLORS.yellow : COLORS.pink;

type Props = {
  points:     CurvePoint[];   // commence par { x: 0, y: 0 }
  size:       number;         // côté du carré SVG
  pad:        number;
  finalScore: { my: number; opp: number };  // dimensionne l'échelle (min 25)
  fontSize?:  number;
  dotRadius?: number;
  lineWidth?: number;
  bgColor?:   string;         // fond du point courant (trou du "donut")
  markers?:   CurveMarker[];  // temps morts : carré coloré selon l'équipe qui l'a demandé
};

const PointsCurve = ({
  points, size, pad, finalScore,
  fontSize = 9, dotRadius = 3, lineWidth = 2, bgColor = COLORS.bgApp, markers = [],
}: Props) => {
  const maxVal = Math.max(25, finalScore.my + 3, finalScore.opp + 3);
  const toX = (v: number) => pad + (v / maxVal) * (size - pad * 2);
  const toY = (v: number) => size - pad - (v / maxVal) * (size - pad * 2);

  const polylinePoints = points.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ');
  const axisLabels = [0, 5, 10, 15, 20, 25].filter(v => v <= maxVal);
  const last = points.length > 0 ? points[points.length - 1] : null;

  return (
    <Svg width={size} height={size}>

      {/* Zone verte (sous la diagonale = on mène) */}
      <Rect
        x={toX(0)} y={toY(0)}
        width={toX(maxVal) - toX(0)}
        height={toY(0) - toY(maxVal)}
        fill={COLORS.green}
        fillOpacity={0.04}
      />

      {/* Grille */}
      {axisLabels.map(v => (
        <React.Fragment key={`g${v}`}>
          <Line x1={toX(v)} y1={toY(0)} x2={toX(v)} y2={toY(maxVal)} stroke={COLORS.border} strokeWidth={0.5} />
          <Line x1={toX(0)} y1={toY(v)} x2={toX(maxVal)} y2={toY(v)} stroke={COLORS.border} strokeWidth={0.5} />
        </React.Fragment>
      ))}

      {/* Ligne 25 + diagonale */}
      <Line x1={toX(25)} y1={toY(0)} x2={toX(25)} y2={toY(maxVal)} stroke={COLORS.blue} strokeWidth={1} strokeDasharray="4,4" strokeOpacity={0.3} />
      <Line x1={toX(0)} y1={toY(25)} x2={toX(maxVal)} y2={toY(25)} stroke={COLORS.blue} strokeWidth={1} strokeDasharray="4,4" strokeOpacity={0.3} />
      <Line x1={toX(0)} y1={toY(0)} x2={toX(maxVal)} y2={toY(maxVal)} stroke={COLORS.textMuted} strokeWidth={1} strokeDasharray="6,4" strokeOpacity={0.4} />

      {/* Labels axes */}
      {axisLabels.map(v => (
        <SvgText key={`xl${v}`} x={toX(v)} y={size - fontSize * 0.7} textAnchor="middle" fontSize={fontSize} fill={COLORS.textMuted}>{v}</SvgText>
      ))}
      {axisLabels.map(v => (
        <SvgText key={`yl${v}`} x={pad - 4} y={toY(v) + fontSize / 3} textAnchor="end" fontSize={fontSize} fill={COLORS.textMuted}>{v}</SvgText>
      ))}
      <SvgText x={size / 2} y={size} textAnchor="middle" fontSize={fontSize} fill={COLORS.blue}>Mon équipe</SvgText>

      {/* Trajectoire */}
      {points.length > 1 && (
        <Polyline points={polylinePoints} fill="none" stroke={COLORS.blue} strokeWidth={lineWidth} strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Points adverses (rose) */}
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        if (pt.y <= prev.y) return null;
        return <Circle key={`a${i}`} cx={toX(pt.x)} cy={toY(pt.y)} r={dotRadius} fill={COLORS.pink} />;
      })}

      {/* Temps morts : carré cerclé au score de l'appel (décalé si les deux équipes au même score) */}
      {markers.map((m, i) => {
        const half = dotRadius * 1.6;
        const sameSpot = markers.findIndex(o => o.x === m.x && o.y === m.y);
        const offset = sameSpot === i ? 0 : half * 1.4;
        const cx = toX(m.x) + offset;
        const cy = toY(m.y) - offset;
        return (
          <Rect
            key={`tm${i}`}
            x={cx - half} y={cy - half}
            width={half * 2} height={half * 2}
            fill={bgColor}
            stroke={markerColor(m.team)}
            strokeWidth={lineWidth}
          />
        );
      })}

      {/* Dernier point */}
      {last && (
        <>
          <Circle cx={toX(last.x)} cy={toY(last.y)} r={dotRadius * 5 / 3} fill={COLORS.blue} />
          <Circle cx={toX(last.x)} cy={toY(last.y)} r={dotRadius * 5 / 6} fill={bgColor} />
        </>
      )}

    </Svg>
  );
};

export default PointsCurve;
