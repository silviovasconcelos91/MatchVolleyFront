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

type TabId = 'resume' | 'sets' | 'players';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',  label: 'Résumé'  },
  { id: 'sets',    label: 'Par set' },
  { id: 'players', label: 'Joueurs' },
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

const TIMELINE_ACTION_LABELS: Record<string, string> = {
  pt:        'Point',
  atk:       'Attaque',
  block:     'Block',
  ace:       'Ace',
  atk_out:   'Err. attaque',
  srv_out:   'Err. service',
  recv:      'Err. réception',
  fault:     'Faute',
  opp_score: 'Point adverse',
  opp_fault: 'Faute adverse',
};

const MINE_ACTIONS = new Set(['pt', 'atk', 'block', 'ace', 'opp_fault']);

const playerSetToStats = (s: MatchDetailPlayerSetStat): MatchDetailStats => ({
  points:        s.points        ?? 0,
  attackPoints:  s.attackPoints  ?? 0,
  blockPoints:   s.blockPoints   ?? 0,
  acePoints:     s.acePoints     ?? 0,
  attackErrors:  s.attackErrors  ?? 0,
  serviceErrors: s.serviceErrors ?? 0,
  receptions:    s.receptions    ?? 0,
  faults:        s.faults        ?? 0,
});

// ── Cellule stat ──────────────────────────────────────────────────
type StatCellProps = { label: string; value: number; color: string };

const StatCell = ({ label, value, color }: StatCellProps) => (
  <View style={[styles.statCell, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
    <Text style={[styles.statCellValue, { color }]}>{value}</Text>
    <Text style={styles.statCellLabel}>{label}</Text>
  </View>
);

// ── Bloc stats équipe (4 sections) ────────────────────────────────
type MatchStatsBlockProps = {
  stats: MatchDetailStats;
  myScore?: number;
  oppScore?: number;
  hideTotalScore?: boolean;
};

const MatchStatsBlock = ({ stats, myScore, oppScore, hideTotalScore }: MatchStatsBlockProps) => {
  const pts    = stats.points        ?? 0;
  const atk    = stats.attackPoints  ?? 0;
  const blk    = stats.blockPoints   ?? 0;
  const ace    = stats.acePoints     ?? 0;
  const atkErr = stats.attackErrors  ?? 0;
  const srvErr = stats.serviceErrors ?? 0;
  const recv   = stats.receptions    ?? 0;
  const fault  = stats.faults        ?? 0;

  const playerPoints = pts + atk + blk + ace;
  const teamFaults   = atkErr + srvErr + recv + fault;
  const hasScores    = myScore !== undefined && oppScore !== undefined;
  const oppActual    = hasScores ? Math.max(0, oppScore - teamFaults) : 0;
  const oppFaults    = hasScores ? Math.max(0, myScore - playerPoints) : 0;

  return (
    <View style={styles.statsBlock}>

      {/* Total des points */}
      {hasScores && !hideTotalScore && (
        <>
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionLabel}>TOTAL DES POINTS</Text>
            <Text style={styles.statsTotalScore}>{myScore} – {oppScore}</Text>
          </View>
          <View style={styles.statsDivider} />
        </>
      )}

      {/* Points marqués */}
      <View style={styles.statsSection}>
        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsSectionLabel}>POINTS MARQUÉS</Text>
          <Text style={[styles.statsSectionTotal, { color: COLORS.greenLight }]}>{playerPoints}</Text>
        </View>
        <View style={styles.statCellRow}>
          <StatCell label="Pt"   value={pts}  color={COLORS.greenLight} />
          <StatCell label="Atk"  value={atk}  color={COLORS.blue} />
          <StatCell label="Bloc" value={blk}  color="#e040fb" />
          <StatCell label="Ace"  value={ace}  color={COLORS.greenLight} />
        </View>
      </View>

      <View style={styles.statsDivider} />

      {/* Fautes */}
      <View style={styles.statsSection}>
        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsSectionLabel}>FAUTES</Text>
          <Text style={[styles.statsSectionTotal, { color: COLORS.redLight }]}>{teamFaults}</Text>
        </View>
        <View style={styles.statCellRow}>
          <StatCell label="Atk"   value={atkErr} color={COLORS.redLight} />
          <StatCell label="Srv"   value={srvErr} color={COLORS.redLight} />
          <StatCell label="Recv"  value={recv}   color={COLORS.redLight} />
          <StatCell label="Faute" value={fault}  color={COLORS.redLight} />
        </View>
      </View>

      {/* Adversaire */}
      {hasScores && (
        <>
          <View style={styles.statsDivider} />
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionLabel}>ADVERSAIRE</Text>
            <View style={styles.statCellRow}>
              <StatCell label="Points marqués" value={oppActual} color={COLORS.yellow} />
              <StatCell label="Fautes"         value={oppFaults} color={COLORS.textMuted} />
            </View>
          </View>
        </>
      )}

    </View>
  );
};

// ── Onglet 1 : Résumé global ───────────────────────────────────
const ResumeTab = ({ data }: { data: MatchDetail }) => {
  const won = (data.result ?? '').toLowerCase() === 'won';
  const sets = data.sets ?? [];
  const myTotal  = sets.reduce((sum, s) => sum + (s.myScore  ?? 0), 0);
  const oppTotal = sets.reduce((sum, s) => sum + (s.oppScore ?? 0), 0);
  const teamStats = data.teamMatchStats ?? {};
  return (
    <View style={styles.tabContent}>
      <View style={styles.scoreCard}>
        <View style={[styles.resultBadge, won ? styles.resultWon : styles.resultLost]}>
          <Text style={[styles.resultLabel, won ? styles.resultLabelWon : styles.resultLabelLost]}>
            {won ? 'Victoire' : 'Défaite'}
          </Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreNum}>{data.mySets ?? 0}</Text>
          <Text style={styles.scoreSep}>–</Text>
          <Text style={styles.scoreNum}>{data.oppSets ?? 0}</Text>
        </View>
        <Text style={styles.scoreSublabel}>sets</Text>

        <View style={styles.scoreDivider} />

        <View style={styles.scoreRow}>
          <Text style={styles.scorePtsNum}>{myTotal}</Text>
          <Text style={styles.scorePtsSep}>–</Text>
          <Text style={styles.scorePtsNum}>{oppTotal}</Text>
        </View>
        <Text style={styles.scoreSublabel}>points</Text>
      </View>

      <Text style={styles.sectionTitle}>STATS ÉQUIPE</Text>
      <View style={styles.card}>
        <MatchStatsBlock
          stats={teamStats}
          myScore={myTotal}
          oppScore={oppTotal}
          hideTotalScore
        />
      </View>
    </View>
  );
};

// ── Onglet 2 : Par set ─────────────────────────────────────────
type SetsTabProps = {
  data: MatchDetail;
  playerName: (id: number) => string;
  playerInfo: (id: number) => { role: string; number: number } | null;
};

const SetsTab = ({ data, playerName, playerInfo }: SetsTabProps) => {
  const [expandedSet, setExpandedSet] = useState<number | null>(null);

  return (
    <View style={styles.tabContent}>
      {(data.sets ?? []).map(set => {
        const setNum      = set.set ?? 0;
        const myScore     = set.myScore  ?? 0;
        const oppScore    = set.oppScore ?? 0;
        const myWon       = myScore > oppScore;
        const expanded    = expandedSet === setNum;
        const timeline    = set.timeline ?? [];
        const hasTimeline = timeline.length > 0;
        const teamStats   = set.teamStats ?? {};

        return (
          <View key={setNum} style={styles.card}>
            <View style={styles.setHeader}>
              <Text style={styles.setLabel}>Set {setNum}</Text>
              <View style={styles.setScoreRow}>
                <Text style={[styles.setScore, myWon ? styles.setScoreWon : styles.setScoreLost]}>
                  {myScore}
                </Text>
                <Text style={styles.setScoreSep}> – </Text>
                <Text style={[styles.setScore, myWon ? styles.setScoreLost : styles.setScoreWon]}>
                  {oppScore}
                </Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Stats équipe</Text>
            <MatchStatsBlock
              stats={teamStats}
              myScore={myScore}
              oppScore={oppScore}
            />

            {hasTimeline && (
              <TouchableOpacity
                style={styles.timelineToggle}
                onPress={() => setExpandedSet(expanded ? null : setNum)}
                activeOpacity={0.7}
              >
                <Text style={styles.timelineToggleText}>Timeline</Text>
                <Text style={styles.timelineChevron}>{expanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}

            {expanded && hasTimeline && (
              <>
                <SetGraph
                  timeline={timeline}
                  finalMyScore={myScore}
                  finalOppScore={oppScore}
                />
                <View style={styles.actionList}>
                  {timeline.map((entry, i) => {
                    const action   = entry.action ?? '';
                    const mine     = MINE_ACTIONS.has(action);
                    const pid      = entry.playerId ?? null;
                    const info     = pid !== null ? playerInfo(pid) : null;
                    const name     = pid !== null ? playerName(pid) : null;
                    return (
                      <View key={i} style={[styles.actionRow, mine ? styles.actionRowMine : styles.actionRowOpp]}>
                        <View style={[styles.scoreTag, mine ? styles.scoreTagMine : styles.scoreTagOpp]}>
                          <Text style={[styles.scoreTagText, mine ? styles.scoreTagTextMine : styles.scoreTagTextOpp]}>
                            {entry.myScore ?? 0}–{entry.oppScore ?? 0}
                          </Text>
                        </View>
                        <View style={styles.actionInfo}>
                          <Text style={styles.actionLabel}>
                            {TIMELINE_ACTION_LABELS[action] ?? action}
                          </Text>
                          {name && (
                            <Text style={styles.actionPlayer} numberOfLines={1}>{name}</Text>
                          )}
                        </View>
                        {info && (
                          <View style={styles.roleTag}>
                            <Text style={styles.roleTagText}>{info.role}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ── Onglet 3 : Joueurs (expandable → stats par set) ───────────────
type PlayersTabProps = {
  data: MatchDetail;
  playerName: (id: number) => string;
};

const PlayersTab = ({ data, playerName }: PlayersTabProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View style={styles.tabContent}>
      {(data.players ?? []).map(p => {
        const pid      = p.playerId ?? 0;
        const expanded = expandedId === pid;
        return (
          <View key={pid} style={styles.card}>
            <TouchableOpacity
              style={styles.playerHeader}
              onPress={() => setExpandedId(expanded ? null : pid)}
              activeOpacity={0.7}
            >
              <View style={styles.playerNum}>
                <Text style={styles.playerNumText}>#{p.number ?? 0}</Text>
              </View>
              <Text style={styles.playerName}>{playerName(pid)}</Text>
              <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <MatchStatsBlock stats={p.matchStats ?? {}} />

            {expanded && (p.setStats ?? []).map(ss => (
              <View key={ss.set ?? 0} style={styles.setStatBlock}>
                <View style={styles.setStatHeader}>
                  <Text style={styles.setStatLabel}>Set {ss.set ?? 0}</Text>
                  {ss.position ? (
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{ROLE_LABELS[ss.position] ?? ss.position}</Text>
                    </View>
                  ) : null}
                </View>
                <MatchStatsBlock stats={playerSetToStats(ss)} />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

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
    const team = teamState.teams.find(t => t.id === (data.teamId ?? -1));
    const map = new Map<number, string>();
    for (const p of team?.players ?? []) map.set(p.id, p.name);
    return (id: number) => map.get(id) ?? `Joueur ${id}`;
  }, [data, teamState.teams]);

  const playerInfo = useMemo(() => {
    if (!data) return (_id: number) => null;
    const map = new Map(
      (data.players ?? []).map(p => [
        p.playerId ?? 0,
        { role: p.role ?? '', number: p.number ?? 0 },
      ]),
    );
    return (id: number) => map.get(id) ?? null;
  }, [data]);

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
            {activeTab === 'resume'  && <ResumeTab  data={data} />}
            {activeTab === 'sets'    && <SetsTab    data={data} playerName={playerName} playerInfo={playerInfo} />}
            {activeTab === 'players' && <PlayersTab data={data} playerName={playerName} />}
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
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  resultBadge: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  resultWon:  { backgroundColor: `${COLORS.green}22`, borderColor: `${COLORS.green}55` },
  resultLost: { backgroundColor: `${COLORS.red}22`,   borderColor: `${COLORS.red}55`   },
  resultLabel: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
  resultLabelWon:  { color: COLORS.green },
  resultLabelLost: { color: COLORS.red },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  scoreNum: { fontSize: 52, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 60 },
  scoreSep: { fontSize: 36, color: COLORS.textMuted, lineHeight: 44 },
  scoreSublabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  scoreDivider: {
    width: '60%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  scorePtsNum: { fontSize: 28, fontWeight: '600', color: COLORS.textSecondary, lineHeight: 36 },
  scorePtsSep: { fontSize: FONT_SIZE.xl, color: COLORS.textMuted },

  // ── Stats block ──
  statsBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  statsSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  statsSectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statsTotalScore: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsSectionTotal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
  },
  statCellRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    gap: 2,
  },
  statCellValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  statCellLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
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
  playerName: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  expandChevron: { fontSize: 10, color: COLORS.textMuted },

  // Timeline action list
  actionList: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 5,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  actionRowMine: { backgroundColor: `${COLORS.green}0A` },
  actionRowOpp:  { backgroundColor: `${COLORS.red}0A`   },
  scoreTag: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 1,
    paddingVertical: 2,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
    flexShrink: 0,
  },
  scoreTagMine: { backgroundColor: `${COLORS.green}22`, borderColor: `${COLORS.green}44` },
  scoreTagOpp:  { backgroundColor: `${COLORS.red}22`,   borderColor: `${COLORS.red}44`   },
  scoreTagText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  scoreTagTextMine: { color: COLORS.greenLight },
  scoreTagTextOpp:  { color: COLORS.redLight   },
  actionInfo: { flex: 1, minWidth: 0 },
  actionLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionPlayer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  roleTag: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 1,
    paddingVertical: 2,
    borderWidth: 1,
    backgroundColor: `${COLORS.blue}18`,
    borderColor: `${COLORS.blue}40`,
    flexShrink: 0,
  },
  roleTagText: { fontSize: 10, color: COLORS.blue, fontWeight: '600' },

  // Per-set stat block (expansion joueur)
  setStatBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  setStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  setStatLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, letterSpacing: 0.5, fontWeight: '600' },
});

export default MatchDetailScreen;
