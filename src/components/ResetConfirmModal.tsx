// ─────────────────────────────────────────────
//  COMPOSANT : MODAL CONFIRMATION RÉINITIALISATION
//
//  Demande confirmation avant de tout effacer
//  et de retourner à la sélection d'équipe.
// ─────────────────────────────────────────────

import React, { useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const ResetConfirmModal = ({ visible, onClose }: Props) => {
  const { actions: matchActions } = useMatch();
  const { actions: teamActions }  = useTeam();

  const handleConfirm = useCallback(() => {
    matchActions.resetMatch();
    teamActions.clearTeam();
    // onClose n'est pas nécessaire ici : clearTeam() fait disparaître
    // le ScoreHeader (AppContent affiche TeamSelectionScreen à la place)
  }, [matchActions, teamActions]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>

          <Text style={styles.title}>Réinitialiser ?</Text>
          <Text style={styles.message}>
            Toutes les données du match en cours seront perdues et vous retournerez
            à la sélection d'équipe.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
              <Text style={styles.btnConfirmText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: `${COLORS.yellow}22`,
    borderWidth: 1,
    borderColor: `${COLORS.yellow}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.yellow,
    fontWeight: '500',
  },
});

export default ResetConfirmModal;
