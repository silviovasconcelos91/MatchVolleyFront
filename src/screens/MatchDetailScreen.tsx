import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '../context/TeamContext';
import { getMatchDetail } from '../data/matchApi';
import type {
  MatchDetail,
  MatchDetailStats,
  MatchDetailPlayerSetStat,
} from '../data/matchApi';
import SetGraph from '../components/SetGraph';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  matchId: string;
  matchDate: string;
  onBack: () => void;
};

type TabId = 'resume' | 'sets' | 'players' | 'players-sets';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',       label: 'Résumé'     },
  { id: 'sets',         label: 'Par set'    },
  { id: 'players',      label: 'Joueurs'    },
  { id: 'players-sets', label: 'Joueurs/set'},
];

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const ROLE_LABELS: Record<string, string> = {
  R4:      'Réceptionneur-Attaquant',
  Central: 'Central',
  Passeur: 'Passeur',
  Pointu:  'Pointu',
  Libero:  'Libéro',
};

type StatKey = keyof MatchDetailStats;
type StatGroup = { label: string; color: string; stats: { key: StatKey; label: string }[] };

const STAT_GROUPS: StatGroup[] = [
  {
    label: 'POINTS MARQUÉS',
    color: COLORS.green,
    stats: [
      { key: 'points',       label: 'Total'   },
      { key: 'attackPoints', label: 'Attaque' },
      { key: 'blockPoints',  label: 'Block'   },
      { key: 'acePoints',    label: 'Ace'     },
    ],
  },
  {
    label: 'POINTS PERDUS',
    color: COLORS.red,
    stats: [
      { key: 'attackErrors',  label: 'Err. attaque' },
      { key: 'serviceErrors', label: 'Err. service' },
      { key: 'receptions',    label: 'Récep. ratées'},
    ],
  },
];

const playerSetToStats = (s: MatchDetailPlayerSetStat): MatchDetailStats => ({
  points:        s.points,
  attackPoints:  s.attackPoints,
  blockPoints:   s.blockPoints,
  acePoints:     s.acePoints,
  attackErrors:  s.attackErrors,
  serviceErrors: s.serviceErrors,
  receptions:    s.receptions,
});

// ── Grille stats par catégorie ─────────────────────────────────
type StatsGridProps = { stats: MatchDetailStats; myTotal?: number; oppTotal?: number };

const StatsGrid = ({ stats, myTotal, oppTotal }: StatsGridProps) => {
  const showAdv = myTotal !== undefined && oppTotal !== undefined;
  const advGagné = showAdv
    ? oppTotal - (stats.attackErrors + stats.serviceErrors + stats.receptions)
    : 0;
  const advPerdu = showAdv
    ? myTotal - (stats.attackPoints + stats.blockPoints + stats.acePoints)
    : 0;

  return (
    <View style={styles.statsGrid}>
      {STAT_GROUPS.map(group => (
        <View key={group.label} style={styles.statsGroup}>
          <View style={[styles.statsGroupHeader, { borderLeftColor: group.color }]}>
            <Text style={[styles.statsGroupLabel, { color: group.color }]}>{group.label}</Text>
          </View>
          <View style={styles.statsRow}>
            {group.stats.map(c => (
              <View key={c.key} style={styles.statsCell}>
                <Text style={styles.statsCellValue}>{stats[c.key]}</Text>
                <Text style={styles.statsCellLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {showAdv && (
        <View style={styles.statsGroup}>
          <View style={[styles.statsGroupHeader, { borderLeftColor: COLORS.yellow }]}>
            <Text style={[styles.statsGroupLabel, { color: COLORS.yellow }]}>ADVERSAIRE</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statsCell}>
              <Text style={styles.statsCellValue}>{advGagné}</Text>
              <Text style={styles.statsCellLabel}>Points gagnés</Text>
            </View>
            <View style={styles.statsCell}>
              <Text style={styles.statsCellValue}>{advPerdu}</Text>
              <Text style={styles.statsCellLabel}>Points perdus</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// ── Onglet 1 : Résumé global ───────────────────────────────────
const ResumeTab = ({ data }: { data: MatchDetail }) => {
  const won = data.result === 'won';
  return (
    <View style={styles.tabContent}>
      <View style={styles.scoreCard}>
        <View style={[styles.resultBadge, won ? styles.resultWon : styles.resultLost]}>
          <Text style={[styles.resultLabel, won ? styles.resultLabelWon : styles.resultLabelLost]}>
            {won ? 'Victoire' : 'Défaite'}
          </Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNum}>{data.mySets}</Text>
          <Text style={styles.scoreSep}>–</Text>
          <Text style={styles.scoreNum}>{data.oppSets}</Text>
        </View>
        <Text style={styles.scoreSublabel}>sets</Text>
        <Text style={styles.scoreDate}>{formatDate(data.date)}</Text>
      </View>

      <Text style={styles.sectionTitle}>STATS ÉQUIPE</Text>
      <View style={styles.card}>
        <StatsGrid
          stats={data.teamMatchStats}
          myTotal={data.sets.reduce((sum, s) => sum + s.myScore, 0)}
          oppTotal={data.sets.reduce((sum, s) => sum + s.oppScore, 0)}
        />
      </View>
    </View>
  );
};

// ── Onglet 2 : Par set ─────────────────────────────────────────
const SetsTab = ({ data }: { data: MatchDetail }) => {
  const [expandedSet, setExpandedSet] = useState<number | null>(null);

  return (
    <View style={styles.tabContent}>
      {data.sets.map(set => {
        const myWon     = set.myScore > set.oppScore;
        const expanded  = expandedSet === set.set;
        const hasTimeline = set.timeline.length > 0;

        return (
          <View key={set.set} style={styles.card}>
            <View style={styles.setHeader}>
              <Text style={styles.setLabel}>Set {set.set}</Text>
              <View style={styles.setScoreRow}>
                <Text style={[styles.setScore, myWon ? styles.setScoreWon : styles.setScoreLost]}>
                  {set.myScore}
                </Text>
                <Text style={styles.setScoreSep}> – </Text>
                <Text style={[styles.setScore, myWon ? styles.setScoreLost : styles.setScoreWon]}>
                  {set.oppScore}
                </Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Stats équipe</Text>
            <StatsGrid stats={set.teamStats} myTotal={set.myScore} oppTotal={set.oppScore} />

            {hasTimeline && (
              <TouchableOpacity
                style={styles.timelineToggle}
                onPress={() => setExpandedSet(expanded ? null : set.set)}
                activeOpacity={0.7}
              >
                <Text style={styles.timelineToggleText}>Timeline</Text>
                <Text style={styles.timelineChevron}>{expanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}

            {expanded && hasTimeline && (
              <SetGraph
                timeline={set.timeline}
                finalMyScore={set.myScore}
                finalOppScore={set.oppScore}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

// ── Onglet 3 : Joueurs global ──────────────────────────────────
type PlayersTabProps = {
  data: MatchDetail;
  playerName: (id: number) => string;
};
const PlayersTab = ({ data, playerName }: PlayersTabProps) => (
  <View style={styles.tabContent}>
    {data.players.map(p => (
      <View key={p.playerId} style={styles.card}>
        <View style={styles.playerHeader}>
          <View style={styles.playerNum}>
            <Text style={styles.playerNumText}>#{p.number}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{playerName(p.playerId)}</Text>
            {p.role ? <Text style={styles.playerRole}>{ROLE_LABELS[p.role] ?? p.role}</Text> : null}
          </View>
        </View>
        <StatsGrid stats={p.matchStats} />
      </View>
    ))}
  </View>
);

// ── Onglet 4 : Joueurs / set ───────────────────────────────────
type PlayersSetTabProps = {
  data: MatchDetail;
  playerName: (id: number) => string;
};
const PlayersSetTab = ({ data, playerName }: PlayersSetTabProps) => (
  <View style={styles.tabContent}>
    {data.players.map(p => (
      <View key={p.playerId} style={styles.card}>
        <View style={styles.playerHeader}>
          <View style={styles.playerNum}>
            <Text style={styles.playerNumText}>#{p.number}</Text>
          </View>
          <Text style={styles.playerName}>{playerName(p.playerId)}</Text>
        </View>
        {p.setStats.map(ss => (
          <View key={ss.set} style={styles.setStatBlock}>
            <Text style={styles.setStatLabel}>Set {ss.set}</Text>
            <StatsGrid stats={playerSetToStats(ss)} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

// ── Écran principal ────────────────────────────────────────────
const MatchDetailScreen = ({ matchId, matchDate, onBack }: Props) => {
  const { state: teamState } = useTeam();
  const [data, setData] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('resume');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMatchDetail(matchId)
      .then(setData)
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  const playerName = useMemo(() => {
    if (!data) return (id: number) => `#${id}`;
    const team = teamState.teams.find(t => t.id === data.teamId);
    const map = new Map<number, string>();
    for (const p of team?.players ?? []) map.set(p.id, p.name);
    return (id: number) => map.get(id) ?? `Joueur ${id}`;
  }, [data, teamState.teams]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Matchs</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatDate(matchDate)}</Text>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
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

      {!loading && data !== null && (
        <>
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {activeTab === 'resume'       && <ResumeTab      data={data} />}
            {activeTab === 'sets'         && <SetsTab        data={data} />}
            {activeTab === 'players'      && <PlayersTab     data={data} playerName={playerName} />}
            {activeTab === 'players-sets' && <PlayersSetTab  data={data} playerName={playerName} />}
            <View style={{ height: SPACING.xxl * 2 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgApp },

  header: {
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.xs },
  backBtnText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { fontSize: FONT_SIZE.lg, color: COLORS.red, textAlign: 'center', paddingHorizontal: SPACING.xl },
  retryBtn: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  retryBtnText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.blue },
  tabLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.blue, fontWeight: '600' },

  scrollView: { flex: 1 },
  tabContent: { padding: SPACING.lg, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },

  sectionTitle: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
    letterSpacing: 1, marginTop: SPACING.sm,
  },
  subSectionTitle: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
    letterSpacing: 0.8, marginTop: SPACING.xs,
  },

  // Score card (résumé)
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  resultBadge: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  resultWon:  { backgroundColor: `${COLORS.green}22`, borderColor: `${COLORS.green}55` },
  resultLost: { backgroundColor: `${COLORS.red}22`,   borderColor: `${COLORS.red}55`   },
  resultLabel: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  resultLabelWon:  { color: COLORS.green },
  resultLabelLost: { color: COLORS.red },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  scoreNum: { fontSize: 48, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 56 },
  scoreSep: { fontSize: 32, color: COLORS.textMuted, lineHeight: 40 },
  scoreSublabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  scoreDate: { fontSize: FONT_SIZE.md, color: COLORS.textDark, marginTop: SPACING.xs },

  // Stats grid
  statsGrid: { gap: SPACING.sm },
  statsGroup: { gap: 6 },
  statsGroupHeader: {
    borderLeftWidth: 3,
    paddingLeft: SPACING.sm,
  },
  statsGroupLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: { flexDirection: 'row', gap: SPACING.xs },
  statsCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    gap: 2,
  },
  statsCellValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statsCellLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  statsCellMuted: {
    flex: 2,
    opacity: 0.5,
  },
  statsCellValueMuted: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '400',
    color: COLORS.textMuted,
  },

  // Set header
  setHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  setLabel: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5 },
  setScoreRow: { flexDirection: 'row', alignItems: 'center' },
  setScore: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
  setScoreWon:  { color: COLORS.green },
  setScoreLost: { color: COLORS.textMuted },
  setScoreSep:  { fontSize: FONT_SIZE.lg, color: COLORS.textMuted },

  // Timeline toggle
  timelineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  timelineToggleText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.blue,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  timelineChevron: {
    fontSize: 10,
    color: COLORS.blue,
  },

  // Player rows
  playerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs,
  },
  playerNum: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.blue}22`, borderWidth: 1, borderColor: `${COLORS.blue}44`,
    justifyContent: 'center', alignItems: 'center',
  },
  playerNumText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.blue },
  playerInfo: { flex: 1 },
  playerName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  playerRole: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },

  // Per-set stat block (tab 4)
  setStatBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: 4,
  },
  setStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, letterSpacing: 0.5, fontWeight: '600' },
});

export default MatchDetailScreen;
