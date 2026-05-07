import React, { useCallback, useEffect, useState, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeamMatches } from '../data/matchApi';
import type { MatchSummary } from '../data/matchApi';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  teamId: number;
  teamName: string;
  onBack: () => void;
  onSelectMatch: (matchId: string, matchDate: string) => void;
};

type MatchRowProps = {
  match: MatchSummary;
  onPress: (matchId: string, matchDate: string) => void;
};

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const MatchRow = memo(({ match, onPress }: MatchRowProps) => {
  const won = match.result === 'won';
  return (
    <TouchableOpacity
      style={styles.matchRow}
      onPress={() => onPress(match.id, match.date)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultBadge, won ? styles.resultWon : styles.resultLost]}>
        <Text style={[styles.resultText, won ? styles.resultTextWon : styles.resultTextLost]}>
          {won ? 'V' : 'D'}
        </Text>
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
      </View>
      <Text style={styles.matchScore}>
        {match.mySets} – {match.oppSets}
      </Text>
      <Text style={styles.matchChevron}>›</Text>
    </TouchableOpacity>
  );
});

const TeamMatchListScreen = ({ teamId, teamName, onBack, onSelectMatch }: Props) => {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTeamMatches(teamId)
      .then(setMatches)
      .catch(() => setError('Impossible de charger les matchs'))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const renderMatch = useCallback(({ item }: ListRenderItemInfo<MatchSummary>) => (
    <MatchRow match={item} onPress={onSelectMatch} />
  ), [onSelectMatch]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Équipes</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName}</Text>
        <Text style={styles.headerSubtitle}>Historique des matchs</Text>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
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
        <FlatList<MatchSummary>
          data={matches}
          keyExtractor={item => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun match enregistré.</Text>
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
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  resultBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultWon: {
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
  },
  resultLost: {
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
  },
  resultText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  resultTextWon:  { color: COLORS.green },
  resultTextLost: { color: COLORS.red },
  matchInfo: { flex: 1 },
  matchDate: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  matchScore: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  matchChevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textDark,
    lineHeight: FONT_SIZE.xl,
  },
});

export default TeamMatchListScreen;
