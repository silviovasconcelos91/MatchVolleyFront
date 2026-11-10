// ─────────────────────────────────────────────
//  BOARD ENTRAÎNEUR
//  Tableau tactique ouvert pendant le match : déplacer les joueurs,
//  dessiner (crayon / flèche), gommer, annuler / rétablir.
//  Pré-rempli avec les positions réelles du set (MatchContext).
//  État purement local : rien n'est enregistré, tout est perdu à la fermeture.
//  Portrait : mon demi-terrain (terrain complet si adversaires affichés).
//  Paysage  : terrain complet, outils à gauche, actions à droite.
// ─────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMatch } from '../../context/MatchContext';
import { FORMAT_CONFIG } from '../../data/matchFormat';
import { COLORS, getPositionColor } from '../../constants/theme';
import BoardStage from './BoardStage';
import BoardClearSheet from './BoardClearSheet';
import type { ClearChoice } from './BoardClearSheet';
import { boardReducer, initHistory } from './boardReducer';
import { zonePoint } from './boardGeometry';
import type { BoardContent, BoardToken, BoardTool, CourtPoint } from './CoachBoardScreen.types';
import { styles } from './CoachBoardScreen.styles';

type Props = {
  onClose: () => void;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TOOLS: { id: BoardTool; label: string; icon: IconName }[] = [
  { id: 'move',   label: 'Déplacer', icon: 'cursor-move' },
  { id: 'pen',    label: 'Crayon',   icon: 'pencil' },
  { id: 'arrow',  label: 'Flèche',   icon: 'arrow-top-right' },
  { id: 'eraser', label: 'Gomme',    icon: 'eraser' },
];

const TOOL_HINT: Record<BoardTool, string> = {
  move:   'Glissez un joueur · déposez-le sur le banc pour le sortir',
  pen:    'Crayon : dessinez librement sur le terrain',
  arrow:  'Flèche : glissez du départ vers l’arrivée',
  eraser: 'Gomme : touchez ou frottez un trait pour le supprimer',
};

const DRAW_COLORS: { color: string; label: string }[] = [
  { color: COLORS.courtLine, label: 'Blanc' },
  { color: COLORS.yellow,    label: 'Jaune' },
  { color: COLORS.red,       label: 'Rouge' },
  { color: COLORS.blue,      label: 'Bleu' },
];

const STROKE_WIDTHS: { width: number; label: string }[] = [
  { width: 3, label: 'Trait fin' },
  { width: 6, label: 'Trait épais' },
];

const ROLE_ABBR: Record<string, string> = {
  Passeur: 'P', R4: 'R4', Central: 'C', Pointu: 'Pt', Libero: 'L',
};

const CoachBoardScreen = ({ onClose }: Props) => {
  const { state: matchState } = useMatch();
  const { matchPlayers, format, myScore, oppScore, setNum } = matchState;
  const cfg = FORMAT_CONFIG[format];

  const { width, height } = useWindowDimensions();
  const orientation = width > height ? 'landscape' : 'portrait';

  // Rotation libre uniquement pendant le board ; le reste de l'app reste en portrait.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.unlockAsync().catch(() => undefined);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);

  // ── Pions : mon roster + adversaires génériques numérotés comme dans la saisie live ──
  const tokens: BoardToken[] = useMemo(() => {
    const mine: BoardToken[] = matchPlayers.map(p => ({
      id: p.id,
      team: 'mine',
      label: String(p.numero),
      role: ROLE_ABBR[p.tacticalRole] ?? '',
      color: getPositionColor(p.tacticalRole),
    }));
    const opp: BoardToken[] = cfg.oppFillOrder.map((_, i) => ({
      id: -(i + 1),
      team: 'opp',
      label: String(i + 1),
      role: '',
      color: COLORS.borderLight,
    }));
    return [...mine, ...opp];
  }, [matchPlayers, cfg]);

  // Positions réelles du match au moment présent.
  const livePositions = useMemo(() => {
    const positions: Record<number, CourtPoint> = {};
    matchPlayers.forEach(p => {
      if (!p.onCourt || p.pos === null) return;
      const pt = zonePoint('mine', p.pos);
      if (pt) positions[p.id] = pt;
    });
    cfg.oppFillOrder.forEach((zone, i) => {
      const pt = zonePoint('opp', zone);
      if (pt) positions[-(i + 1)] = pt;
    });
    return positions;
  }, [matchPlayers, cfg]);

  const [history, dispatch] = useReducer(
    boardReducer,
    livePositions,
    (positions): ReturnType<typeof initHistory> => initHistory({ positions, strokes: [] }),
  );
  const content = history.present;

  const [tool, setTool] = useState<BoardTool>('move');
  const [color, setColor] = useState<string>(COLORS.courtLine);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [showOpp, setShowOpp] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const commit = useCallback((next: BoardContent) => dispatch({ type: 'COMMIT', content: next }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const resetToLive = useCallback(
    () => commit({ ...content, positions: livePositions }),
    [commit, content, livePositions],
  );

  const handleClear = (choice: ClearChoice) => {
    setClearOpen(false);
    if (choice === 'strokes') commit({ ...content, strokes: [] });
    else if (choice === 'positions') commit({ ...content, positions: livePositions });
    else commit({ positions: livePositions, strokes: [] });
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const drawing = tool === 'pen' || tool === 'arrow';
  const isLandscape = orientation === 'landscape';

  // ── Petits blocs réutilisés dans les deux orientations ──
  const renderTool = (t: typeof TOOLS[number], compact: boolean) => {
    const on = tool === t.id;
    return (
      <TouchableOpacity
        key={t.id}
        style={[styles.tool, compact && styles.toolCompact, on && styles.toolOn]}
        onPress={() => setTool(t.id)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={t.label}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name={t.icon} size={compact ? 20 : 22} color={on ? COLORS.bgApp : COLORS.textSecondary} />
        {!compact && <Text style={[styles.toolText, on && styles.toolTextOn]}>{t.label}</Text>}
      </TouchableOpacity>
    );
  };

  const iconButton = (icon: IconName, label: string, onPress: () => void, disabled = false, danger = false) => (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={20} color={danger ? COLORS.redLight : COLORS.textPrimary} />
    </TouchableOpacity>
  );

  const labeledButton = (icon: IconName, label: string, onPress: () => void, opts: { on?: boolean; danger?: boolean; wide?: boolean; full?: boolean } = {}) => (
    <TouchableOpacity
      style={[styles.actionBtn, opts.wide && styles.actionBtnWide, opts.full && styles.actionBtnFull, opts.on && styles.actionBtnOn]}
      onPress={onPress}
      accessibilityState={opts.on === undefined ? undefined : { selected: opts.on }}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={opts.danger ? COLORS.redLight : opts.on ? COLORS.blue : COLORS.textPrimary}
      />
      <Text style={[styles.actionText, opts.danger && styles.actionTextDanger]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  const palette = drawing && (
    <View style={styles.palette}>
      {DRAW_COLORS.map(c => (
        <TouchableOpacity
          key={c.color}
          style={[styles.swatch, color === c.color && styles.swatchOn]}
          onPress={() => setColor(c.color)}
          accessibilityLabel={c.label}
          accessibilityState={{ selected: color === c.color }}
        >
          <View style={[styles.swatchDot, { backgroundColor: c.color }]} />
        </TouchableOpacity>
      ))}
      {!isLandscape && <View style={styles.paletteDivider} />}
      {STROKE_WIDTHS.map(w => (
        <TouchableOpacity
          key={w.width}
          style={[styles.widthBtn, strokeWidth === w.width && styles.widthBtnOn]}
          onPress={() => setStrokeWidth(w.width)}
          accessibilityLabel={w.label}
          accessibilityState={{ selected: strokeWidth === w.width }}
        >
          <View style={[styles.widthBar, { height: w.width / 1.5 }]} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const stage = (
    <BoardStage
      content={content}
      tokens={tokens}
      showOpp={showOpp}
      orientation={orientation}
      tool={tool}
      color={color}
      strokeWidth={strokeWidth}
      onChange={commit}
    />
  );

  const scoreLine = `Set ${setNum} · ${myScore} – ${oppScore}`;

  return (
    <SafeAreaView style={styles.root}>
      {isLandscape ? (
        <View style={styles.landscapeBody}>
          <View style={styles.sideTools}>
            {TOOLS.map(t => renderTool(t, true))}
            <View style={styles.sideToolsSpacer} />
            {iconButton('undo', 'Annuler', undo, !canUndo)}
            {iconButton('redo', 'Rétablir', redo, !canRedo)}
          </View>
          {stage}
          <View style={styles.sidePanel}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>SET {setNum}</Text>
              <Text style={styles.scoreValue}>
                {myScore} <Text style={styles.scoreOpp}>– {oppScore}</Text>
              </Text>
            </View>
            {palette}
            {labeledButton('account-group', 'Adversaires', () => setShowOpp(v => !v), { on: showOpp, full: true })}
            {labeledButton('restore', 'Rotation live', resetToLive, { full: true })}
            {labeledButton('delete-outline', 'Effacer…', () => setClearOpen(true), { danger: true, full: true })}
            <View style={styles.sideToolsSpacer} />
            {labeledButton('chevron-left', 'Retour match', onClose, { full: true })}
          </View>
        </View>
      ) : (
        <View style={styles.portraitBody}>
          <View style={styles.header}>
            {iconButton('chevron-left', 'Retour au match', onClose)}
            <View style={styles.headerText}>
              <Text style={styles.title}>Board</Text>
              <Text style={styles.subtitle}>{scoreLine}</Text>
            </View>
            {labeledButton('restore', 'Rotation live', resetToLive)}
          </View>
          <Text style={styles.hint}>{TOOL_HINT[tool]}</Text>
          {stage}
          {palette}
          <View style={styles.toolbar}>
            <View style={styles.toolRow}>{TOOLS.map(t => renderTool(t, false))}</View>
            <View style={styles.actionRow}>
              {iconButton('undo', 'Annuler', undo, !canUndo)}
              {iconButton('redo', 'Rétablir', redo, !canRedo)}
              {labeledButton('account-group', 'Adversaires', () => setShowOpp(v => !v), { on: showOpp, wide: true })}
              {iconButton('delete-outline', 'Effacer', () => setClearOpen(true), false, true)}
            </View>
          </View>
        </View>
      )}

      {clearOpen && (
        <BoardClearSheet
          strokeCount={content.strokes.length}
          onPick={handleClear}
          onCancel={() => setClearOpen(false)}
        />
      )}
    </SafeAreaView>
  );
};

export default CoachBoardScreen;
