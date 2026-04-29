// ─────────────────────────────────────────────
//  ÉCRAN : TERRAIN
//
//  Flux : sélectionner une action → taper le joueur concerné.
//
//  Postes affichés :
//    [P4] [P3] [P2]   ← proche du filet
//    [P5] [P6] [P1]   ← zone service
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import type { MatchPlayer } from '../context/MatchContext';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { COURT_DISPLAY_ORDER } from '../data/players';
import { getTotalPoints, getTotalFaults } from '../data/players';
import type { ActionKey } from '../data/players';
import PlayerAvatar from '../components/PlayerAvatar';

const BACK_ROW = new Set([1, 5, 6]);

const POINT_ACTIONS: ActionKey[]  = ['pt', 'atk', 'block', 'ace'];
const FAULT_ACTIONS: ActionKey[]  = ['atk_out', 'srv_out', 'recv'];

const ACTION_LABELS: Record<ActionKey, string> = {
  pt:      'Point',
  atk:     'Attaque',
  block:   'Contre',
  ace:     'Ace',
  atk_out: 'Attaque raté',
  srv_out: 'Service raté',
  recv:    'Réception ratée',
};

const CourtScreen = () => {
  const { state, actions } = useMatch();
  const { matchPlayers, setBannerVisible, rosterValidated, liberoId } = state;

  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);

  const disabled = !rosterValidated || setBannerVisible;
  const courtPlayers = matchPlayers.filter(p => p.onCourt);

  // ── Libero ──
  const liberoPlayer     = liberoId !== null ? matchPlayers.find(p => p.id === liberoId) : null;
  const liberoOnCourt    = liberoPlayer?.onCourt ?? false;
  const centralInBackRow = !liberoOnCourt
    ? matchPlayers.find(p => p.onCourt && p.tacticalRole === 'Central' && p.pos !== null && BACK_ROW.has(p.pos))
    : null;
  // ID du joueur dont la cellule affiche le bouton swap
  const liberoSwapTargetId = liberoOnCourt
    ? liberoPlayer?.id
    : centralInBackRow?.id;


  const selectAction = (key: ActionKey) => {
    if (setBannerVisible || !rosterValidated) return;
    setSelectedAction(prev => (prev === key ? null : key));
  };

  const handlePlayerTap = (player: MatchPlayer) => {
    if (setBannerVisible || !rosterValidated) return;
    if (!selectedAction) return;
    actions.playerAction({ playerId: player.id, actionKey: selectedAction });
    setSelectedAction(null);
  };

  // ── Rendu d'une case du terrain ──
  const renderCourtCell = (pos: number) => {
    const player = courtPlayers.find(p => p.pos === pos);
    const isWaiting = selectedAction !== null;

    if (!player) {
      return (
        <View key={pos} style={styles.cellEmpty}>
          <Text style={styles.cellEmptyText}>P{pos}</Text>
        </View>
      );
    }

    const color = getPlayerColor(player.id);
    const totalPts    = getTotalPoints(player.stats);
    const totalFaults = getTotalFaults(player.stats);
    const showLiberoBtn = !!liberoPlayer && player.id === liberoSwapTargetId && !disabled;

    return (
      <TouchableOpacity
        key={pos}
        style={[
          styles.cell,
          {
            borderColor: isWaiting ? color : COLORS.border,
            borderWidth: isWaiting ? 1.5 : 1,
            backgroundColor: isWaiting ? `${color}22` : COLORS.bgInput,
          },
        ]}
        onPress={() => handlePlayerTap(player)}
        activeOpacity={isWaiting ? 0.6 : 1}
      >
        <PlayerAvatar name={player.name} color={color} size={28} />
        <Text style={styles.cellName} numberOfLines={1}>
          {player.name.split(' ')[0]}
        </Text>
        <Text style={styles.cellStats}>
          <Text style={{ color }}>{totalPts}p</Text>
          <Text style={styles.cellStatsDot}> · </Text>
          <Text style={styles.cellFaults}>{totalFaults}f</Text>
        </Text>
        <Text style={styles.cellPos}>
          {player.tacticalRole ? `${player.tacticalRole} · ` : ''}P{pos}
        </Text>

        {showLiberoBtn && (
          <TouchableOpacity
            style={styles.liberoCellBtn}
            onPress={actions.liberoSwap}
            activeOpacity={0.6}
          >
            <Text style={styles.liberoCellBtnText}>🔄</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (!rosterValidated) {
    return (
      <View style={styles.notReadyContainer}>
        <Text style={styles.notReadyText}>
          Valider l'équipe dans l'onglet Roster pour accéder au terrain.
        </Text>
      </View>
    );
  }

  const actionHint = selectedAction
    ? `→ Tap le joueur concerné`
    : 'Choisis une action ci-dessous';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Terrain ── */}
      <View style={styles.courtWrapper}>
        <View style={styles.netRow}>
          <View style={styles.net} />
          <Text style={styles.netLabel}>FILET</Text>
        </View>
        <View style={styles.courtGrid}>
          {COURT_DISPLAY_ORDER.map(pos => renderCourtCell(pos))}
        </View>
        <View style={styles.baseline} />
      </View>


      {/* ── Panel d'actions ── */}
      <View style={styles.actionPanel}>

        {/* ── MON ÉQUIPE ── */}
        <Text style={styles.groupLabel}>MON ÉQUIPE</Text>

        {/* Hint sélection joueur */}
        <View style={styles.actionPanelHeader}>
          <Text style={styles.actionPanelHint}>{actionHint}</Text>
          {selectedAction && (
            <TouchableOpacity onPress={() => setSelectedAction(null)}>
              <Text style={styles.cancelSelectionBtn}>✕ Désélectionner</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* POINTS */}
        <Text style={styles.groupLabelSub}>POINTS — +1 mon équipe</Text>
        <View style={styles.actionsGrid}>
          {POINT_ACTIONS.map(key => {
            const active = selectedAction === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.btnPoint, active && styles.btnPointActive]}
                onPress={() => selectAction(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnPointText, active && styles.btnActiveText]}>
                  {ACTION_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAUTES */}
        <Text style={[styles.groupLabelSub, styles.groupLabelFault]}>FAUTES — +1 adversaire</Text>
        <View style={styles.actionsGrid}>
          {FAULT_ACTIONS.map(key => {
            const active = selectedAction === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.btnFault, active && styles.btnFaultActive]}
                onPress={() => selectAction(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnFaultText, active && styles.btnActiveText]}>
                  {ACTION_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rotation — bas de la section équipe */}
        <TouchableOpacity
          style={[styles.btnRotation, disabled && styles.btnDisabled]}
          onPress={actions.rotate}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.btnRotationText}>↻ Rotation</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* ── ADVERSAIRE (compact) ── */}
        <Text style={styles.groupLabelSmall}>ADVERSAIRE</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.btnOppFault, disabled && styles.btnDisabled]}
            onPress={actions.oppFault}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.btnOppFaultText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOppScore, disabled && styles.btnDisabled]}
            onPress={actions.oppScore}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.btnOppScoreText}>+1</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  notReadyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  notReadyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  courtWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },

  netRow: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  net: {
    height: 3,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  netLabel: {
    position: 'absolute',
    right: 0,
    top: -12,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  courtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },

  cell: {
    width: '31.5%',
    minHeight: 72,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 3,
    position: 'relative',
  },

  liberoCellBtn: {
    position: 'absolute',
    top: 3,
    right: 4,
  },
  liberoCellBtnText: {
    fontSize: 11,
  },
  cellEmpty: {
    width: '31.5%',
    minHeight: 72,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmptyText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  cellName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    maxWidth: '90%',
  },
  cellStats: {
    fontSize: FONT_SIZE.sm,
  },
  cellStatsDot: {
    color: COLORS.textMuted,
  },
  cellFaults: {
    color: COLORS.redLight,
  },
  cellPos: {
    fontSize: 8,
    color: COLORS.textDark,
  },

  baseline: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
  },


  // Panel d'actions
  actionPanel: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },

  actionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  actionPanelHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  cancelSelectionBtn: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.redLight,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },

  btnOppFault: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: `${COLORS.green}18`,
    borderWidth: 1,
    borderColor: `${COLORS.green}33`,
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    alignItems: 'center',
  },
  btnRotation: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  btnRotationText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  btnDisabled: {
    opacity: 0.4,
  },

  groupLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  groupLabelSmall: {
    fontSize: 10,
    color: COLORS.textDark,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  groupLabelSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.greenLight,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  groupLabelFault: {
    color: COLORS.redLight,
    marginTop: SPACING.md,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },

  btnPoint: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}44`,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  btnPointActive: {
    backgroundColor: `${COLORS.green}55`,
    borderColor: COLORS.green,
  },
  btnPointText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.greenLight,
  },
  btnFault: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}44`,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  btnFaultActive: {
    backgroundColor: `${COLORS.red}55`,
    borderColor: COLORS.red,
  },
  btnFaultText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.redLight,
  },
  btnActiveText: {
    fontWeight: '700',
  },
  btnOppFaultText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.greenLight,
  },
  btnOppScore: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: `${COLORS.red}18`,
    borderWidth: 1,
    borderColor: `${COLORS.red}33`,
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    alignItems: 'center',
  },
  btnOppScoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.redLight,
  },
});

export default CourtScreen;
