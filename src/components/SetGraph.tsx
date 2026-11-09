import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';
import { useContentWidth } from '../hooks/useContentWidth';
import PointsCurve from './PointsCurve';

type Props = {
  timeline: { myScore?: number; oppScore?: number }[];
  finalMyScore: number;
  finalOppScore: number;
};

const PAD = 28;

const SetGraph = ({ timeline, finalMyScore, finalOppScore }: Props) => {
  const contentWidth = useContentWidth();
  const GRAPH_SIZE = contentWidth - SPACING.xl * 2 - SPACING.md * 2 - 2;
  const points = [{ x: 0, y: 0 }, ...timeline.map(e => ({ x: e.myScore ?? 0, y: e.oppScore ?? 0 }))];

  return (
    <>
      <View style={styles.graphWrapper}>
        <PointsCurve
          points={points}
          size={GRAPH_SIZE}
          pad={PAD}
          finalScore={{ my: finalMyScore, opp: finalOppScore }}
        />
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
