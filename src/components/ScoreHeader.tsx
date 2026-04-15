// ─────────────────────────────────────────────
//  COMPOSANT : EN-TÊTE DU SCORE
//
//  Affiche en permanence :
//    - Le numéro de set en cours
//    - Les sets gagnés (ex: "Sets 1 – 0")
//    - Les scores du set en cours
//    - Les boutons d'action rapide (faute adverse,
//      +adversaire, annuler, rotation)
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import EndMatchModal from './EndMatchModal';
import ResetConfirmModal from './ResetConfirmModal';

const ScoreHeader = () => {
  const { state, actions } = useMatch();
  const { myScore, oppScore, mySets, oppSets, setNum, setBannerVisible, rosterValidated } = state;

  const [endModalVisible, setEndModalVisible]     = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  // Désactiver tous les boutons si le roster n'est pas validé ou pendant la bannière de fin de set
  const disabled = !rosterValidated || setBannerVisible;

  return (
    <View style={styles.container}>

      {/* ── Ligne supérieure : reset + set + sets + terminer ── */}
      <View style={styles.topRow}>

        {/* Bouton réinitialisation (toujours visible) */}
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

        {/* Bouton fin de match (visible uniquement si le match a commencé) */}
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
          {/* Score de mon équipe en blanc */}
          <Text style={styles.scoreHome}>{myScore}</Text>
        </View>

        <Text style={styles.dash}>–</Text>

        <View style={styles.teamBlock}>
          <Text style={styles.teamLabel}>ADVERSAIRE</Text>
          {/* Score adverse en bleu muted */}
          <Text style={styles.scoreAway}>{oppScore}</Text>
        </View>
      </View>

      {/* ── Ligne 1 : faute adverse + point adversaire ── */}
      <View style={styles.buttonsRow}>

        {/* Faute adverse → mon équipe marque +1 */}
        <TouchableOpacity
          style={[styles.btnGreen, disabled && styles.btnDisabled]}
          onPress={actions.oppFault}
          disabled={disabled}
        >
          <Text style={styles.btnGreenText}>⚡ Faute adverse</Text>
        </TouchableOpacity>

        {/* Point adversaire manuel */}
        <TouchableOpacity
          style={[styles.btnSecondary, disabled && styles.btnDisabled]}
          onPress={actions.oppScore}
          disabled={disabled}
        >
          <Text style={styles.btnSecondaryText}>+ Adversaire</Text>
        </TouchableOpacity>

      </View>

      {/* ── Ligne 2 : annuler + rotation ── */}
      <View style={styles.buttonsRow}>

        {/* Annuler la dernière action */}
        <TouchableOpacity
          style={[styles.btnSecondary, disabled && styles.btnDisabled]}
          onPress={actions.undo}
          disabled={disabled}
        >
          <Text style={styles.btnSecondaryText}>↩ Annuler</Text>
        </TouchableOpacity>

        {/* Rotation des joueurs sur le terrain */}
        <TouchableOpacity
          style={[styles.btnSecondary, disabled && styles.btnDisabled]}
          onPress={actions.rotate}
          disabled={disabled}
        >
          <Text style={styles.btnSecondaryText}>↻ Rotation</Text>
        </TouchableOpacity>

      </View>
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

  // Lignes de boutons
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Bouton faute adverse (vert, mis en avant)
  btnGreen: {
    flex: 1,
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnGreenText: {
    color: COLORS.greenLight,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },

  // Bouton secondaire (fond sombre)
  btnSecondary: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },

  // État désactivé (pendant la fin de set)
  btnDisabled: {
    opacity: 0.4,
  },
});

export default ScoreHeader;