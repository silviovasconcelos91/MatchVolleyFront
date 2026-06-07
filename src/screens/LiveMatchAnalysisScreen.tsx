import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLiveMatchAnalysis } from '../data/matchApi';
import type { LiveMatchAnalysis, ActionCount } from '../data/liveStatsAnalysis';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import SetGraph from '../components/SetGraph';

type Props = {
  matchId: string;
  matchDate: string;
  onBack: () => void;
};

type TabId = 'resume' | 'sets' | 'players' | 'opp';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',  label: 'Résumé'     },
  { id: 'sets',    label: 'Par set'    },
  { id: 'players', label: 'Joueurs'    },
  { id: 'opp',     label: 'Adversaire' },
];

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

type ChipProps = { label: string; count: number; color: string };
const Chip = ({ label, count, color }: ChipProps) => (
  <View style={[styles.chip, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}>
    <Text style={[styles.chipCount, { color }]}>{count}</Text>
    <Text style={styles.chipLabel}>{label}</Text>
  </View>
);

type StatBarProps = {
  sectionLabel: string;
  value: number;
  total: number;
  color: string;
  items: ActionCount[];
};
const StatBar = ({ sectionLabel, value, total, color, items }: StatBarProps) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.statSection}>
      <View style={styles.statHeaderRow}>
        <Text style={styles.statSectionLabel}>{sectionLabel}</Text>
        <Text style={[styles.statRatio, { color }]}>{value} / {total}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {items.length > 0 ? (
        <View style={styles.chipsRow}>
          {items.map(a => (
            <Chip key={a.key} label={a.label} count={a.count} color={color} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptySection}>Aucune action enregistrée</Text>
      )}
    </View>
  );
};

type ResumeTabProps = { data: LiveMatchAnalysis };
const ResumeTab = ({ data }: ResumeTabProps) => {
  const { globalStats, sets } = data;

  const setsWonMine   = sets.filter(s => s.wonBy === 'mine').length;
  const setsWonOpp    = sets.filter(s => s.wonBy === 'opp').length;
  const totalMyScore  = sets.reduce((a, s) => a + s.myScore, 0);
  const totalOppScore = sets.reduce((a, s) => a + s.oppScore, 0);
  const playerPoints  = globalStats.actions.points.reduce((a, x) => a + x.count, 0);
  const teamFaults    = globalStats.actions.faults.reduce((a, x) => a + x.count, 0);
  const oppActual     = Math.max(0, totalOppScore - teamFaults);
  const oppFaults     = Math.max(0, totalMyScore - playerPoints);
  const isWin         = setsWonMine > setsWonOpp;

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>

      {/* Zone 1 : Score global */}
      <View style={styles.scoreCard}>
        <View style={[styles.resultBadge, isWin ? styles.resultBadgeWin : styles.resultBadgeLoss]}>
          <Text style={[styles.resultBadgeText, isWin ? styles.resultBadgeTextWin : styles.resultBadgeTextLoss]}>
            {isWin ? 'VICTOIRE' : 'DÉFAITE'}
          </Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreMain}>{setsWonMine}</Text>
          <Text style={styles.scoreSep}> – </Text>
          <Text style={styles.scoreMain}>{setsWonOpp}</Text>
          <Text style={styles.scoreUnit}>sets</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreSecondary}>{totalMyScore}</Text>
          <Text style={styles.scoreSepSecondary}> – </Text>
          <Text style={styles.scoreSecondary}>{totalOppScore}</Text>
          <Text style={styles.scoreUnitSecondary}>pts</Text>
        </View>
      </View>

      {/* Zone 2 : Mon équipe */}
      <Text style={styles.cardLabel}>MON ÉQUIPE</Text>
      <View style={styles.teamCard}>

        <StatBar
          sectionLabel="POINTS MARQUÉS"
          value={playerPoints}
          total={totalMyScore}
          color={COLORS.greenLight}
          items={globalStats.actions.points}
        />

        <View style={styles.sectionDivider} />

        <StatBar
          sectionLabel="FAUTES"
          value={teamFaults}
          total={totalOppScore}
          color={COLORS.redLight}
          items={globalStats.actions.faults}
        />

        {globalStats.actions.neutral.length > 0 && (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.statSection}>
              <Text style={styles.statSectionLabel}>ACTIONS NEUTRES</Text>
              <View style={[styles.chipsRow, { marginTop: SPACING.sm }]}>
                {globalStats.actions.neutral.map(a => (
                  <Chip key={a.key} label={a.label} count={a.count} color={COLORS.textSecondary} />
                ))}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Zone 3 : Adversaire */}
      <Text style={styles.cardLabel}>ADVERSAIRE</Text>
      <View style={styles.oppCard}>
        <View style={[styles.oppTile, { borderColor: `${COLORS.yellow}33`, backgroundColor: `${COLORS.yellow}11` }]}>
          <Text style={[styles.oppTileValue, { color: COLORS.yellow }]}>{oppActual}</Text>
          <Text style={styles.oppTileLabel}>Points marqués</Text>
        </View>
        <View style={[styles.oppTile, { borderColor: `${COLORS.textSecondary}33`, backgroundColor: `${COLORS.textSecondary}11` }]}>
          <Text style={[styles.oppTileValue, { color: COLORS.textSecondary }]}>{oppFaults}</Text>
          <Text style={styles.oppTileLabel}>Fautes</Text>
        </View>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const LIVE_ACTION_LABELS: Record<string, string> = {
  attack_pt:    'Attaque',
  ace:          'Ace',
  block_pt:     'Contre',
  relance_pt:   'Relance',
  attack_fault: 'Faute attaque',
  serve_fault:  'Faute service',
  recv_fault:   'Err. réception',
  fault:        'Faute',
  good_recv:    'Bonne récept.',
  bad_recv:     'Mauvaise récept.',
  block_touch:  'Contre touché',
  serve_in:     'Service réussi',
  attack_no_pt: 'Attaque (sans pt)',
};

type SetsTabProps = { data: LiveMatchAnalysis };
const SetsTab = ({ data }: SetsTabProps) => {
  const [expandedSet, setExpandedSet] = useState<number | null>(null);

  const playerMap = useMemo(() => {
    const m = new Map<number, string>();
    data.players.forEach(p => m.set(p.playerId, p.name));
    return m;
  }, [data.players]);

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
      {data.sets.map(set => {
        const expanded  = expandedSet === set.setNumber;
        const won       = set.wonBy === 'mine';
        const scoreColor = won ? COLORS.greenLight : COLORS.redLight;

        const playerPoints = set.stats.actions.points.reduce((a, x) => a + x.count, 0);
        const teamFaults   = set.stats.actions.faults.reduce((a, x) => a + x.count, 0);
        const oppActual    = Math.max(0, set.oppScore - teamFaults);
        const oppFaults    = Math.max(0, set.myScore - playerPoints);

        return (
          <View key={set.setNumber} style={styles.setAccordion}>
            <TouchableOpacity
              style={styles.setHeader}
              onPress={() => setExpandedSet(expanded ? null : set.setNumber)}
              activeOpacity={0.7}
            >
              <Text style={styles.setTitle}>Set {set.setNumber}</Text>
              <Text style={[styles.setScore, { color: scoreColor }]}>
                {set.myScore} – {set.oppScore}
              </Text>
              <Text style={styles.setChevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expanded && (
              <View style={styles.setContent}>

                {/* Stats par set */}
                <StatBar
                  sectionLabel="POINTS MARQUÉS"
                  value={playerPoints}
                  total={set.myScore}
                  color={COLORS.greenLight}
                  items={set.stats.actions.points}
                />
                <View style={styles.sectionDivider} />
                <StatBar
                  sectionLabel="FAUTES"
                  value={teamFaults}
                  total={set.oppScore}
                  color={COLORS.redLight}
                  items={set.stats.actions.faults}
                />
                {set.stats.actions.neutral.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.statSection}>
                      <Text style={styles.statSectionLabel}>ACTIONS NEUTRES</Text>
                      <View style={[styles.chipsRow, { marginTop: SPACING.sm }]}>
                        {set.stats.actions.neutral.map(a => (
                          <Chip key={a.key} label={a.label} count={a.count} color={COLORS.textSecondary} />
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {/* Adversaire par set */}
                <View style={styles.setAdversaireHeader}>
                  <Text style={styles.timelineLabel}>ADVERSAIRE</Text>
                </View>
                <View style={[styles.oppCard, { paddingHorizontal: SPACING.md }]}>
                  <View style={[styles.oppTile, { borderColor: `${COLORS.yellow}33`, backgroundColor: `${COLORS.yellow}11` }]}>
                    <Text style={[styles.oppTileValue, { color: COLORS.yellow }]}>{oppActual}</Text>
                    <Text style={styles.oppTileLabel}>Points marqués</Text>
                  </View>
                  <View style={[styles.oppTile, { borderColor: `${COLORS.textSecondary}33`, backgroundColor: `${COLORS.textSecondary}11` }]}>
                    <Text style={[styles.oppTileValue, { color: COLORS.textSecondary }]}>{oppFaults}</Text>
                    <Text style={styles.oppTileLabel}>Fautes</Text>
                  </View>
                </View>

                {/* Timeline */}
                {set.timeline.length > 0 && (
                  <View style={styles.timelineSection}>
                    <Text style={styles.timelineLabel}>ÉVOLUTION DU SCORE</Text>
                    <SetGraph
                      timeline={set.timeline}
                      finalMyScore={set.myScore}
                      finalOppScore={set.oppScore}
                    />

                    <Text style={[styles.timelineLabel, { marginTop: SPACING.md }]}>JOURNAL DU SET</Text>
                    {set.timeline.map((entry, i) => {
                      const isMine     = entry.playerId !== null;
                      const playerName = entry.playerId !== null
                        ? (playerMap.get(entry.playerId) ?? `#${entry.playerId}`)
                        : 'Adversaire';
                      const actionLabel = LIVE_ACTION_LABELS[entry.action] ?? entry.action;
                      return (
                        <View key={i} style={[styles.journalRow, isMine ? styles.journalRowMine : styles.journalRowOpp]}>
                          <Text style={styles.journalScore}>{entry.myScore}–{entry.oppScore}</Text>
                          <Text style={[styles.journalAction, { color: isMine ? COLORS.textPrimary : COLORS.textMuted }]}>
                            {actionLabel}
                          </Text>
                          <Text style={styles.journalPlayer} numberOfLines={1}>{playerName}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const PlaceholderTab = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>À venir</Text>
  </View>
);

const LiveMatchAnalysisScreen = ({ matchId, matchDate, onBack }: Props) => {
  const [data, setData]           = useState<LiveMatchAnalysis | null>(null);
  const [status, setStatus]       = useState<'loading' | 'error' | 'not_found' | 'ok'>('loading');
  const [activeTab, setActiveTab] = useState<TabId>('resume');

  const load = useCallback(() => {
    setStatus('loading');
    setData(null);
    getLiveMatchAnalysis(matchId)
      .then(d => { setData(d); setStatus('ok'); })
      .catch((err: Error & { status?: number }) => {
        setStatus(err.status === 404 ? 'not_found' : 'error');
      });
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Matchs</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatDate(matchDate)}</Text>
        <Text style={styles.headerSubtitle}>Analyse live</Text>
      </View>

      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
        </View>
      )}

      {status === 'not_found' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Pas de stats live pour ce match.</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Impossible de charger l'analyse live.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ok' && data !== null && (
        <>
          <View style={styles.tabBar}>
            {TABS.map(t => {
              const isActive = t.id === activeTab;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(t.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {t.label}
                  </Text>
                  <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.screenContainer}>
            {activeTab === 'resume'  && <ResumeTab data={data} />}
            {activeTab === 'sets'    && <SetsTab data={data} />}
            {activeTab === 'players' && <PlaceholderTab />}
            {activeTab === 'opp'     && <PlaceholderTab />}
          </View>
        </>
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
    padding: SPACING.xxl,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.blue,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tabLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.blue,
    fontWeight: '500',
  },
  tabIndicator: {
    height: 2,
    width: '60%',
    marginTop: 4,
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  tabIndicatorActive: {
    backgroundColor: COLORS.blue,
  },
  screenContainer: {
    flex: 1,
  },
  tabScroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  resultBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
  },
  resultBadgeWin: {
    backgroundColor: `${COLORS.green}22`,
    borderColor: `${COLORS.green}44`,
  },
  resultBadgeLoss: {
    backgroundColor: `${COLORS.red}22`,
    borderColor: `${COLORS.red}44`,
  },
  resultBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultBadgeTextWin: {
    color: COLORS.greenLight,
  },
  resultBadgeTextLoss: {
    color: COLORS.redLight,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreMain: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scoreSep: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  scoreUnit: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  scoreSecondary: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  scoreSepSecondary: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textMuted,
  },
  scoreUnitSecondary: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  cardLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  teamCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  oppCard: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  oppTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 2,
  },
  oppTileValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
  },
  oppTileLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  statSection: {
    padding: SPACING.md,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statSectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  statRatio: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.bgInput,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minWidth: 72,
  },
  chipCount: {
    fontSize: 28,
    fontWeight: '700',
  },
  chipLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  emptySection: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  oppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  oppLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  oppValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  setAccordion: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  setTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  setScore: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  setChevron: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  setContent: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  setAdversaireHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  timelineSection: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timelineLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  journalRowMine: {
    backgroundColor: 'transparent',
  },
  journalRowOpp: {
    backgroundColor: `${COLORS.bgInput}66`,
  },
  journalScore: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
    width: 42,
  },
  journalAction: {
    fontSize: FONT_SIZE.sm,
    flex: 1,
  },
  journalPlayer: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    maxWidth: 120,
    textAlign: 'right',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
  },
});

export default LiveMatchAnalysisScreen;
