import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

type Props = {
  timeline: { myScore?: number; oppScore?: number }[];
  finalMyScore: number;
  finalOppScore: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRAPH_WIDTH  = SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md * 2 - 2;
const GRAPH_HEIGHT = 220;
const PAD = 28;

const SetGraph = ({ timeline, finalMyScore, finalOppScore }: Props) => {
  const points = [{ x: 0, y: 0 }, ...timeline.map(e => ({ x: e.myScore ?? 0, y: e.oppScore ?? 0 }))];

  const maxVal = Math.max(25, finalMyScore + 3, finalOppScore + 3);
  const toX = (v: number) => PAD + (v / maxVal) * (GRAPH_WIDTH - PAD * 2);
  const toY = (v: number) => GRAPH_HEIGHT - PAD - (v / maxVal) * (GRAPH_HEIGHT - PAD * 2);

  const polylinePoints = points.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ');
  const axisLabels = [0, 5, 10, 15, 20, 25].filter(v => v <= maxVal);

  const last = points[points.length - 1];

  return (
    <>
      <View style={styles.graphWrapper}>
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>

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
            <SvgText key={`xl${v}`} x={toX(v)} y={GRAPH_HEIGHT - 6} textAnchor="middle" fontSize={9} fill={COLORS.textMuted}>{v}</SvgText>
          ))}
          {axisLabels.map(v => (
            <SvgText key={`yl${v}`} x={PAD - 4} y={toY(v) + 3} textAnchor="end" fontSize={9} fill={COLORS.textMuted}>{v}</SvgText>
          ))}
          <SvgText x={GRAPH_WIDTH / 2} y={GRAPH_HEIGHT} textAnchor="middle" fontSize={9} fill={COLORS.blue}>Mon équipe</SvgText>

          {/* Trajectoire */}
          {points.length > 1 && (
            <Polyline points={polylinePoints} fill="none" stroke={COLORS.blue} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* Points adverses (rose) */}
          {points.map((pt, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            if (pt.y <= prev.y) return null;
            return <Circle key={`a${i}`} cx={toX(pt.x)} cy={toY(pt.y)} r={3} fill={COLORS.pink} />;
          })}

          {/* Dernier point */}
          {points.length > 0 && (
            <>
              <Circle cx={toX(last.x)} cy={toY(last.y)} r={5} fill={COLORS.blue} />
              <Circle cx={toX(last.x)} cy={toY(last.y)} r={2.5} fill={COLORS.bgApp} />
            </>
          )}

        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.textMuted }]} />
          <Text style={styles.legendText}>Égalité</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.blue }]} />
          <Text style={styles.legendText}>Mon équipe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Point adverse</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  graphWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendLine: { width: 16, height: 2, borderRadius: 1 },
  legendDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.pink },
  legendText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
});

export default SetGraph;
