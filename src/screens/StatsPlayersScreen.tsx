import React, { memo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '../context/TeamContext';
import type { Player } from '../data/players';
import { COLORS, SPACING, FONT_SIZE, RADIUS, getPlayerColor } from '../constants/theme';
import PlayerAvatar from '../components/PlayerAvatar';

type Props = {
  teamId: number;
  teamName: string;
  onBack: () => void;
};

type PlayerRowProps = {
  player: Player;
};

const PlayerRow = memo(({ player }: PlayerRowProps) => (
  <View style={styles.playerRow}>
    <PlayerAvatar name={player.name} color={getPlayerColor(player.id)} size={40} />
    <View style={styles.playerInfo}>
      <Text style={styles.playerName}>{player.name}</Text>
      <Text style={styles.playerMeta}>#{player.numero}{player.taille ? ` · ${player.taille}` : ''}</Text>
    </View>
  </View>
));

const StatsPlayersScreen = ({ teamId, teamName, onBack }: Props) => {
  const { state: teamState } = useTeam();
  const team = teamState.teams.find(t => t.id === teamId);
  const players = team?.players ?? [];

  const renderPlayer = useCallback(({ item }: ListRenderItemInfo<Player>) => (
    <PlayerRow player={item} />
  ), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ {teamName}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName}</Text>
        <Text style={styles.headerSubtitle}>Stats joueurs</Text>
      </View>

      <FlatList<Player>
        data={players}
        keyExtractor={item => String(item.id)}
        renderItem={renderPlayer}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun joueur dans cette équipe.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  header: {
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  backBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xxl,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  playerMeta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default StatsPlayersScreen;
