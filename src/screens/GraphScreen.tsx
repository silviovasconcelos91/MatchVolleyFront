// ─────────────────────────────────────────────
//  ÉCRAN : GRAPHE DE TRAJECTOIRE
//
//  Affiche la trajectoire du set en cours sous
//  forme de graphe XY :
//    - Axe X = points de mon équipe
//    - Axe Y = points adverses
//    - Diagonale = égalité parfaite
//    - Sous la diagonale = je mène
//    - Points rouges = échanges gagnés par l'adversaire
//
//  Utilise react-native-svg pour le rendu vectoriel.
//  Installation : npm install react-native-svg
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Line, Polyline, Circle, Text as SvgText,
  Rect,
} from 'react-native-svg';
import { useMatch } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

// Largeur disponible pour le graphe (plein écran - padding)
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRAPH_WIDTH  = SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md * 2; // -marges
const GRAPH_HEIGHT = 260;
const PAD = 30; // marge intérieure pour les labels d'axes

const GraphScreen = () => {
  const { state } = useMatch();
  const { trajectory, myScore, oppScore } = state;

  // Valeur maximale de l'axe : au moins 25, ou le score max + marge
  const maxVal = Math.max(25, myScore + 3, oppScore + 3);

  // ── Fonctions de conversion score → coordonnée SVG ──
  // toX : score mon équipe → position X en pixels
  const toX = (v: number): number => PAD + (v / maxVal) * (GRAPH_WIDTH - PAD * 2);
  // toY : score adversaire → position Y (inversé car SVG part du haut)
  const toY = (v: number): number => GRAPH_HEIGHT - PAD - (v / maxVal) * (GRAPH_HEIGHT - PAD * 2);

  // Générer les points de la polyline "mon équipe"
  const polylinePoints = trajectory
    .map(pt => `${toX(pt.x)},${toY(pt.y)}`)
    .join(' ');

  // Labels des axes (tous les 5 points)
  const axisLabels = [0, 5, 10, 15, 20, 25].filter(v => v <= maxVal);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Titre ── */}
      <Text style={styles.sectionLabel}>
        TRAJECTOIRE DU SET · sous la diagonale = vous menez
      </Text>

      {/* ── Zone du graphe SVG ── */}
      <View style={styles.graphWrapper}>
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>

          {/* ── Zone "je mène" (vert très transparent, sous la diagonale) ── */}
          {/* Triangle bas-gauche */}
          <Rect
            x={toX(0)} y={toY(0)}
            width={toX(maxVal) - toX(0)}
            height={toY(0) - toY(maxVal)} // hauteur totale
            fill={COLORS.green}
            fillOpacity={0.04}
          />

          {/* ── Grille de fond ── */}
          {axisLabels.map(v => (
            <React.Fragment key={`grid-${v}`}>
              {/* Ligne verticale */}
              <Line
                x1={toX(v)} y1={toY(0)}
                x2={toX(v)} y2={toY(maxVal)}
                stroke={COLORS.border}
                strokeWidth={0.5}
              />
              {/* Ligne horizontale */}
              <Line
                x1={toX(0)} y1={toY(v)}
                x2={toX(maxVal)} y2={toY(v)}
                stroke={COLORS.border}
                strokeWidth={0.5}
              />
            </React.Fragment>
          ))}

          {/* ── Ligne pointillée à 25 pts (seuil victoire) ── */}
          <Line
            x1={toX(25)} y1={toY(0)}
            x2={toX(25)} y2={toY(maxVal)}
            stroke={COLORS.blue}
            strokeWidth={1}
            strokeDasharray="4,4"
            strokeOpacity={0.3}
          />
          <Line
            x1={toX(0)} y1={toY(25)}
            x2={toX(maxVal)} y2={toY(25)}
            stroke={COLORS.blue}
            strokeWidth={1}
            strokeDasharray="4,4"
            strokeOpacity={0.3}
          />

          {/* ── Diagonale d'égalité ── */}
          <Line
            x1={toX(0)} y1={toY(0)}
            x2={toX(maxVal)} y2={toY(maxVal)}
            stroke={COLORS.textMuted}
            strokeWidth={1}
            strokeDasharray="6,4"
            strokeOpacity={0.4}
          />

          {/* ── Labels axe X (mon équipe) ── */}
          {axisLabels.map(v => (
            <SvgText
              key={`xlabel-${v}`}
              x={toX(v)}
              y={GRAPH_HEIGHT - 6}
              textAnchor="middle"
              fontSize={9}
              fill={COLORS.textMuted}
            >
              {v}
            </SvgText>
          ))}

          {/* ── Labels axe Y (adversaire) ── */}
          {axisLabels.map(v => (
            <SvgText
              key={`ylabel-${v}`}
              x={PAD - 4}
              y={toY(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill={COLORS.textMuted}
            >
              {v}
            </SvgText>
          ))}

          {/* ── Label titre axe X ── */}
          <SvgText
            x={GRAPH_WIDTH / 2}
            y={GRAPH_HEIGHT}
            textAnchor="middle"
            fontSize={9}
            fill={COLORS.blue}
          >
            Mon équipe
          </SvgText>

          {/* ── Trajectoire principale (bleu) ── */}
          {trajectory.length > 1 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={COLORS.blue}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* ── Points rouges : échanges gagnés par l'adversaire ── */}
          {trajectory.map((pt, i) => {
            if (i === 0) return null;
            const prev = trajectory[i - 1];
            // Un point monte sur l'axe Y → l'adversaire a marqué
            if (pt.y <= prev.y) return null;
            return (
              <Circle
                key={`adv-${i}`}
                cx={toX(pt.x)}
                cy={toY(pt.y)}
                r={3}
                fill={COLORS.pink}
              />
            );
          })}

          {/* ── Point actuel (fin de trajectoire) ── */}
          {trajectory.length > 0 && (() => {
            const last = trajectory[trajectory.length - 1];
            return (
              <>
                {/* Anneau extérieur bleu */}
                <Circle
                  cx={toX(last.x)} cy={toY(last.y)}
                  r={5} fill={COLORS.blue}
                />
                {/* Centre sombre (effet anneau) */}
                <Circle
                  cx={toX(last.x)} cy={toY(last.y)}
                  r={2.5} fill={COLORS.bgApp}
                />
              </>
            );
          })()}

        </Svg>
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

      {/* ── Score actuel rappel ── */}
      <View style={styles.currentScore}>
        <Text style={styles.currentScoreText}>
          Score actuel :{' '}
          <Text style={{ color: COLORS.textPrimary, fontWeight: '500' }}>{myScore}</Text>
          {' – '}
          <Text style={{ color: COLORS.textMuted }}>{oppScore}</Text>
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

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Wrapper du graphe SVG
  graphWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },

  // Légende
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

  // Rappel score
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