import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, {
  Rect, Line, Circle, Text as SvgText, Polygon,
} from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { styles } from './FIVBCourtDiagram.styles';
import type { FIVBCourtDiagramProps } from './FIVBCourtDiagram.types';
import type { AttackZone, AceZone } from '../../data/liveStatsAnalysis';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COURT_WIDTH  = SCREEN_WIDTH - 80;
const CELL_W = COURT_WIDTH / 3;
const CELL_H = CELL_W * 0.75;
const COURT_HEIGHT = CELL_H * 2;

const ZONE_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: CELL_W * 2.5, y: CELL_H * 1.5 },
  2: { x: CELL_W * 2.5, y: CELL_H * 0.5 },
  3: { x: CELL_W * 1.5, y: CELL_H * 0.5 },
  4: { x: CELL_W * 0.5, y: CELL_H * 0.5 },
  5: { x: CELL_W * 0.5, y: CELL_H * 1.5 },
  6: { x: CELL_W * 1.5, y: CELL_H * 1.5 },
};

const ZONE_LABELS = [
  { zone: 4, col: 0, row: 0 },
  { zone: 3, col: 1, row: 0 },
  { zone: 2, col: 2, row: 0 },
  { zone: 5, col: 0, row: 1 },
  { zone: 6, col: 1, row: 1 },
  { zone: 1, col: 2, row: 1 },
];

const ATTACK_COLORS: Record<string, string> = {
  attack_pt:    COLORS.green,
  attack_no_pt: COLORS.yellow,
  attack_fault: COLORS.red,
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const arrowHead = (
  x1: number, y1: number, x2: number, y2: number, color: string, size = 7,
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a1x = x2 - size * Math.cos(angle - Math.PI / 7);
  const a1y = y2 - size * Math.sin(angle - Math.PI / 7);
  const a2x = x2 - size * Math.cos(angle + Math.PI / 7);
  const a2y = y2 - size * Math.sin(angle + Math.PI / 7);
  return (
    <Polygon
      points={`${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}`}
      fill={color}
    />
  );
};

const AttacksDiagram = ({ data }: { data: AttackZone[] }) => {
  const maxCount = Math.max(1, ...data.map(a => a.count));

  return (
    <Svg width={COURT_WIDTH} height={COURT_HEIGHT}>
      <Rect
        x={0} y={0}
        width={COURT_WIDTH} height={COURT_HEIGHT}
        fill={COLORS.bgCard}
        stroke={COLORS.border}
        strokeWidth={1}
        rx={4}
      />
      <Line x1={CELL_W}   y1={0} x2={CELL_W}   y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={CELL_W*2} y1={0} x2={CELL_W*2} y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={0} y1={CELL_H} x2={COURT_WIDTH} y2={CELL_H}       stroke={COLORS.border} strokeWidth={1} />

      {ZONE_LABELS.map(({ zone, col, row }) => (
        <SvgText
          key={zone}
          x={col * CELL_W + CELL_W * 0.5}
          y={row * CELL_H + 14}
          fontSize={10}
          fill={COLORS.textDark}
          textAnchor="middle"
        >
          {zone}
        </SvgText>
      ))}

      {data.map((atk, i) => {
        const color = ATTACK_COLORS[atk.result] ?? COLORS.textMuted;
        const strokeWidth = clamp(1.5 + (atk.count / maxCount) * 2.5, 1.5, 4);

        if (atk.result === 'attack_fault') {
          const pos = atk.playerPosition !== null
            ? ZONE_POSITIONS[atk.playerPosition]
            : { x: COURT_WIDTH / 2, y: COURT_HEIGHT / 2 };
          if (!pos) return null;
          const s = 8;
          return (
            <React.Fragment key={i}>
              <Line x1={pos.x - s} y1={pos.y - s} x2={pos.x + s} y2={pos.y + s} stroke={color} strokeWidth={strokeWidth} />
              <Line x1={pos.x + s} y1={pos.y - s} x2={pos.x - s} y2={pos.y + s} stroke={color} strokeWidth={strokeWidth} />
            </React.Fragment>
          );
        }

        if (atk.from === null || atk.to === null) return null;
        const from = ZONE_POSITIONS[atk.from];
        const to   = ZONE_POSITIONS[atk.to];
        if (!from || !to) return null;

        return (
          <React.Fragment key={i}>
            <Line
              x1={from.x} y1={from.y}
              x2={to.x}   y2={to.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={0.85}
            />
            {arrowHead(from.x, from.y, to.x, to.y, color)}
            <Circle cx={from.x} cy={from.y} r={3} fill={color} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const AcesDiagram = ({ data }: { data: AceZone[] }) => {
  const maxCount = Math.max(1, ...data.map(a => a.count));
  const aceMap: Record<number, number> = {};
  for (const a of data) aceMap[a.zone] = a.count;

  return (
    <Svg width={COURT_WIDTH} height={COURT_HEIGHT}>
      <Rect
        x={0} y={0}
        width={COURT_WIDTH} height={COURT_HEIGHT}
        fill={COLORS.bgCard}
        stroke={COLORS.border}
        strokeWidth={1}
        rx={4}
      />

      {ZONE_LABELS.map(({ zone, col, row }) => {
        const count = aceMap[zone] ?? 0;
        const opacity = count > 0 ? clamp(0.1 + (count / maxCount) * 0.7, 0.1, 0.8) : 0;
        return (
          <Rect
            key={zone}
            x={col * CELL_W + 1}
            y={row * CELL_H + 1}
            width={CELL_W - 2}
            height={CELL_H - 2}
            fill={COLORS.yellow}
            fillOpacity={opacity}
          />
        );
      })}

      <Line x1={CELL_W}   y1={0} x2={CELL_W}   y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={CELL_W*2} y1={0} x2={CELL_W*2} y2={COURT_HEIGHT} stroke={COLORS.border} strokeWidth={1} />
      <Line x1={0} y1={CELL_H} x2={COURT_WIDTH} y2={CELL_H}       stroke={COLORS.border} strokeWidth={1} />

      {ZONE_LABELS.map(({ zone, col, row }) => {
        const count = aceMap[zone] ?? 0;
        return (
          <React.Fragment key={zone}>
            <SvgText
              x={col * CELL_W + CELL_W * 0.5}
              y={row * CELL_H + 14}
              fontSize={10}
              fill={COLORS.textDark}
              textAnchor="middle"
            >
              {zone}
            </SvgText>
            {count > 0 && (
              <SvgText
                x={col * CELL_W + CELL_W * 0.5}
                y={row * CELL_H + CELL_H * 0.5 + 5}
                fontSize={18}
                fontWeight="700"
                fill={COLORS.yellow}
                textAnchor="middle"
              >
                {count}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const FIVBCourtDiagram = (props: FIVBCourtDiagramProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>
      {props.mode === 'attacks' ? 'TRAJECTOIRES ATTAQUES' : 'ACES PAR ZONE'}
    </Text>
    {props.mode === 'attacks'
      ? <AttacksDiagram data={props.data} />
      : <AcesDiagram    data={props.data} />
    }
  </View>
);

export default FIVBCourtDiagram;
