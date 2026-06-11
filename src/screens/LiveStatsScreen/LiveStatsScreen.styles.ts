import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  tabRoot: {
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
  courtName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    maxWidth: '95%',
  },
  courtNum: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  courtRole: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Filet au centre du terrain
  net: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginVertical: 2,
  },

  // ── Barre libéros ──
  liberoBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  liberoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.yellow}44`,
    backgroundColor: `${COLORS.yellow}14`,
  },
  liberoBtnActive: {
    borderColor: `${COLORS.yellow}88`,
    backgroundColor: `${COLORS.yellow}2a`,
  },
  liberoIcon: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.yellow,
  },
  liberoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.yellow,
    fontWeight: '600',
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
  autoRotateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  autoRotateLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  rotateBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: `${COLORS.blue}22`,
    borderWidth: 1,
    borderColor: `${COLORS.blue}55`,
    borderRadius: RADIUS.md,
  },
  rotateBtnText: {
    fontSize: FONT_SIZE.xxl,
    color: COLORS.blue,
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

  // ── Modal actions plein écran ──
  actionOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bgApp,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  actionGroups: {
    flex: 1,
    gap: SPACING.xs,
  },
  actionGroup: {
    gap: 2,
  },
  actionGroupGrid: {
    flex: 1,
    gap: SPACING.xs,
  },
  actionGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  // Kept for substitution modal scroll
  modalScroll: {
    flex: 1,
  },
  modalCard: {
    width: '100%',
    height: '80%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  actionGroupLabel: {
    fontSize: FONT_SIZE.sm,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
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

  // ── Modal remplacement ──
  subCard: {
    width: '100%',
    height: '80%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  benchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    marginBottom: SPACING.xs,
  },
  benchNum: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  benchName: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  benchRole: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  subCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subEmpty: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // ── Cellule terrain mode geste (sélection trajectoire) ──
  gestureCell: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureZoneNum: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },

  // ── Bannière instruction geste ──
  gestureInstructionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: `${COLORS.yellow}18`,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.yellow}44`,
  },
  gestureInstructionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.yellow,
  },
  gestureCancelBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  gestureCancelText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.redLight,
  },
});
