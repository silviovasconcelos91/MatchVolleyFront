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

  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },

  // ── Segmented team toggle ──
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentItemActiveMine: {
    backgroundColor: `${COLORS.blue}33`,
  },
  segmentItemActiveOpp: {
    backgroundColor: `${COLORS.pink}33`,
  },
  segmentText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  // ── Section labels ──
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },

  // ── Player grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  playerCell: {
    width: '23.5%',
    minHeight: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: 2,
  },
  playerNum: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 9,
    color: COLORS.textMuted,
    maxWidth: '95%',
  },
  playerCount: {
    fontSize: 9,
    color: COLORS.textDark,
  },

  // ── Action groups ──
  actionGroupLabel: {
    fontSize: FONT_SIZE.xs,
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '31%',
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },

  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  // ── Undo + recent ──
  undoBtn: {
    height: 48,
    marginTop: SPACING.sm,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.redLight,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  recentZone: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  // ── Zone overlay ──
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13,27,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  overlayTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    width: '80%',
    justifyContent: 'center',
  },
  zoneCell: {
    width: '30%',
    aspectRatio: 1.4,
    borderRadius: RADIUS.lg,
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
  zoneNet: {
    width: '80%',
    height: 3,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginVertical: SPACING.md,
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
