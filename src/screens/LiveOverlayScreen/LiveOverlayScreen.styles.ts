import { StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, OVERLAY_FONT_SIZE } from '../../constants/theme';

// Panneau conçu à l'échelle 1 pour une source 1920×1080.
export const PANEL_WIDTH  = 560;
export const PANEL_MARGIN = 40;
const CARD_PADDING = SPACING.xl;
export const GRAPH_SIZE_ALONE = PANEL_WIDTH - CARD_PADDING * 2;
export const GRAPH_SIZE_FULL  = 360;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  rootOpaque: {
    backgroundColor: COLORS.bgApp,
  },
  rootTransparent: {
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    width: PANEL_WIDTH,
    gap: SPACING.md,
    transformOrigin: 'top left',
  },

  card: {
    backgroundColor: `${COLORS.bgCard}ee`,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: CARD_PADDING,
    gap: SPACING.sm,
  },

  // ── Bandeau score ──
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  boardTitle: {
    flex: 1,
    fontSize: OVERLAY_FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  statusBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statusLive: {
    backgroundColor: COLORS.red,
  },
  statusEnded: {
    backgroundColor: COLORS.border,
  },
  statusText: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.scoreHome,
    letterSpacing: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  serveDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
  },
  serveDotActive: {
    backgroundColor: COLORS.yellow,
  },
  teamName: {
    flex: 1,
    fontSize: OVERLAY_FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pastSet: {
    width: 32,
    textAlign: 'center',
    fontSize: OVERLAY_FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  pastSetWon: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  setsWonBox: {
    width: 40,
    alignItems: 'center',
    backgroundColor: COLORS.bgApp,
    borderRadius: RADIUS.sm,
    paddingVertical: 2,
  },
  setsWon: {
    fontSize: OVERLAY_FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.yellow,
  },
  currentScore: {
    width: 80,
    textAlign: 'right',
    fontSize: OVERLAY_FONT_SIZE.score,
    fontWeight: '700',
    lineHeight: OVERLAY_FONT_SIZE.score * 1.1,
  },
  boardFooter: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textAlign: 'right',
  },

  // ── Sections ──
  sectionLabel: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  graphBox: {
    alignItems: 'center',
  },

  // ── Derniers points ──
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  pointBar: {
    width: 6,
    height: 28,
    borderRadius: RADIUS.sm,
  },
  pointScore: {
    width: 72,
    fontSize: OVERLAY_FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pointText: {
    flex: 1,
    fontSize: OVERLAY_FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  pointAction: {
    color: COLORS.textPrimary,
  },
  scorers: {
    marginTop: SPACING.xs,
    fontSize: OVERLAY_FONT_SIZE.md,
    color: COLORS.textPrimary,
  },

  // ── Messages ──
  messageTitle: {
    fontSize: OVERLAY_FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  messageText: {
    fontSize: OVERLAY_FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  staleText: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    color: COLORS.redLight,
  },
});
