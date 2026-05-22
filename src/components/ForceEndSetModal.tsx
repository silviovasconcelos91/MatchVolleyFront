import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/theme';
import ModalBase, { modalSharedStyles } from './ModalBase';

type Props = {
  visible: boolean;
  setNum: number;
  myScore: number;
  oppScore: number;
  onConfirm: () => void;
  onClose: () => void;
};

const ForceEndSetModal = ({ visible, setNum, myScore, oppScore, onConfirm, onClose }: Props) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const winnerLabel =
    myScore > oppScore ? '→ Mon équipe gagne' :
    oppScore > myScore ? '→ Adversaire gagne' :
    'Égalité';

  const winnerColor =
    myScore > oppScore ? COLORS.green :
    oppScore > myScore ? COLORS.red :
    COLORS.textDark;

  return (
    <ModalBase visible={visible} title={`Terminer le Set ${setNum} ?`} onClose={onClose}>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreHome}>{myScore}</Text>
        <Text style={styles.dash}> – </Text>
        <Text style={styles.scoreAway}>{oppScore}</Text>
      </View>

      <Text style={[styles.winnerBadge, { color: winnerColor }]}>{winnerLabel}</Text>

      <View style={modalSharedStyles.actions}>
        <TouchableOpacity style={modalSharedStyles.btnCancel} onPress={onClose}>
          <Text style={modalSharedStyles.btnCancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm} activeOpacity={0.7}>
          <Text style={styles.btnConfirmText}>Confirmer</Text>
        </TouchableOpacity>
      </View>
    </ModalBase>
  );
};

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  scoreHome: {
    fontSize: 40,
    fontWeight: '600',
    color: COLORS.scoreHome,
  },
  dash: {
    fontSize: 24,
    color: COLORS.border,
  },
  scoreAway: {
    fontSize: 40,
    fontWeight: '600',
    color: COLORS.scoreAway,
  },
  winnerBadge: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.green,
    fontWeight: '500',
  },
});

export default ForceEndSetModal;
