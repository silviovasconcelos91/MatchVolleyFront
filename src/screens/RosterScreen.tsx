import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ListRenderItemInfo,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import type { Player } from '../data/players';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import PlayerAvatar from '../components/PlayerAvatar';

type PlayerState = 'none' | 'terrain' | 'banc' | 'libero';

type PlayerRowProps = {
  player: Player;
  state: PlayerState;
  canAddTerrain: boolean;
  canAddLibero: boolean;
  liberoLocked: boolean;
  onSelect: (id: number, next: PlayerState) => void;
};

const PlayerRow = memo(({ player, state, canAddTerrain, canAddLibero, liberoLocked, onSelect }: PlayerRowProps) => {
  const color     = getPlayerColor(player.id);
  const isTerrain = state === 'terrain';
  const isBanc    = state === 'banc';
  const isLibero  = state === 'libero';

  // After validation: all locked. Before: can add up to 2, remove freely
  const liberoDisabled = liberoLocked;

  const rowStyle = isTerrain
    ? { backgroundColor: `${color}12`, borderColor: `${color}44` }
    : isLibero
    ? { backgroundColor: `${COLORS.yellow}0e`, borderColor: `${COLORS.yellow}33` }
    : isBanc
    ? { backgroundColor: `${COLORS.textMuted}08`, borderColor: COLORS.border }
    : { backgroundColor: COLORS.bgInput, borderColor: COLORS.border };

  return (
    <View style={[styles.playerRow, rowStyle]}>
      <PlayerAvatar
        name={player.name}
        color={state !== 'none' ? color : '#2a4a60'}
        size={34}
      />
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, state !== 'none' && styles.playerNameActive]}>
          {player.name}{' '}
          <Text style={styles.playerNumero}>#{player.numero}</Text>
        </Text>
        <Text style={styles.playerDetails}>{player.taille} · {player.age} ans</Text>
      </View>

      <View style={styles.btnGroup}>
        <TouchableOpacity
          style={[styles.stateBtn, isTerrain && styles.stateBtnTerrain]}
          onPress={() => onSelect(player.id, isTerrain ? 'none' : 'terrain')}
          disabled={!isTerrain && !canAddTerrain}
          activeOpacity={0.7}
        >
          <Text style={[styles.stateBtnText, isTerrain && { color: color, fontWeight: '600' }]}>
            Terrain
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stateBtn, isBanc && styles.stateBtnBanc]}
          onPress={() => onSelect(player.id, isBanc ? 'none' : 'banc')}
          activeOpacity={0.7}
        >
          <Text style={[styles.stateBtnText, isBanc && styles.stateBtnTextBanc]}>Banc</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stateBtn, isLibero && styles.stateBtnLibero, liberoDisabled && styles.stateBtnLocked]}
          onPress={() => onSelect(player.id, isLibero ? 'none' : 'libero')}
          disabled={liberoDisabled || (!isLibero && !canAddLibero)}
          activeOpacity={0.7}
        >
          <Text style={[styles.stateBtnText, isLibero && styles.stateBtnTextLibero]}>Libero</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

type Props = { onClose?: () => void };

const RosterScreen = ({ onClose }: Props) => {
  const { state: matchState, actions: matchActions } = useMatch();
  const { state: teamState, actions: teamActions }   = useTeam();
  const { rosterValidated } = matchState;

  const apiPlayers: Player[] = teamState.selectedTeam?.players ?? [];

  const [playerStates, setPlayerStates] = useState<Record<number, PlayerState>>(() => {
    const init: Record<number, PlayerState> = {};
    apiPlayers.forEach(p => { init[p.id] = 'none'; });
    return init;
  });

  const terrainIds = useMemo(
    () => Object.entries(playerStates).filter(([, s]) => s === 'terrain').map(([id]) => Number(id)),
    [playerStates],
  );
  const benchIds = useMemo(
    () => Object.entries(playerStates).filter(([, s]) => s === 'banc').map(([id]) => Number(id)),
    [playerStates],
  );
  const liberoIds = useMemo(
    () => Object.entries(playerStates).filter(([, s]) => s === 'libero').map(([id]) => Number(id)),
    [playerStates],
  );

  const terrainCount = terrainIds.length;
  const liberoCount  = liberoIds.length;
  // Locked once roster confirmed — free changes before that
  const liberoLocked  = rosterValidated;
  const canAddLibero  = !rosterValidated && liberoCount < 2;
  const canValidate   = terrainCount === 6 && !rosterValidated;

  const handleSelect = useCallback((id: number, next: PlayerState) => {
    if (rosterValidated) return;
    setPlayerStates(prev => ({ ...prev, [id]: next }));
  }, [rosterValidated]);

  const handleValidate = useCallback(() => {
    matchActions.validateRoster({
      starterIds: terrainIds,
      benchIds,
      liberoIds,
      allPlayers: apiPlayers,
    });
  }, [matchActions, terrainIds, benchIds, liberoIds, apiPlayers]);

  const handleChangeTeam = useCallback(() => {
    matchActions.resetMatch();
    teamActions.clearTeam();
  }, [matchActions, teamActions]);

  const renderPlayer = useCallback(({ item }: ListRenderItemInfo<Player>) => (
    <PlayerRow
      player={item}
      state={playerStates[item.id] ?? 'none'}
      canAddTerrain={!rosterValidated && terrainCount < 6}
      canAddLibero={canAddLibero}
      liberoLocked={liberoLocked}
      onSelect={handleSelect}
    />
  ), [playerStates, terrainCount, canAddLibero, liberoLocked, rosterValidated, handleSelect]);

  const header = (
    <>
      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>← Retour au match</Text>
        </TouchableOpacity>
      )}

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          <Text style={terrainCount === 6 ? styles.counterOk : styles.counterWarn}>
            Terrain {terrainCount}/6
          </Text>
          {'  ·  '}
          <Text style={styles.counterNeutral}>Banc {benchIds.length}</Text>
          {'  ·  '}
          <Text style={liberoCount > 0 ? styles.counterLibero : styles.counterNeutral}>
            Libero {liberoCount}/2{liberoLocked ? ' 🔒' : ''}
          </Text>
        </Text>
      </View>

      <Text style={styles.sectionLabel}>JOUEURS</Text>
    </>
  );

  const footer = (
    <>
      {canValidate && (
        <TouchableOpacity style={styles.validateBtn} onPress={handleValidate}>
          <Text style={styles.validateBtnText}>Confirmer la sélection →</Text>
        </TouchableOpacity>
      )}

      {rosterValidated && (
        <View style={styles.validatedMsg}>
          <Text style={styles.validatedText}>Équipe validée ✓</Text>
          <TouchableOpacity onPress={matchActions.resetRoster}>
            <Text style={styles.resetText}>Modifier la sélection</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.changeTeamBtn} onPress={handleChangeTeam}>
        <Text style={styles.changeTeamText}>← Changer d'équipe</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xxl }} />
    </>
  );

  return (
    <FlatList<Player>
      style={styles.container}
      data={apiPlayers}
      keyExtractor={item => String(item.id)}
      renderItem={renderPlayer}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  closeBtn: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  closeBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.blue,
  },

  counter: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  counterText: {
    fontSize: FONT_SIZE.md,
  },
  counterOk: {
    color: COLORS.greenLight,
    fontWeight: '600',
  },
  counterWarn: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
  counterNeutral: {
    color: COLORS.textMuted,
  },
  counterLibero: {
    color: COLORS.yellow,
    fontWeight: '600',
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
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

  btnGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  stateBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  stateBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
  },
  stateBtnTerrain: {
    borderColor: COLORS.blue + '66',
    backgroundColor: COLORS.blue + '18',
  },
  stateBtnBanc: {
    borderColor: COLORS.textMuted + '44',
    backgroundColor: COLORS.textMuted + '14',
  },
  stateBtnTextBanc: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  stateBtnLibero: {
    borderColor: COLORS.yellow + '66',
    backgroundColor: COLORS.yellow + '18',
  },
  stateBtnTextLibero: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
  stateBtnLocked: {
    opacity: 0.3,
  },

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
