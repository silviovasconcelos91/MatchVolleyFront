import React from 'react';
import { Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const ModalBase = ({ visible, title, onClose, children }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

export const modalSharedStyles = StyleSheet.create({
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
});

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
});

export default ModalBase;
