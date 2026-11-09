import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { useMatch } from '../context/MatchContext';
import type { MatchHistoryEvent } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { useContentWidth } from '../hooks/useContentWidth';
import PointsCurve from '../components/PointsCurve';

const PAD = 30;

type Point = { x: number; y: number };

function buildTrajectory(matchHistory: MatchHistoryEvent[], setNum: number): Point[] {
  const events = matchHistory
    .filter(e => e.setNum === setNum)
    .sort((a, b) => a.index - b.index);

  const points: Point[] = [{ x: 0, y: 0 }];
  for (const event of events) {
    points.push({ x: event.scoreAfter.my, y: event.scoreAfter.opp });
  }
  return points;
}

const GraphScreen = () => {
  const { state } = useMatch();
  const { trajectory, myScore, oppScore, setNum, matchHistory, setResults } = state;
  const contentWidth = useContentWidth();
  const GRAPH_SIZE = contentWidth - SPACING.xl * 2 - SPACING.md * 2;

  const [viewedSet, setViewedSet] = useState(setNum);

  // Suivre le set courant si l'utilisateur n'a pas changé manuellement
  useEffect(() => {
    setViewedSet(setNum);
  }, [setNum]);

  const isCurrent = viewedSet === setNum;

  // Trajectoire : set courant → état live, set passé → reconstruit
  const points: Point[] = isCurrent
    ? trajectory
    : buildTrajectory(matchHistory, viewedSet);

  // Score affiché sous le graphe
  const completedSet = setResults.find(s => s.setNum === viewedSet);
  const displayScore = isCurrent
    ? { my: myScore, opp: oppScore }
    : { my: completedSet?.myScore ?? 0, opp: completedSet?.oppScore ?? 0 };

  const maxVal = Math.max(25, displayScore.my + 3, displayScore.opp + 3);

  const toX = (v: number) => PAD + (v / maxVal) * (GRAPH_SIZE - PAD * 2);
  const toY = (v: number) => GRAPH_SIZE - PAD - (v / maxVal) * (GRAPH_SIZE - PAD * 2);

  const polylinePoints = points.map(pt => `${toX(pt.x)},${toY(pt.y)}`).join(' ');
  const axisLabels = [0, 5, 10, 15, 20, 25].filter(v => v <= maxVal);

  // Construire la liste des sets disponibles (1 … setNum)
  const availableSets = Array.from({ length: setNum }, (_, i) => i + 1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Sélecteur de set ── */}
      {availableSets.length > 1 && (
        <View style={styles.setSelector}>
          {availableSets.map(s => {
            const result = setResults.find(r => r.setNum === s);
            const active  = viewedSet === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.setTab, active && styles.setTabActive]}
                onPress={() => setViewedSet(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.setTabText, active && styles.setTabTextActive]}>
                  SET {s}
                </Text>
                {result && (
                  <Text style={[styles.setTabScore, active && styles.setTabScoreActive]}>
                    {result.myScore}–{result.oppScore}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Label ── */}
      <Text style={styles.sectionLabel}>
        SET {viewedSet}{isCurrent ? ' · EN COURS' : ''} · sous la diagonale = vous menez
      </Text>

      {/* ── Graphe SVG ── */}
      <View style={styles.graphWrapper}>
        <PointsCurve
          points={points}
          size={GRAPH_SIZE}
          pad={PAD}
          finalScore={displayScore}
        />
      </View>

      {/* ── Légende ── */}
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

      {/* ── Score du set ── */}
      <View style={styles.currentScore}>
        <Text style={styles.currentScoreText}>
          {isCurrent ? 'Score actuel' : `Set ${viewedSet}`}{' · '}
          <Text style={{ color: COLORS.textPrimary, fontWeight: '500' }}>{displayScore.my}</Text>
          {' – '}
          <Text style={{ color: COLORS.textMuted }}>{displayScore.opp}</Text>
        </Text>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  setSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  setTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  setTabActive: {
    borderColor: COLORS.blue + '66',
    backgroundColor: COLORS.blue + '18',
  },
  setTabText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  setTabTextActive: {
    color: COLORS.blue,
    fontWeight: '600',
  },
  setTabScore: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  setTabScoreActive: {
    color: COLORS.blue,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  graphWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pink,
  },
  legendText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  currentScore: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  currentScoreText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
  },
});

export default GraphScreen;
