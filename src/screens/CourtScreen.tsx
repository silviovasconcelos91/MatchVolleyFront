// ─────────────────────────────────────────────
//  ÉCRAN : TERRAIN
//
//  Affiche les 6 joueurs placés sur leurs postes
//  (grille 3×2). Un tap sur un joueur ouvre
//  le panneau d'actions (7 boutons).
//
//  Postes affichés :
//    [P4] [P3] [P2]   ← proche du filet
//    [P5] [P6] [P1]   ← zone service
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal,
} from 'react-native';
import { useMatch, PLAYER_ACTIONS } from '../context/MatchContext';
import type { MatchPlayer } from '../context/MatchContext';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { COURT_DISPLAY_ORDER } from '../data/players';
import { getTotalPoints, getTotalFaults } from '../data/players';
import type { ActionKey } from '../data/players';
import PlayerAvatar from '../components/PlayerAvatar';

const BACK_ROW = new Set([1, 5, 6]);

const CourtScreen = () => {
  const { state, actions } = useMatch();
  const { matchPlayers, setBannerVisible, rosterValidated, liberoId, liberoReplacedId } = state;

  // Joueur actuellement sélectionné pour afficher le panneau d'actions
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  // Joueurs actuellement sur le terrain (onCourt = true)
  const courtPlayers = matchPlayers.filter(p => p.onCourt);

  // ── Infos libero ──
  const liberoPlayer     = liberoId !== null ? matchPlayers.find(p => p.id === liberoId) : null;
  const liberoOnCourt    = liberoPlayer?.onCourt ?? false;
  // Bouton actif si : libero en jeu (peut sortir) OU un central est en zone arrière
  const centralInBackRow = !liberoOnCourt && matchPlayers.find(
    p => p.onCourt && p.tacticalRole === 'Central' && p.pos !== null && BACK_ROW.has(p.pos)
  );
  const canSwapLibero = liberoPlayer !== undefined && (liberoOnCourt || !!centralInBackRow);

  // Fermer le panneau d'actions
  const closePanel = () => setSelectedPlayer(null);

  // Ouvrir le panneau pour un joueur donné
  const openPanel = (player: MatchPlayer) => {
    if (setBannerVisible || !rosterValidated) return; // bloqué pendant fin de set
    setSelectedPlayer(player);
  };

  // Déclencher une action joueur et mettre à jour l'état sélectionné
  const handleAction = (actionKey: ActionKey) => {
    if (!selectedPlayer) return;
    actions.playerAction({ playerId: selectedPlayer.id, actionKey });
    // Mettre à jour la référence locale après l'action
    // (les stats sont dans le state global, pas besoin de fermer le panel)
  };

  // ── Rendu d'une case du terrain ──
  const renderCourtCell = (pos: number) => {
    const player = courtPlayers.find(p => p.pos === pos);
    const isSelected = selectedPlayer && player && selectedPlayer.id === player.id;

    if (!player) {
      // Case vide (ne devrait pas arriver si l'équipe est validée)
      return (
        <View key={pos} style={styles.cellEmpty}>
          <Text style={styles.cellEmptyText}>P{pos}</Text>
        </View>
      );
    }

    const color = getPlayerColor(player.id);
    const totalPts   = getTotalPoints(player.stats);
    const totalFaults = getTotalFaults(player.stats);

    return (
      <TouchableOpacity
        key={pos}
        style={[
          styles.cell,
          {
            borderColor: isSelected ? color : COLORS.border,
            borderWidth: isSelected ? 1.5 : 1,
            backgroundColor: isSelected ? `${color}18` : COLORS.bgInput,
          },
        ]}
        onPress={() => openPanel(player)}
        activeOpacity={0.7}
      >
        {/* Avatar avec initiales */}
        <PlayerAvatar name={player.name} color={color} size={28} />

        {/* Prénom */}
        <Text style={styles.cellName} numberOfLines={1}>
          {player.name.split(' ')[0]}
        </Text>

        {/* Points + fautes */}
        <Text style={styles.cellStats}>
          <Text style={{ color }}>{totalPts}p</Text>
          <Text style={styles.cellStatsDot}> · </Text>
          <Text style={styles.cellFaults}>{totalFaults}f</Text>
        </Text>

        {/* Rôle tactique + numéro de poste */}
        <Text style={styles.cellPos}>
          {player.tacticalRole ? `${player.tacticalRole} · ` : ''}P{pos}
        </Text>
      </TouchableOpacity>
    );
  };

  // Message si l'équipe n'est pas encore validée
  if (!rosterValidated) {
    return (
      <View style={styles.notReadyContainer}>
        <Text style={styles.notReadyText}>
          Valider l'équipe dans l'onglet Roster pour accéder au terrain.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Titre ── */}
      <Text style={styles.sectionLabel}>TERRAIN · tap pour actions</Text>

      {/* ── Terrain ── */}
      <View style={styles.courtWrapper}>

        {/* Filet (en haut) */}
        <View style={styles.netRow}>
          <View style={styles.net} />
          <Text style={styles.netLabel}>FILET</Text>
        </View>

        {/* Grille 3×2 */}
        <View style={styles.courtGrid}>
          {COURT_DISPLAY_ORDER.map(pos => renderCourtCell(pos))}
        </View>

        {/* Ligne de fond de terrain */}
        <View style={styles.baseline} />
      </View>

      {/* ── Bouton échange libero / centrale ── */}
      {liberoPlayer && (
        <TouchableOpacity
          style={[styles.liberoBtn, !canSwapLibero && styles.liberoDisabled]}
          onPress={() => canSwapLibero && actions.liberoSwap()}
          activeOpacity={canSwapLibero ? 0.7 : 1}
        >
          <View style={styles.liberoLeft}>
            <Text style={styles.liberoIcon}>🔄</Text>
            <View>
              <Text style={styles.liberoTitle}>
                {liberoOnCourt ? 'Faire sortir le libero' : 'Faire rentrer le libero'}
              </Text>
              <Text style={styles.liberoSub}>
                {liberoPlayer.name}
                {!canSwapLibero ? '  ·  aucun central en zone arrière' : ''}
                {liberoOnCourt && liberoReplacedId !== null
                  ? `  ·  remplace ${matchPlayers.find(p => p.id === liberoReplacedId)?.name ?? ''}`
                  : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.liberoBadge, liberoOnCourt && styles.liberoBadgeActive]}>
            <Text style={[styles.liberoBadgeText, liberoOnCourt && styles.liberoBadgeTextActive]}>
              {liberoOnCourt ? 'EN JEU' : 'BANC'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Panneau d'actions (Modal) ── */}
      <Modal
        visible={!!selectedPlayer}
        transparent
        animationType="slide"
        onRequestClose={closePanel}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closePanel}
        >
          {/* Empêcher la fermeture en touchant le panneau lui-même */}
          <TouchableOpacity
            style={styles.actionPanel}
            activeOpacity={1}
            onPress={() => {}} // absorber les taps
          >
            {selectedPlayer && (
              <>
                {/* ── En-tête : avatar + nom + poste ── */}
                <View style={styles.panelHeader}>
                  <View style={styles.panelHeaderLeft}>
                    <PlayerAvatar
                      name={selectedPlayer.name}
                      color={getPlayerColor(selectedPlayer.id)}
                      size={30}
                    />
                    <View>
                      <Text style={styles.panelName}>{selectedPlayer.name}</Text>
                      <Text style={styles.panelRole}>
                        {selectedPlayer.tacticalRole || selectedPlayer.role} · Poste {selectedPlayer.pos}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closePanel}>
                    <Text style={styles.panelClose}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Boutons POINTS (+1 mon équipe) ── */}
                <Text style={styles.panelGroupLabel}>POINTS — +1 mon équipe</Text>
                <View style={styles.actionsGrid}>
                  {(['pt', 'atk', 'block', 'ace'] as ActionKey[]).map(key => (
                    <TouchableOpacity
                      key={key}
                      style={styles.btnPoint}
                      onPress={() => handleAction(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnPointText}>
                        {PLAYER_ACTIONS[key].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Boutons FAUTES (+1 adversaire) ── */}
                <Text style={[styles.panelGroupLabel, { color: COLORS.redLight, marginTop: SPACING.md }]}>
                  FAUTES — +1 adversaire
                </Text>
                <View style={styles.actionsGrid}>
                  {(['atk_out', 'srv_out'] as ActionKey[]).map(key => (
                    <TouchableOpacity
                      key={key}
                      style={styles.btnFault}
                      onPress={() => handleAction(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnFaultText}>
                        {PLAYER_ACTIONS[key].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Réception ratée prend toute la largeur */}
                <TouchableOpacity
                  style={[styles.btnFault, { marginTop: SPACING.xs }]}
                  onPress={() => handleAction('recv')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnFaultText}>
                    {PLAYER_ACTIONS['recv'].label}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

  // Message équipe non validée
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

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Wrapper du terrain
  courtWrapper: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },

  // Filet
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

  // Grille 3 colonnes
  courtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },

  // Cellule joueur (1/3 de largeur moins gap)
  cell: {
    width: '31.5%',          // ~3 colonnes avec gaps
    minHeight: 72,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 3,
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

  // Ligne de fond de terrain
  baseline: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
  },

  // Bouton libero
  liberoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.blue + '44',
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  liberoDisabled: {
    opacity: 0.4,
    borderColor: COLORS.border,
  },
  liberoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  liberoIcon: {
    fontSize: 20,
  },
  liberoTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  liberoSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  liberoBadge: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  liberoBadgeActive: {
    backgroundColor: COLORS.blue + '22',
    borderColor: COLORS.blue + '55',
  },
  liberoBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  liberoBadgeTextActive: {
    color: COLORS.blue,
  },

  // Modal / panneau d'actions
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionPanel: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl + SPACING.lg, // espace pour l'indicateur home iOS
  },

  // En-tête du panneau
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  panelName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  panelRole: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  panelClose: {
    fontSize: 22,
    color: COLORS.textMuted,
    lineHeight: 26,
  },

  // Label de groupe (POINTS / FAUTES)
  panelGroupLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.greenLight,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Grille 2 colonnes pour les boutons d'action
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },

  // Bouton point (vert)
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
  btnPointText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.greenLight,
  },

  // Bouton faute (rouge)
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
  btnFaultText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.redLight,
  },
});

export default CourtScreen;