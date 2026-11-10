import { Platform, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

// Dimensions de la scène (px)
export const BENCH_SIZE = 56;        // hauteur (portrait) / largeur (paysage) du banc
export const BENCH_LABEL_SIZE = 48;  // place réservée au libellé « BANC »
export const STAGE_GAP = SPACING.sm;

const liftedShadow = Platform.select({
  android: { elevation: 8 },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});

export const stageStyles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  token: {
    position: 'absolute',
    alignItems: 'center',
  },
  tokenGhost: {
    opacity: 0.35,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgApp,
  },
  discOpp: {
    borderColor: COLORS.textSecondary,
  },
  discLifted: {
    borderWidth: 3,
    borderColor: COLORS.yellow,
    ...liftedShadow,
  },
  discText: {
    fontWeight: '800',
    color: COLORS.bgApp,
  },
  discTextOpp: {
    color: COLORS.textPrimary,
  },
  role: {
    marginTop: 2,
    paddingHorizontal: 5,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: `${COLORS.bgApp}e0`,
  },
  bench: {
    position: 'absolute',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
  },
  benchColumn: {
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  benchLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  benchHint: {
    marginLeft: SPACING.xl,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
});

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  portraitBody: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },

  // ── En-tête (portrait) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  hint: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },

  // ── Boutons ──
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minWidth: 44,
    height: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  actionBtnWide: {
    flex: 1,
  },
  actionBtnFull: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  actionBtnOn: {
    borderColor: COLORS.blue,
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionTextDanger: {
    color: COLORS.redLight,
  },

  // ── Barre d'outils ──
  toolbar: {
    padding: SPACING.sm,
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  toolRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  tool: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    height: 60,
    borderRadius: RADIUS.lg,
  },
  toolCompact: {
    flex: 0,
    width: 52,
    height: 52,
  },
  toolOn: {
    backgroundColor: COLORS.blue,
  },
  toolText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toolTextOn: {
    color: COLORS.bgApp,
  },

  // ── Couleurs / épaisseurs ──
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: {
    borderColor: COLORS.textPrimary,
  },
  swatchDot: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
  },
  widthBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthBtnOn: {
    borderColor: COLORS.blue,
  },
  widthBar: {
    width: 18,
    borderRadius: 2,
    backgroundColor: COLORS.textPrimary,
  },
  paletteDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  // ── Paysage : colonnes latérales ──
  sideTools: {
    width: 64,
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.xs + 2,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  sideToolsSpacer: {
    flex: 1,
  },
  sidePanel: {
    width: 170,
    gap: SPACING.sm,
  },
  scoreCard: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  scoreLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  scoreValue: {
    marginTop: 2,
    fontSize: FONT_SIZE.xxl + 4,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scoreOpp: {
    color: COLORS.textSecondary,
  },

  // ── Feuille « Effacer » ──
  scrim: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: COLORS.scrim,
  },
  scrimTap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    gap: SPACING.sm + 2,
    paddingTop: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sheetSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md + 2,
    minHeight: 64,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  optionDanger: {
    borderColor: `${COLORS.red}66`,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: FONT_SIZE.xl - 1,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  optionSub: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  sheetCancel: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
});
