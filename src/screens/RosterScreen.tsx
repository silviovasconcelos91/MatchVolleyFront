// ─────────────────────────────────────────────
//  ÉCRAN : ROSTER
//
//  Permet au coach de sélectionner les joueurs
//  pour le match (titulaires + banc + libero).
//
//  Les rôles tactiques et positions sur le terrain
//  sont configurés dans SetSetupScreen, avant
//  chaque set.
//
//  Cycle de sélection :
//    Tap 1 → titulaire (max 7)
//    Tap 2 → banc
//    Tap 3 → retiré
// ─────────────────────────────────────────────

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ScrollView,
  ListRenderItemInfo,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import type { Player } from '../data/players';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import PlayerAvatar from '../components/PlayerAvatar';

// États possibles pour un joueur dans le roster
const STATE_NONE    = 0; // non sélectionné
const STATE_BENCH   = 1; // sélectionné pour le banc
const STATE_STARTER = 2; // titulaire

type PlayerSelectionState = 0 | 1 | 2;

// ── Composant ligne joueur (mémoïsé pour éviter les re-renders inutiles) ──
type PlayerRowProps = {
  player: Player;
  state: PlayerSelectionState;
  canAdd: boolean;
  onPress: (id: number) => void;
};

const PlayerRow = memo(({ player, state, canAdd, onPress }: PlayerRowProps) => {
  const color      = getPlayerColor(player.id);
  const isStarter  = state === STATE_STARTER;
  const isBench    = state === STATE_BENCH;
  const isSelected = isStarter || isBench;

  const rowStyle = isStarter
    ? { backgroundColor: `${color}12`, borderColor: `${color}55` }
    : isBench
    ? { backgroundColor: '#ffd16608', borderColor: '#ffd16633' }
    : { backgroundColor: COLORS.bgInput, borderColor: COLORS.border };

  const renderBadge = () => {
    if (isStarter) {
      return (
        <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
          <Text style={[styles.badgeText, { color }]}>titulaire</Text>
        </View>
      );
    }
    if (isBench) {
      return (
        <View style={[styles.badge, styles.badgeBench]}>
          <Text style={styles.badgeBenchText}>banc</Text>
        </View>
      );
    }
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeNoneText}>
          {canAdd ? '+ ajouter' : 'banc uniquement'}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.playerRow, rowStyle]}
      onPress={() => onPress(player.id)}
      activeOpacity={0.7}
    >
      <PlayerAvatar
        name={player.name}
        color={isSelected ? color : '#2a4a60'}
        size={36}
      />
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, isSelected && styles.playerNameActive]}>
          {player.name}{' '}
          <Text style={styles.playerNumero}>#{player.numero}</Text>
        </Text>
        <Text style={styles.playerDetails}>
          {player.taille} · {player.age} ans
        </Text>
      </View>
      {renderBadge()}
    </TouchableOpacity>
  );
});

const RosterScreen = () => {
  const { state: matchState, actions: matchActions } = useMatch();
  const { state: teamState, actions: teamActions }   = useTeam();
  const { rosterValidated } = matchState;

  // ── Joueurs de l'équipe sélectionnée ──
  const apiPlayers: Player[] = teamState.selectedTeam?.players ?? [];

  // ── État local : sélection des joueurs ──
  const [playerStates, setPlayerStates] = useState<Record<number, PlayerSelectionState>>(() => {
    const initial: Record<number, PlayerSelectionState> = {};
    apiPlayers.forEach(p => { initial[p.id] = STATE_NONE; });
    return initial;
  });

  // ── Désignation du libero (parmi les titulaires) ──
  const [liberoStarterId, setLiberoStarterId] = useState<number | null>(null);

  // ── Getters calculés ──
  const starterIds = useMemo(
    () => Object.entries(playerStates).filter(([, s]) => s === STATE_STARTER).map(([id]) => Number(id)),
    [playerStates],
  );

  const benchIds = useMemo(
    () => Object.entries(playerStates).filter(([, s]) => s === STATE_BENCH).map(([id]) => Number(id)),
    [playerStates],
  );

  // Titulaires terrain = les titulaires hors libero
  const fieldStarterIds = useMemo(
    () => starterIds.filter(id => id !== liberoStarterId),
    [starterIds, liberoStarterId],
  );

  const starterCount      = starterIds.length;
  const fieldStarterCount = fieldStarterIds.length;

  // Valide quand 6 joueurs terrain sont sélectionnés (libero optionnel)
  const canValidate = fieldStarterCount === 6 && !rosterValidated;

  // ── Cycle de sélection d'un joueur ──
  // none → titulaire (max 7) → banc → none
  const togglePlayer = useCallback((id: number) => {
    if (rosterValidated) return;

    const cur = playerStates[id] ?? STATE_NONE;
    const currentStarters = Object.values(playerStates).filter(s => s === STATE_STARTER).length;
    const hasRoom = currentStarters < 7;

    let next: PlayerSelectionState;
    if (cur === STATE_NONE) {
      next = hasRoom ? STATE_STARTER : STATE_BENCH;
    } else if (cur === STATE_STARTER) {
      next = STATE_BENCH;
    } else {
      next = STATE_NONE;
    }

    setPlayerStates(prev => ({ ...prev, [id]: next }));

    // Si le joueur quitte les titulaires et était libero → effacer la désignation
    if (next !== STATE_STARTER && liberoStarterId === id) {
      setLiberoStarterId(null);
    }
  }, [rosterValidated, playerStates, liberoStarterId]);

  // ── Désigner / retirer le libero ──
  const toggleLibero = useCallback((id: number) => {
    setLiberoStarterId(prev => prev === id ? null : id);
  }, []);

  // ── Valider la composition ──
  const handleValidate = useCallback(() => {
    matchActions.validateRoster({
      starterIds: fieldStarterIds,
      benchIds,
      liberoId:   liberoStarterId,
      allPlayers: apiPlayers,
    });
  }, [matchActions, fieldStarterIds, benchIds, liberoStarterId, apiPlayers]);

  // ── Changer d'équipe (réinitialise tout le match) ──
  const handleChangeTeam = useCallback(() => {
    matchActions.resetMatch();
    teamActions.clearTeam();
  }, [matchActions, teamActions]);

  // ── Rendu d'un joueur dans la liste ──
  const renderPlayer = useCallback(({ item: player }: ListRenderItemInfo<Player>) => (
    <PlayerRow
      player={player}
      state={playerStates[player.id] ?? STATE_NONE}
      canAdd={starterCount < 7}
      onPress={togglePlayer}
    />
  ), [playerStates, starterCount, togglePlayer]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Légende ── */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          Tap 1 → <Text style={{ color: COLORS.blue }}>titulaire</Text>
          {'  ·  '}
          Tap 2 → <Text style={{ color: COLORS.yellow }}>banc</Text>
          {'  ·  '}
          Tap 3 → retire{'  ·  '}
          <Text style={{ color: COLORS.blue }}>6 titulaires</Text>
          {' minimum · '}
          <Text style={{ color: COLORS.yellow }}>libero optionnel</Text>
          {'\n'}
          Rôles et positions configurés au début de chaque set
        </Text>
      </View>

      {/* ── Chips des titulaires sélectionnés ── */}
      <View style={styles.startersSection}>
        <Text style={styles.sectionLabel}>
          TITULAIRES{' '}
          <Text style={{ color: COLORS.blue }}>{starterCount}/7</Text>
        </Text>

        <View style={styles.startersChips}>
          {starterCount === 0 ? (
            <Text style={styles.startersEmpty}>
              Aucun — sélectionner des joueurs ci-dessous
            </Text>
          ) : (
            starterIds.map(id => {
              const player = apiPlayers.find(p => p.id === id);
              if (!player) return null;
              const color = getPlayerColor(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.chip, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}
                  onPress={() => togglePlayer(id)}
                >
                  <Text style={[styles.chipText, { color }]}>
                    {player.name.split(' ')[0]} #{player.numero}
                  </Text>
                  <Text style={[styles.chipRemove, { color: `${color}88` }]}>×</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* ── Désignation du libero (visible dès que des titulaires sont sélectionnés) ── */}
      {starterCount > 0 && (
        <View style={styles.liberoSection}>
          <Text style={styles.sectionLabel}>
            LIBERO{' '}
            <Text style={{ color: COLORS.textDark }}>(optionnel)</Text>
            {'  ·  '}
            {liberoStarterId !== null ? (
              <Text style={{ color: COLORS.yellow }}>
                {apiPlayers.find(p => p.id === liberoStarterId)?.name.split(' ')[0] ?? '—'} désigné
              </Text>
            ) : (
              <Text style={{ color: COLORS.textDark }}>tap un titulaire pour désigner</Text>
            )}
          </Text>

          <View style={styles.startersChips}>
            {starterIds.map(id => {
              const player = apiPlayers.find(p => p.id === id);
              if (!player) return null;
              const isLibero = id === liberoStarterId;
              const color    = getPlayerColor(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.chip,
                    isLibero
                      ? styles.chipLibero
                      : { backgroundColor: `${color}14`, borderColor: `${color}44` },
                  ]}
                  onPress={() => toggleLibero(id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.chipText,
                    { color: isLibero ? COLORS.yellow : COLORS.textMuted },
                  ]}>
                    {player.name.split(' ')[0]} #{player.numero}
                  </Text>
                  {isLibero && (
                    <View style={styles.liberoBadge}>
                      <Text style={styles.liberoBadgeText}>L</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {starterCount === 7 && liberoStarterId === null && (
            <Text style={styles.liberoHint}>
              7 titulaires sélectionnés — désigne le libero ou retire un joueur
            </Text>
          )}
        </View>
      )}

      {/* ── Liste des joueurs disponibles ── */}
      <Text style={styles.sectionLabel}>
        JOUEURS DISPONIBLES{'  '}
        <Text style={{ color: COLORS.yellow }}>
          {starterCount + benchIds.length} sélectionnés
        </Text>
      </Text>

      <FlatList<Player>
        data={apiPlayers}
        keyExtractor={item => String(item.id)}
        renderItem={renderPlayer}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
      />

      {/* ── Bouton valider ── */}
      {canValidate && (
        <TouchableOpacity style={styles.validateBtn} onPress={handleValidate}>
          <Text style={styles.validateBtnText}>Confirmer la sélection →</Text>
        </TouchableOpacity>
      )}

      {/* ── Message équipe déjà validée ── */}
      {rosterValidated && (
        <View style={styles.validatedMsg}>
          <Text style={styles.validatedText}>Équipe validée ✓</Text>
          <TouchableOpacity onPress={matchActions.resetRoster}>
            <Text style={styles.resetText}>Modifier la sélection</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Changer d'équipe ── */}
      <TouchableOpacity style={styles.changeTeamBtn} onPress={handleChangeTeam}>
        <Text style={styles.changeTeamText}>← Changer d'équipe</Text>
      </TouchableOpacity>

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

  // Légende
  legend: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  legendText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // Section titulaires
  startersSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  startersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    minHeight: 30,
  },
  startersEmpty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    paddingVertical: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  chipRemove: {
    fontSize: FONT_SIZE.lg,
  },

  // Section libero
  liberoSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chipLibero: {
    backgroundColor: '#ffd16622',
    borderColor: '#ffd16666',
    borderWidth: 1.5,
  },
  liberoBadge: {
    backgroundColor: COLORS.yellow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liberoBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.bgApp,
  },
  liberoHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.yellow,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Ligne joueur
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm + 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  playerNameActive: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  playerNumero: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
  },
  playerDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Badges
  badge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
  },
  badgeBench: {
    backgroundColor: '#ffd16622',
    borderColor: '#ffd16644',
  },
  badgeBenchText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.yellow,
  },
  badgeNoneText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },

  // Bouton valider
  validateBtn: {
    backgroundColor: COLORS.yellow,
    borderRadius: RADIUS.lg,
    padding: 11,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  validateBtnText: {
    color: COLORS.bgApp,
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
  },

  // Message équipe validée
  validatedMsg: {
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}44`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  validatedText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.greenLight,
    fontWeight: '500',
  },
  resetText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },

  // Bouton changer d'équipe
  changeTeamBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  changeTeamText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});

export default RosterScreen;