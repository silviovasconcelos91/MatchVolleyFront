import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/theme';
import ModalBase, { modalSharedStyles } from './ModalBase';

type Props = {
  visible: boolean;
  target: 'me' | 'opp';
  maxAmount: 1 | 2;
  onConfirm: (amount: 1 | 2) => void;
  onClose: () => void;
};

const MalusModal = ({ visible, target, maxAmount, onConfirm, onClose }: Props) => {
  const [amount, setAmount] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (!visible) setAmount(null);
  }, [visible]);

  const title = target === 'me' ? 'Malus — Mon équipe' : 'Malus — Adversaire';

  const handleConfirm = () => {
    if (!amount) return;
    onConfirm(amount);
    onClose();
  };

  return (
    <ModalBase visible={visible} title={title} onClose={onClose}>
      <View style={styles.amountRow}>
        {([1, 2] as const).filter(val => val <= maxAmount).map(val => (
          <TouchableOpacity
            key={val}
            style={[styles.amountBtn, amount === val && styles.amountBtnActive]}
            onPress={() => setAmount(val)}
            activeOpacity={0.7}
          >
            <Text style={[styles.amountText, amount === val && styles.amountTextActive]}>
              -{val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={modalSharedStyles.actions}>
        <TouchableOpacity style={modalSharedStyles.btnCancel} onPress={onClose}>
          <Text style={modalSharedStyles.btnCancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnConfirm, !amount && styles.btnConfirmDisabled]}
          onPress={handleConfirm}
          disabled={!amount}
          activeOpacity={0.7}
        >
          <Text style={styles.btnConfirmText}>Appliquer</Text>
        </TouchableOpacity>
      </View>
    </ModalBase>
  );
};

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  amountBtn: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  amountBtnActive: {
    backgroundColor: `${COLORS.red}22`,
    borderColor: `${COLORS.red}66`,
  },
  amountText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  amountTextActive: {
    color: COLORS.redLight,
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnConfirmDisabled: {
    opacity: 0.4,
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.redLight,
    fontWeight: '500',
  },
});

export default MalusModal;
