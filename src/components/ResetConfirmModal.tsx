import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/theme';
import ModalBase, { modalSharedStyles } from './ModalBase';

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
    // onClose pas nécessaire : clearTeam() fait disparaître le ScoreHeader
  }, [matchActions, teamActions]);

  return (
    <ModalBase visible={visible} title="Réinitialiser ?" onClose={onClose}>

      <Text style={styles.message}>
        Toutes les données du match en cours seront perdues et vous retournerez
        à la sélection d'équipe.
      </Text>

      <View style={modalSharedStyles.actions}>
        <TouchableOpacity style={modalSharedStyles.btnCancel} onPress={onClose}>
          <Text style={modalSharedStyles.btnCancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
          <Text style={styles.btnConfirmText}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

    </ModalBase>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
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
