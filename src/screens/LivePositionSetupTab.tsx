import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import type { MatchPlayer } from '../context/MatchContext';
import { MINE_ROWS } from '../data/liveStats';
import { getPositionColor, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

// Position map (zone → player id) from current on-court players, libero excluded.
const buildPositionMap = (players: MatchPlayer[], liberoId: number | null): Record<number, number> => {
  const map: Record<number, number> = {};
  for (const p of players) {
    if (p.onCourt && p.pos !== null && p.id !== liberoId) map[p.pos] = p.id;
  }
  return map;
};

const LivePositionSetupTab = () => {
  const { state, actions } = useMatch();
  const { matchPlayers, liberoId, opponentServing } = state;

  // Seeded once from the court; edited locally until confirm.
  const [positionMap, setPositionMap] = useState(() => buildPositionMap(matchPlayers, liberoId));
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  const playerById = useMemo(() => {
    const map: Record<number, MatchPlayer> = {};
    for (const p of matchPlayers) map[p.id] = p;
    return map;
  }, [matchPlayers]);

  const handleTap = useCallback((pos: number) => {
    if (selectedPos === null) { setSelectedPos(pos); return; }
    setSelectedPos(null);
    if (selectedPos === pos) return;
    // Swap the two positions
    setPositionMap(cur => {
      const a = cur[selectedPos];
      const b = cur[pos];
      const next = { ...cur };
      if (a !== undefined) next[pos] = a; else delete next[pos];
      if (b !== undefined) next[selectedPos] = b; else delete next[selectedPos];
      return next;
    });
  }, [selectedPos]);

  const handleConfirm = useCallback(() => {
    const tacticalRoles: Record<number, string> = {};
    for (const p of matchPlayers) tacticalRoles[p.id] = p.tacticalRole;
    actions.assignSetRoles({
      positionMap,
      tacticalRoles,
      liberoActive: liberoId !== null,
      opponentServesFirst: opponentServing,
    });
  }, [actions, positionMap, matchPlayers, liberoId, opponentServing]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Corriger les positions</Text>
      <Text style={styles.hint}>Touchez deux cases pour les échanger</Text>

      <View style={styles.court}>
        {MINE_ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(pos => {
              const playerId = positionMap[pos];
              const player   = playerId !== undefined ? playerById[playerId] : undefined;
              const isSelected = selectedPos === pos;
              const color = player ? getPositionColor(player.tacticalRole) : COLORS.textDark;
              return (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.cell,
                    player
                      ? { borderColor: `${color}88`, backgroundColor: `${color}1a` }
                      : { borderColor: COLORS.border },
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => handleTap(pos)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.zoneLabel}>Z{pos}</Text>
                  {player ? (
                    <>
                      <Text style={[styles.playerName, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                        {player.name.split(' ')[0]}
                      </Text>
                      <Text style={styles.playerNum}>#{player.numero}</Text>
                      {player.tacticalRole ? (
                        <Text style={[styles.playerRole, { color }]}>{player.tacticalRole}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.emptyText}>—</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
        <Text style={styles.confirmText}>✓ Confirmer les positions</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  hint: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  court: {
    flex: 1,
    gap: SPACING.sm,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cell: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: 2,
  },
  cellSelected: {
    borderColor: COLORS.yellow,
    backgroundColor: `${COLORS.yellow}2a`,
  },
  zoneLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
    position: 'absolute',
    top: 4,
    left: 6,
  },
  playerName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    maxWidth: '90%',
  },
  playerNum: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  playerRole: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textDark,
  },
  confirmBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.green,
  },
});

export default LivePositionSetupTab;
