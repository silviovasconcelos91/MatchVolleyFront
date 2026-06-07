import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLiveStats } from '../context/LiveStatsContext';
import { useMatch } from '../context/MatchContext';
import { LIVE_ACTION_BY_KEY } from '../data/liveStats';
import type { LiveStatEvent } from '../data/liveStats';
import { getPositionColor, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { getTotalPoints, getTotalFaults, createEmptyStats } from '../data/players';
import type { ActionKey, PlayerStats } from '../data/players';
import PlayerAvatar from '../components/PlayerAvatar';

const LIVE_KEY_TO_ACTION: Partial<Record<string, ActionKey>> = {
  attack_pt:    'atk',
  ace:          'ace',
  block_pt:     'block',
  relance_pt:   'pt',
  attack_fault: 'atk_out',
  serve_fault:  'srv_out',
  recv_fault:   'recv',
  fault:        'fault',
};

function computeSetStatsFromLive(
  events: LiveStatEvent[],
  playerIds: number[],
): Record<number, PlayerStats> {
  const result: Record<number, PlayerStats> = {};
  for (const id of playerIds) result[id] = createEmptyStats();
  for (const e of events) {
    if (e.team !== 'mine') continue;
    const actionKey = LIVE_KEY_TO_ACTION[e.actionKey];
    if (!actionKey) continue;
    const s = result[e.playerId];
    if (s) s[actionKey]++;
  }
  return result;
}

function computeScoreFromLive(events: LiveStatEvent[]): { mine: number; opp: number } {
  let mine = 0, opp = 0;
  for (const e of events) {
    const cat = LIVE_ACTION_BY_KEY[e.actionKey].category;
    if (cat === 'point') { if (e.team === 'mine') mine++; else opp++; }
    else if (cat === 'fault') { if (e.team === 'mine') opp++; else mine++; }
  }
  return { mine, opp };
}

function sumStats(statsList: PlayerStats[]): PlayerStats {
  const total = createEmptyStats();
  for (const s of statsList) {
    total.pt      += s.pt;
    total.atk     += s.atk;
    total.block   += s.block;
    total.ace     += s.ace;
    total.atk_out += s.atk_out;
    total.srv_out += s.srv_out;
    total.recv    += s.recv;
    total.fault   += s.fault;
  }
  return total;
}

type SummaryChipProps = { label: string; value: number; color: string };
const SummaryChip = ({ label, value, color }: SummaryChipProps) => (
  <View style={[styles.summaryChip, { borderColor: `${color}44`, backgroundColor: `${color}22` }]}>
    <Text style={[styles.summaryChipText, { color }]}>{label} {value}</Text>
  </View>
);

type TeamSummaryProps = { myScore: number; oppScore: number; stats: PlayerStats };
const TeamSummary = ({ myScore, oppScore, stats }: TeamSummaryProps) => {
  const playerPoints = stats.pt + stats.atk + stats.block + stats.ace;
  const teamFaults   = stats.atk_out + stats.srv_out + stats.recv + stats.fault;
  const oppActual    = Math.max(0, oppScore - teamFaults);
  const oppFaults    = Math.max(0, myScore - playerPoints);
  return (
    <View style={styles.teamSummary}>
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryBlockLabel}>TOTAL DES POINTS</Text>
        <Text style={styles.summaryScoreText}>{myScore} – {oppScore}</Text>
      </View>
      <View style={styles.summarySeparator} />
      <View style={styles.summaryBlock}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryBlockLabel}>POINTS MARQUÉS</Text>
          <Text style={[styles.summaryBlockTotal, { color: COLORS.greenLight }]}>{playerPoints}</Text>
        </View>
        <View style={styles.summaryChips}>
          <SummaryChip label="Pt"   value={stats.pt}    color={COLORS.greenLight} />
          <SummaryChip label="Atk"  value={stats.atk}   color={COLORS.blue} />
          <SummaryChip label="Bloc" value={stats.block} color="#e040fb" />
          <SummaryChip label="Ace"  value={stats.ace}   color={COLORS.greenLight} />
        </View>
      </View>
      <View style={styles.summarySeparator} />
      <View style={styles.summaryBlock}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryBlockLabel}>FAUTES</Text>
          <Text style={[styles.summaryBlockTotal, { color: COLORS.redLight }]}>{teamFaults}</Text>
        </View>
        <View style={styles.summaryChips}>
          <SummaryChip label="Atk"   value={stats.atk_out} color={COLORS.redLight} />
          <SummaryChip label="Srv"   value={stats.srv_out} color={COLORS.redLight} />
          <SummaryChip label="Recv"  value={stats.recv}    color={COLORS.redLight} />
          <SummaryChip label="Faute" value={stats.fault}   color={COLORS.redLight} />
        </View>
      </View>
      <View style={styles.summarySeparator} />
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryBlockLabel}>ADVERSAIRE</Text>
        <View style={styles.summaryOppRow}>
          <Text style={styles.summaryOppLabel}>Points marqués</Text>
          <Text style={styles.summaryOppValue}>{oppActual}</Text>
        </View>
        <View style={styles.summaryOppRow}>
          <Text style={styles.summaryOppLabel}>Fautes</Text>
          <Text style={styles.summaryOppValue}>{oppFaults}</Text>
        </View>
      </View>
    </View>
  );
};

type CardProps = {
  name: string;
  numero: number;
  tacticalRole: string;
  onCourt: boolean;
  pos: number | null;
  color: string;
  stats: PlayerStats;
};
const PlayerCard = ({ name, numero, tacticalRole, onCourt, pos, color, stats }: CardProps) => {
  const totalPts    = getTotalPoints(stats);
  const totalFaults = getTotalFaults(stats);
  return (
    <View style={styles.playerCard}>
      <View style={styles.mainRow}>
        <PlayerAvatar name={name} color={color} size={34} />
        <View style={styles.playerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{name}</Text>
            {onCourt ? (
              <View style={[styles.badge, styles.badgeCourt]}>
                <Text style={styles.badgeCourtText}>P{pos}</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeBench]}>
                <Text style={styles.badgeBenchText}>banc</Text>
              </View>
            )}
          </View>
          <Text style={styles.playerRole}>{tacticalRole} · #{numero}</Text>
        </View>
        <View style={styles.totals}>
          <Text style={styles.totalPts}>{totalPts}</Text>
          {totalFaults > 0 && (
            <Text style={styles.totalFaults}>−{totalFaults}</Text>
          )}
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statChip, styles.chipGreen]}>
          <Text style={[styles.statChipText, { color: COLORS.greenLight }]}>Pt {stats.pt}</Text>
        </View>
        <View style={[styles.statChip, styles.chipBlue]}>
          <Text style={[styles.statChipText, { color: COLORS.blue }]}>Atk {stats.atk}</Text>
        </View>
        <View style={[styles.statChip, styles.chipPurple]}>
          <Text style={[styles.statChipText, { color: '#e040fb' }]}>Bloc {stats.block}</Text>
        </View>
        <View style={[styles.statChip, styles.chipGreen]}>
          <Text style={[styles.statChipText, { color: COLORS.greenLight }]}>Ace {stats.ace}</Text>
        </View>
        <View style={[styles.statChip, styles.chipRed]}>
          <Text style={[styles.statChipText, { color: COLORS.redLight }]}>
            Out {stats.atk_out + stats.srv_out}
          </Text>
        </View>
        {stats.recv > 0 && (
          <View style={[styles.statChip, styles.chipRed]}>
            <Text style={[styles.statChipText, { color: COLORS.redLight }]}>Recv {stats.recv}</Text>
          </View>
        )}
        {stats.fault > 0 && (
          <View style={[styles.statChip, styles.chipRed]}>
            <Text style={[styles.statChipText, { color: COLORS.redLight }]}>Faute {stats.fault}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const LiveMatchStatsScreen = () => {
  const { state: liveState } = useLiveStats();
  const { state: matchState } = useMatch();
  const { matchPlayers, rosterValidated } = matchState;
  const { sets, currentSet } = liveState;

  if (!rosterValidated) {
    return (
      <View style={styles.notReady}>
        <Text style={styles.notReadyText}>
          Valider l'équipe dans l'onglet Roster pour voir les statistiques.
        </Text>
      </View>
    );
  }

  const playerIds = matchPlayers.map(p => p.id);

  const currentSetEvents = sets[currentSet] ?? [];
  const setStatsMap      = computeSetStatsFromLive(currentSetEvents, playerIds);
  const setScore         = computeScoreFromLive(currentSetEvents);

  const sortedBySetPts = [...matchPlayers].sort(
    (a, b) =>
      getTotalPoints(setStatsMap[b.id] ?? createEmptyStats()) -
      getTotalPoints(setStatsMap[a.id] ?? createEmptyStats()),
  );

  const allEvents     = Object.values(sets).flat();
  const matchStatsMap = computeSetStatsFromLive(allEvents, playerIds);
  const matchScore    = Object.values(sets)
    .map(computeScoreFromLive)
    .reduce((acc, s) => ({ mine: acc.mine + s.mine, opp: acc.opp + s.opp }), { mine: 0, opp: 0 });

  const sortedByMatchPts = [...matchPlayers].sort(
    (a, b) =>
      getTotalPoints(matchStatsMap[b.id] ?? createEmptyStats()) -
      getTotalPoints(matchStatsMap[a.id] ?? createEmptyStats()),
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>SET {currentSet}</Text>
      <TeamSummary
        myScore={setScore.mine}
        oppScore={setScore.opp}
        stats={sumStats(Object.values(setStatsMap))}
      />
      {sortedBySetPts.map(player => (
        <PlayerCard
          key={`set-${player.id}`}
          name={player.name}
          numero={player.numero}
          tacticalRole={player.tacticalRole}
          onCourt={player.onCourt}
          pos={player.pos}
          color={getPositionColor(player.tacticalRole)}
          stats={setStatsMap[player.id] ?? createEmptyStats()}
        />
      ))}

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionLabel}>MATCH TOTAL</Text>
      <TeamSummary
        myScore={matchScore.mine}
        oppScore={matchScore.opp}
        stats={sumStats(Object.values(matchStatsMap))}
      />
      {sortedByMatchPts.map(player => (
        <PlayerCard
          key={`match-${player.id}`}
          name={player.name}
          numero={player.numero}
          tacticalRole={player.tacticalRole}
          onCourt={player.onCourt}
          pos={player.pos}
          color={getPositionColor(player.tacticalRole)}
          stats={matchStatsMap[player.id] ?? createEmptyStats()}
        />
      ))}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  notReady: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  notReadyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  teamSummary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryBlock: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  summarySeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  summaryBlockLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryScoreText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryBlockTotal: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  summaryChip: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  summaryChipText: {
    fontSize: FONT_SIZE.xs,
  },
  summaryOppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  summaryOppLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  summaryOppValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playerCard: {
    paddingVertical: SPACING.sm + 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  playerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playerRole: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
  badgeCourt: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: `${COLORS.blue}44`,
  },
  badgeCourtText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.blue,
  },
  badgeBench: {
    backgroundColor: `${COLORS.borderLight}22`,
    borderColor: COLORS.border,
  },
  badgeBenchText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  totals: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  totalPts: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.xxl * 1.1,
  },
  totalFaults: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.redLight,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginLeft: 34 + SPACING.md,
  },
  statChip: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statChipText: {
    fontSize: FONT_SIZE.xs,
  },
  chipBlue: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: `${COLORS.blue}44`,
  },
  chipPurple: {
    backgroundColor: '#e040fb22',
    borderColor: '#e040fb44',
  },
  chipGreen: {
    backgroundColor: `${COLORS.green}22`,
    borderColor: `${COLORS.green}44`,
  },
  chipRed: {
    backgroundColor: `${COLORS.red}22`,
    borderColor: `${COLORS.red}44`,
  },
});

export default LiveMatchStatsScreen;