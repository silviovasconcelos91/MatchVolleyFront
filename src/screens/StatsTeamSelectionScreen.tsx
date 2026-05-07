import React, { useCallback, useEffect, useState, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTeams } from '../data/teams';
import type { Team } from '../data/teams';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  onBack: () => void;
  onSelectTeam: (teamId: number, teamName: string) => void;
};

type TeamRowProps = {
  team: Team;
  onPress: (teamId: number, teamName: string) => void;
};

const TeamRow = memo(({ team, onPress }: TeamRowProps) => (
  <TouchableOpacity
    style={styles.teamRow}
    onPress={() => onPress(team.id, team.name)}
    activeOpacity={0.7}
  >
    <View style={[styles.teamLogo, { backgroundColor: `${team.logoColor}22`, borderColor: `${team.logoColor}55` }]}>
      <Text style={[styles.teamLogoLetter, { color: team.logoColor }]}>
        {team.name[0]}
      </Text>
    </View>
    <View style={styles.teamInfo}>
      <Text style={styles.teamName}>{team.name}</Text>
      <Text style={styles.teamCity}>{team.city}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
));

const StatsTeamSelectionScreen = ({ onBack, onSelectTeam }: Props) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTeams()
      .then(setTeams)
      .catch(() => setError('Impossible de charger les équipes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderTeam = useCallback(({ item }: ListRenderItemInfo<Team>) => (
    <TeamRow team={item} onPress={onSelectTeam} />
  ), [onSelectTeam]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques</Text>
        <Text style={styles.headerSubtitle}>Sélectionnez une équipe</Text>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
          <Text style={styles.loadingText}>Chargement des équipes...</Text>
        </View>
      )}

      {!loading && error !== null && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && error === null && (
        <FlatList<Team>
          data={teams}
          keyExtractor={item => String(item.id)}
          renderItem={renderTeam}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune équipe disponible.</Text>
          }
        />
      )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.red,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  retryBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
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
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoLetter: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  teamCity: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textDark,
    lineHeight: FONT_SIZE.xl,
  },
});

export default StatsTeamSelectionScreen;
