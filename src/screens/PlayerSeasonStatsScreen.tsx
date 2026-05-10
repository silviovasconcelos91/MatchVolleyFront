import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, RADIUS, getPlayerColor } from '../constants/theme';
import PlayerAvatar from '../components/PlayerAvatar';
import { getPlayerSeasonStats, type PlayerSeasonStats, type MatchDetailStats, type PositionStats } from '../data/matchApi';

type Props = {
  playerId: number;
  playerName: string;
  playerNumero: number;
  teamId: number;
  onBack: () => void;
};

type StatCardProps = {
  label: string;
  value: number;
  color?: string;
};

const StatCard = ({ label, value, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const StatsGrid = ({ stats }: { stats: MatchDetailStats }) => (
  <View style={styles.statsGrid}>
    <StatCard label="Points"     value={stats.points}        color={COLORS.green}  />
    <StatCard label="Attaques"   value={stats.attackPoints}  color={COLORS.blue}   />
    <StatCard label="Contres"    value={stats.blockPoints}   color={COLORS.yellow} />
    <StatCard label="Aces"       value={stats.acePoints}     color={COLORS.pink}   />
    <StatCard label="Récep."     value={stats.receptions}                          />
    <StatCard label="Err. att."  value={stats.attackErrors}  color={COLORS.red}    />
    <StatCard label="Err. serv." value={stats.serviceErrors} color={COLORS.red}    />
  </View>
);

const PositionCard = ({ position, data }: { position: string; data: PositionStats }) => (
  <View style={styles.sectionCard}>
    <View style={styles.positionHeader}>
      <Text style={styles.positionTitle}>{position}</Text>
      <View style={styles.positionMeta}>
        <Text style={styles.positionMetaText}>{data.matchCount} match{data.matchCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.positionMetaSep}>·</Text>
        <Text style={styles.positionMetaText}>{data.setCount} set{data.setCount !== 1 ? 's' : ''}</Text>
      </View>
    </View>
    <StatsGrid stats={data.stats} />
  </View>
);

const PlayerSeasonStatsScreen = ({ playerId, playerName, playerNumero, teamId, onBack }: Props) => {
  const [stats, setStats] = useState<PlayerSeasonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlayerSeasonStats(playerId, teamId)
      .then(setStats)
      .catch(() => setError('Impossible de charger les stats.'))
      .finally(() => setLoading(false));
  }, [playerId, teamId]);

  const color = getPlayerColor(playerId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Joueurs</Text>
        </TouchableOpacity>
        <View style={styles.headerPlayer}>
          <PlayerAvatar name={playerName} color={color} size={44} />
          <View>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerMeta}>#{playerNumero}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Stats saison</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.blue} />
        </View>
      )}

      {error !== null && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {stats !== null && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{stats.matchCount}</Text>
              <Text style={styles.summaryLabel}>match{stats.matchCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{stats.setCount}</Text>
              <Text style={styles.summaryLabel}>set{stats.setCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Stats globales</Text>
          <View style={styles.sectionCard}>
            <StatsGrid stats={stats.totalStats} />
          </View>

          {Object.keys(stats.statsByPosition).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Par poste</Text>
              {Object.entries(stats.statsByPosition).map(([position, posData]) => (
                <PositionCard key={position} position={position} data={posData} />
              ))}
            </>
          )}
        </ScrollView>
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
  headerPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  playerName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  playerMeta: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.red,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  content: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.blue,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  positionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  positionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  positionMetaText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  positionMetaSep: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minWidth: 72,
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default PlayerSeasonStatsScreen;
