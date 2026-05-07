// ─────────────────────────────────────────────
//  COMPOSANT : EN-TÊTE DU SCORE
//
//  Affiche en permanence :
//    - Le numéro de set en cours
//    - Les sets gagnés (ex: "Sets 1 – 0")
//    - Les scores du set en cours
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import EndMatchModal from './EndMatchModal';
import ResetConfirmModal from './ResetConfirmModal';

type Props = { onRosterPress?: () => void };

const ScoreHeader = ({ onRosterPress }: Props) => {
  const { state, actions } = useMatch(); // actions used for undo
  const { myScore, oppScore, mySets, oppSets, setNum, rosterValidated, history } = state;
  const undoDisabled = !rosterValidated || history.length === 0;

  const [endModalVisible, setEndModalVisible]     = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  return (
    <View style={styles.container}>

      {/* ── Ligne supérieure : reset + set + sets + terminer ── */}
      <View style={styles.topRow}>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setResetModalVisible(true)}
        >
          <Text style={styles.resetBtnText}>⟳</Text>
        </TouchableOpacity>

        <Text style={styles.setLabel}>SET {setNum}</Text>

        <View style={styles.setsBadge}>
          <Text style={styles.setsBadgeText}>Sets {mySets} – {oppSets}</Text>
        </View>

        {rosterValidated && onRosterPress && (
          <TouchableOpacity style={styles.rosterBtn} onPress={onRosterPress}>
            <Text style={styles.rosterBtnText}>Équipe</Text>
          </TouchableOpacity>
        )}

        {rosterValidated && (
          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => setEndModalVisible(true)}
          >
            <Text style={styles.endBtnText}>Terminer</Text>
          </TouchableOpacity>
        )}
      </View>

      <EndMatchModal
        visible={endModalVisible}
        onClose={() => setEndModalVisible(false)}
      />
      <ResetConfirmModal
        visible={resetModalVisible}
        onClose={() => setResetModalVisible(false)}
      />

      {/* ── Scores ── */}
      <View style={styles.scoresRow}>
        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>MON ÉQUIPE</Text>
          <Text style={styles.scoreHome}>{myScore}</Text>
        </View>

        <Text style={styles.dash}>–</Text>

        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>ADVERSAIRE</Text>
          <Text style={styles.scoreAway}>{oppScore}</Text>
        </View>
      </View>

      {/* ── Annuler discret ── */}
      {rosterValidated && (
        <TouchableOpacity
          style={[styles.undoRow, undoDisabled && styles.undoDisabled]}
          onPress={actions.undo}
          disabled={undoDisabled}
          activeOpacity={0.5}
        >
          <Text style={styles.undoText}>↩ Annuler</Text>
        </TouchableOpacity>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },

  // Ligne numéro de set + badge sets
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  setLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  setsBadge: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  setsBadgeText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  resetBtn: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
  },
  resetBtnText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textDark,
  },
  rosterBtn: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
  },
  rosterBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  endBtn: {
    backgroundColor: `${COLORS.red}18`,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  endBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.redLight,
  },

  // Scores
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xxl + SPACING.sm, // ~28px entre les blocs
    marginBottom: SPACING.md,
  },
  teamBlock: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreHome: {
    fontSize: FONT_SIZE.score,
    fontWeight: '500',
    color: COLORS.scoreHome,
    lineHeight: FONT_SIZE.score * 1.1,
  },
  scoreAway: {
    fontSize: FONT_SIZE.score,
    fontWeight: '500',
    color: COLORS.scoreAway,
    lineHeight: FONT_SIZE.score * 1.1,
  },
  dash: {
    fontSize: 20,
    color: COLORS.border,
  },

  undoRow: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  undoText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  undoDisabled: {
    opacity: 0.3,
  },

});

export default ScoreHeader;