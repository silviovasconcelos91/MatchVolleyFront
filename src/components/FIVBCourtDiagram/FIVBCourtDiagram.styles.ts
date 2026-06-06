import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../../constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    marginVertical: SPACING.sm,
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    alignSelf: 'flex-start',
  },
});
