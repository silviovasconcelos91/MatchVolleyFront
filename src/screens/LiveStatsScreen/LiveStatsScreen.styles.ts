import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  headerBtn: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerReset: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.redLight,
  },

  // ── Court ──
  court: {
    flex: 1,
    padding: SPACING.lg,
  },
  half: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  halfTop: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  halfBottom: {
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  halfLabel: {
    fontSize: FONT_SIZE.xs,
    letterSpacing: 1,
    textAlign: 'center',
  },
  courtRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  courtCell: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: SPACING.xs,
  },
  courtCellEmpty: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtCellEmptyText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  courtNum: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  courtName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    maxWidth: '95%',
  },
  courtCount: {
    fontSize: 9,
    color: COLORS.textDark,
  },
  courtZoneTag: {
    fontSize: 8,
    color: COLORS.textDark,
  },

  // Filet au centre du terrain
  net: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginVertical: 2,
  },

  // ── Footer (dernière saisie + undo) ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  footerText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  undoBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.md,
  },
  undoBtnDisabled: {
    opacity: 0.35,
  },
  undoBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.redLight,
  },

  // ── Overlay commun ──
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13,27,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },

  // ── Modal actions (quasi plein écran pour faciliter la saisie) ──
  modalCard: {
    width: '100%',
    height: '94%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalScroll: {
    flex: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  actionGroupLabel: {
    fontSize: FONT_SIZE.lg,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 72,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancel: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.redLight,
  },

  // ── Zone : demi-terrain adverse ──
  zoneTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  zoneNetLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  zoneCourt: {
    width: '90%',
    aspectRatio: 1.1,
    backgroundColor: `${COLORS.pink}14`,
    borderWidth: 1,
    borderColor: `${COLORS.pink}55`,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  zoneRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  zoneCell: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCellText: {
    fontSize: FONT_SIZE.score,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  zoneCancel: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  zoneCancelText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.redLight,
  },
});
