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

  const { playerNameMap, jerseyMap } = useMemo(() => {
    const playerNameMap = new Map<number, string>();
    const jerseyMap     = new Map<number, number>();
    data.players.forEach(p => {
      playerNameMap.set(p.playerId, p.name);
      jerseyMap.set(p.playerId, p.jersey);
    });
    return { playerNameMap, jerseyMap };
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
                      const isMine      = entry.playerId !== null;
                      const scored      = i === 0
                        ? entry.myScore > 0
                        : entry.myScore > set.timeline[i - 1].myScore;
                      const playerName  = entry.playerId !== null
                        ? (playerNameMap.get(entry.playerId) ?? `#${entry.playerId}`)
                        : 'Adversaire';
                      const jersey      = entry.playerId !== null
                        ? jerseyMap.get(entry.playerId)
                        : undefined;
                      const actionLabel = LIVE_ACTION_LABELS[entry.action] ?? entry.action;
                      const borderColor = scored ? COLORS.green : COLORS.red;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.journalRow,
                            isMine ? styles.journalRowMine : styles.journalRowOpp,
                            { borderLeftWidth: 3, borderLeftColor: borderColor },
                          ]}
                        >
                          <View style={[
                            styles.jerseyBadge,
                            { borderColor: isMine ? `${COLORS.blue}55` : `${COLORS.textMuted}44`,
                              backgroundColor: isMine ? `${COLORS.blue}18` : `${COLORS.bgInput}` },
                          ]}>
                            <Text style={[styles.jerseyBadgeText, { color: isMine ? COLORS.blue : COLORS.textMuted }]}>
                              {jersey !== undefined ? `#${jersey}` : 'Adv'}
                            </Text>
                          </View>
                          <Text style={styles.journalScore}>{entry.myScore}–{entry.oppScore}</Text>
                          <Text style={[styles.journalAction, { color: scored ? COLORS.textPrimary : COLORS.textMuted }]}>
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

type PlayersTabProps = { data: LiveMatchAnalysis };

const PlayersTab = ({ data }: PlayersTabProps) => {
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);

  const totalMatchPts = data.globalStats.actions.points.reduce(
    (a, x) => a + x.count, 0,
  );
  const totalMatchFaults = data.globalStats.actions.faults.reduce(
    (a, x) => a + x.count, 0,
  );

  const sorted = useMemo(
    () =>
      [...data.players].sort(
        (a, b) =>
          b.matchStats.actions.points.reduce((s, x) => s + x.count, 0) -
          a.matchStats.actions.points.reduce((s, x) => s + x.count, 0) ||
          a.jersey - b.jersey,
      ),
    [data.players],
  );

  if (sorted.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Aucun joueur enregistré pour ce match.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
      {sorted.map(player => {
        const expanded = expandedPlayer === player.playerId;
        const playerPts = player.matchStats.actions.points.reduce(
          (a, x) => a + x.count, 0,
        );
        const playerFaults = player.matchStats.actions.faults.reduce(
          (a, x) => a + x.count, 0,
        );

        return (
          <View key={player.playerId} style={styles.setAccordion}>
            {/* Header : badge + nom + chevron */}
            <TouchableOpacity
              style={styles.playerAccordionHeader}
              onPress={() =>
                setExpandedPlayer(expanded ? null : player.playerId)
              }
              activeOpacity={0.7}
            >
              <View style={styles.playerBadge}>
                <Text style={styles.playerBadgeText}>#{player.jersey}</Text>
              </View>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.setChevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Stats globales match — toujours visibles */}
            <View style={styles.setContent}>
              <StatBar
                sectionLabel="POINTS MARQUÉS"
                value={playerPts}
                total={totalMatchPts}
                color={COLORS.greenLight}
                items={player.matchStats.actions.points}
              />
              <View style={styles.sectionDivider} />
              <StatBar
                sectionLabel="FAUTES"
                value={playerFaults}
                total={totalMatchFaults}
                color={COLORS.redLight}
                items={player.matchStats.actions.faults}
              />
              {player.matchStats.actions.neutral.length > 0 && (
                <>
                  <View style={styles.sectionDivider} />
                  <View style={styles.statSection}>
                    <Text style={styles.statSectionLabel}>ACTIONS NEUTRES</Text>
                    <View style={[styles.chipsRow, { marginTop: SPACING.sm }]}>
                      {player.matchStats.actions.neutral.map(a => (
                        <Chip
                          key={a.key}
                          label={a.label}
                          count={a.count}
                          color={COLORS.textSecondary}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Détail par set — visible uniquement quand expanded */}
            {expanded &&
              player.setStats.map(ss => {
                const setData = data.sets.find(
                  s => s.setNumber === ss.setNumber,
                );
                const setTotalPts =
                  setData?.stats.actions.points.reduce(
                    (a, x) => a + x.count, 0,
                  ) ?? 0;
                const setTotalFaults =
                  setData?.stats.actions.faults.reduce(
                    (a, x) => a + x.count, 0,
                  ) ?? 0;
                const setPts = ss.stats.actions.points.reduce(
                  (a, x) => a + x.count, 0,
                );
                const setFaults = ss.stats.actions.faults.reduce(
                  (a, x) => a + x.count, 0,
                );

                // ── Trajectoires d'attaque ──────────────────────────────
                // Grouper par position joueur → (from→to) → count total.
                // Ignorer les AttackZone sans zone (from/to/playerPosition null).
                const posMap = new Map<
                  number,
                  Map<string, { from: number; to: number; count: number }>
                >();
                for (const a of ss.stats.attacks) {
                  if (a.playerPosition === null || a.from === null || a.to === null) continue;
                  let trajMap = posMap.get(a.playerPosition);
                  if (!trajMap) {
                    trajMap = new Map();
                    posMap.set(a.playerPosition, trajMap);
                  }
                  const key = `${a.from}-${a.to}`;
                  const existing = trajMap.get(key);
                  if (existing) {
                    existing.count += a.count;
                  } else {
                    trajMap.set(key, { from: a.from, to: a.to, count: a.count });
                  }
                }
                const attackGroups = [...posMap.entries()]
                  .sort(([a], [b]) => a - b)
                  .map(([pos, trajMap]) => ({
                    pos,
                    trajs: [...trajMap.values()].sort((a, b) => b.count - a.count),
                  }));

                // ── Aces par zone ───────────────────────────────────────
                const totalSetAces = ss.stats.acesByZone.reduce(
                  (a, z) => a + z.count, 0,
                );
                const sortedAces = [...ss.stats.acesByZone].sort(
                  (a, b) => b.count - a.count,
                );

                return (
                  <View key={ss.setNumber} style={styles.setExpandedSection}>
                    <Text style={styles.setLabel}>SET {ss.setNumber}</Text>
                    <StatBar
                      sectionLabel="POINTS MARQUÉS"
                      value={setPts}
                      total={setTotalPts}
                      color={COLORS.greenLight}
                      items={ss.stats.actions.points}
                    />
                    <View style={styles.sectionDivider} />
                    <StatBar
                      sectionLabel="FAUTES"
                      value={setFaults}
                      total={setTotalFaults}
                      color={COLORS.redLight}
                      items={ss.stats.actions.faults}
                    />
                    {ss.stats.actions.neutral.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            ACTIONS NEUTRES
                          </Text>
                          <View
                            style={[
                              styles.chipsRow,
                              { marginTop: SPACING.sm },
                            ]}
                          >
                            {ss.stats.actions.neutral.map(a => (
                              <Chip
                                key={a.key}
                                label={a.label}
                                count={a.count}
                                color={COLORS.textSecondary}
                              />
                            ))}
                          </View>
                        </View>
                      </>
                    )}

                    {/* ── Trajectoires d'attaque ── */}
                    {attackGroups.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            TRAJECTOIRES D'ATTAQUE
                          </Text>
                          {attackGroups.map(({ pos, trajs }) => (
                            <View key={pos} style={styles.attackTrajectoryRow}>
                              <Text style={styles.attackPosLabel}>P{pos} :</Text>
                              <Text style={styles.attackTrajList}>
                                {trajs
                                  .map(t => `Z${t.from}→Z${t.to} (${t.count})`)
                                  .join('  ')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* ── Aces par zone ── */}
                    {sortedAces.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            ACES PAR ZONE
                          </Text>
                          {sortedAces.map(az => {
                            const pct =
                              totalSetAces > 0
                                ? Math.round((az.count / totalSetAces) * 100)
                                : 0;
                            return (
                              <View key={az.zone} style={styles.trajRow}>
                                <Text style={styles.trajRowLabel}>
                                  Zone {az.zone}
                                </Text>
                                <View style={styles.bar}>
                                  <View
                                    style={[
                                      styles.barFillYellow,
                                      { width: `${pct}%` },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.trajRowVal}>
                                  {pct}% ({az.count})
                                </Text>
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
      })}
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

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
            {activeTab === 'players' && <PlayersTab data={data} />}
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
  jerseyBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  jerseyBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
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
  playerAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  playerBadge: {
    borderWidth: 1,
    borderColor: `${COLORS.blue}55`,
    backgroundColor: `${COLORS.blue}18`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 44,
    alignItems: 'center',
  },
  playerBadgeText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.blue,
  },
  playerNameText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  setExpandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  setLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
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
  trajRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  trajRowLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    width: 52,
  },
  bar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  barFillYellow: {
    height: 6,
    borderRadius: 4,
    backgroundColor: COLORS.yellow,
  },
  trajRowVal: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    width: 72,
    textAlign: 'right',
  },
  attackTrajectoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  attackPosLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    width: 32,
  },
  attackTrajList: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
});

export default LiveMatchAnalysisScreen;
