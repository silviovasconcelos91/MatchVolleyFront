import { StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, OVERLAY_FONT_SIZE } from '../../constants/theme';

// Panneau conçu à l'échelle 1 pour une source 1920×1080.
export const PANEL_WIDTH  = 560;
export const PANEL_MARGIN = 40;
const CARD_PADDING = SPACING.xl;
export const GRAPH_SIZE_ALONE = PANEL_WIDTH - CARD_PADDING * 2;

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

  // ── Bandeau score (face à face) ──
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.red,
  },
  setHeaderText: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.green,
    letterSpacing: 2,
  },
  setHeaderTimeout: {
    color: COLORS.yellow,
  },
  timeoutCount: {
    fontSize: OVERLAY_FONT_SIZE.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  faceOff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  teamName: {
    fontSize: OVERLAY_FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  bigScore: {
    minWidth: 56,
    fontSize: OVERLAY_FONT_SIZE.score,
    fontWeight: '800',
    lineHeight: OVERLAY_FONT_SIZE.score * 1.1,
  },
  bigScoreMine: {
    textAlign: 'right',
    color: COLORS.scoreHome,
  },
  bigScoreOpp: {
    textAlign: 'left',
    color: COLORS.textSecondary,
  },
  scoreDash: {
    fontSize: OVERLAY_FONT_SIZE.lg,
    color: COLORS.textMuted,
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
