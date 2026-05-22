// ─────────────────────────────────────────────
//  ÉCRAN : REMPLACEMENTS
//
//  Flux en 2 étapes :
//    ① Choisir le joueur qui sort du terrain
//    ② Choisir le joueur qui entre du banc
//    → Confirmation avant de valider
//
//  L'historique des remplacements s'affiche
//  en bas avec le score au moment du changement.
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import type { MatchPlayer, SubEntry } from '../context/MatchContext';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { getTotalPoints } from '../data/players';
import PlayerAvatar from '../components/PlayerAvatar';

const SubstitutionScreen = () => {
  const { state, actions } = useMatch();
  const { matchPlayers, subHistory, rosterValidated, availableLiberoIds, liberoReplacements, substitutionPairs } = state;

  const [outPlayer, setOutPlayer] = useState<MatchPlayer | null>(null);
  const [inPlayer, setInPlayer]   = useState<MatchPlayer | null>(null);

  // Exclure du terrain : libero actuellement actif + central qu'il remplace
  // Les deux ont onCourt:true → exclus naturellement du banc
  const liberoOnCourtIds   = new Set(Object.keys(liberoReplacements).map(Number));
  const replacedByLiberoIds = new Set(Object.values(liberoReplacements));
  const courtExcluded = new Set([...liberoOnCourtIds, ...replacedByLiberoIds]);

  const liberoIds = new Set(availableLiberoIds);
  const courtPlayers    = matchPlayers.filter(p =>  p.onCourt && !courtExcluded.has(p.id));
  const allBenchPlayers = matchPlayers.filter(p => !p.onCourt && !liberoIds.has(p.id));
  // Banc filtré selon la règle : un joueur sorti ne peut rentrer qu'à la place de son remplaçant
  const benchPlayers = outPlayer
    ? allBenchPlayers.filter(p => {
        const mustReplace = substitutionPairs[p.id];
        return mustReplace === undefined || mustReplace === outPlayer.id;
      })
    : allBenchPlayers;

  // ── Étape 1 : sélectionner le joueur sortant ──
  const handleSelectOut = (player: MatchPlayer) => {
    setOutPlayer(player);
    setInPlayer(null); // réinitialiser si on change de sortant
  };

  // ── Étape 2 : sélectionner le joueur entrant ──
  const handleSelectIn = (player: MatchPlayer) => {
    setInPlayer(player);
  };

  // ── Annuler et revenir à l'étape 1 ──
  const handleCancel = () => {
    setOutPlayer(null);
    setInPlayer(null);
  };

  // ── Confirmer le remplacement ──
  const handleConfirm = () => {
    if (!outPlayer || !inPlayer) return;
    actions.confirmSub({ outId: outPlayer.id, inId: inPlayer.id });
    // Réinitialiser le flux
    setOutPlayer(null);
    setInPlayer(null);
  };

  // ── Rendu d'une ligne joueur cliquable ──
  const renderPlayerRow = (player: MatchPlayer, onPress: (p: MatchPlayer) => void, badge: React.ReactNode = null) => {
    const color = getPlayerColor(player.id);
    return (
      <TouchableOpacity
        key={player.id}
        style={styles.playerRow}
        onPress={() => onPress(player)}
        activeOpacity={0.7}
      >
        <PlayerAvatar name={player.name} color={color} size={32} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerRole}>
            {player.tacticalRole}{player.pos ? ` · P${player.pos}` : ''}
          </Text>
        </View>
        {/* Badge optionnel (ex: points) */}
        {badge || (
          <Text style={styles.playerPts}>{getTotalPoints(player.stats)} pts</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (!rosterValidated) {
    return (
      <View style={styles.notReady}>
        <Text style={styles.notReadyText}>
          Valider l'équipe dans l'onglet Roster pour gérer les remplacements.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ──────────────────────────────────── */}
      {/*  ÉTAPE 1 : choisir le sortant        */}
      {/* ──────────────────────────────────── */}
      {!outPlayer && (
        <>
          <Text style={styles.stepLabel}>① Joueur sortant (terrain)</Text>
          {courtPlayers.map(p => renderPlayerRow(p, handleSelectOut))}
        </>
      )}

      {/* ──────────────────────────────────── */}
      {/*  ÉTAPE 2 : choisir l'entrant         */}
      {/* ──────────────────────────────────── */}
      {outPlayer && !inPlayer && (
        <>
          {/* Chip du joueur sortant */}
          <View style={styles.outChipRow}>
            <View style={styles.outChip}>
              <PlayerAvatar
                name={outPlayer.name}
                color={getPlayerColor(outPlayer.id)}
                size={26}
              />
              <View>
                <Text style={styles.outChipName}>{outPlayer.name}</Text>
                <Text style={styles.outChipLabel}>sort du terrain</Text>
              </View>
            </View>

            <Text style={styles.arrowText}>→</Text>

            {/* Placeholder pour le joueur entrant */}
            <View style={styles.inChipPlaceholder}>
              <Text style={styles.inChipPlaceholderText}>choisir ci-dessous</Text>
            </View>
          </View>

          <Text style={styles.stepLabel}>② Joueur entrant (banc)</Text>

          {benchPlayers.length === 0 ? (
            <Text style={styles.emptyBench}>Banc vide</Text>
          ) : (
            benchPlayers.map(p => renderPlayerRow(p, handleSelectIn))
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ──────────────────────────────────── */}
      {/*  CONFIRMATION                        */}
      {/* ──────────────────────────────────── */}
      {outPlayer && inPlayer && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>
            {inPlayer.name} remplace {outPlayer.name}
          </Text>
          <Text style={styles.confirmSub}>
            Poste {outPlayer.pos} · Le score ne change pas
          </Text>

          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.cancelBtn2} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ──────────────────────────────────── */}
      {/*  HISTORIQUE DES REMPLACEMENTS        */}
      {/* ──────────────────────────────────── */}
      <Text style={[styles.stepLabel, { marginTop: SPACING.xl }]}>
        REMPLACEMENTS EFFECTUÉS
      </Text>

      {subHistory.length === 0 ? (
        <Text style={styles.emptyHistory}>Aucun remplacement pour l'instant</Text>
      ) : (
        subHistory.map((entry: SubEntry, index: number) => (
          <View key={index} style={styles.historyRow}>
            {/* Joueur sortant */}
            <Text style={styles.historyOut}>{entry.outName}</Text>
            <Text style={styles.historyArrow}>→</Text>
            {/* Joueur entrant */}
            <Text style={styles.historyIn}>{entry.inName}</Text>
            {/* Score au moment du changement */}
            <Text style={styles.historyScore}>{entry.score}</Text>
          </View>
        ))
      )}

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

  notReady: {
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

  // Labels d'étape
  stepLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Ligne joueur cliquable
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm + 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    marginBottom: SPACING.sm,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playerRole: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  playerPts: {
    fontSize: FONT_SIZE.md,
    color: COLORS.blue,
  },

  // Chip du joueur sortant
  outChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  outChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.red}15`,
    borderWidth: 1,
    borderColor: `${COLORS.red}44`,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  outChipName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.redLight,
  },
  outChipLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  arrowText: {
    fontSize: 18,
    color: COLORS.textDark,
  },
  inChipPlaceholder: {
    flex: 1,
    backgroundColor: `${COLORS.green}15`,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${COLORS.green}44`,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  inChipPlaceholderText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.greenLight,
  },

  emptyBench: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: SPACING.md,
  },

  // Bouton annuler
  cancelBtn: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },

  // Boîte de confirmation
  confirmBox: {
    backgroundColor: `${COLORS.green}15`,
    borderWidth: 1,
    borderColor: `${COLORS.green}44`,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  confirmTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.greenLight,
  },
  confirmSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  cancelBtn2: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },

  // Historique
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyOut: {
    fontSize: FONT_SIZE.md,
    color: COLORS.redLight,
    flex: 1,
  },
  historyArrow: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textDark,
  },
  historyIn: {
    fontSize: FONT_SIZE.md,
    color: COLORS.greenLight,
    flex: 1,
  },
  historyScore: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
  },

  emptyHistory: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textDark,
    paddingVertical: SPACING.sm,
  },
});

export default SubstitutionScreen;