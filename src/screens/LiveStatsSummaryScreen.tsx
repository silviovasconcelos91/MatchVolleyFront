import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLiveStats } from '../context/LiveStatsContext';
import { LIVE_ACTIONS, LIVE_ACTION_BY_KEY } from '../data/liveStats';
import type { LiveTeam, LiveActionKey } from '../data/liveStats';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type PlayerAgg = {
  playerId: number;
  jersey: number;
  name: string;
  points: number;
  faults: number;
  total: number;
  byKey: Partial<Record<LiveActionKey, number>>;
};

const pct = (num: number, den: number): string => (den > 0 ? `${Math.round((num / den) * 100)}%` : '—');
const pctNum = (num: number, den: number): number => (den > 0 ? Math.round((num / den) * 100) : 0);

const LiveStatsSummaryScreen = () => {
  const { state } = useLiveStats();
  const [activeTeam, setActiveTeam] = useState<LiveTeam>('mine');
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);

  const teamEvents = useMemo(
    () => state.events.filter(e => e.team === activeTeam),
    [state.events, activeTeam],
  );

  // Agrégat par joueur.
  const players = useMemo(() => {
    const map = new Map<number, PlayerAgg>();
    for (const e of teamEvents) {
      let agg = map.get(e.playerId);
      if (!agg) {
        agg = { playerId: e.playerId, jersey: e.jersey, name: e.playerName, points: 0, faults: 0, total: 0, byKey: {} };
        map.set(e.playerId, agg);
      }
      agg.total += 1;
      agg.byKey[e.actionKey] = (agg.byKey[e.actionKey] ?? 0) + 1;
      const cat = LIVE_ACTION_BY_KEY[e.actionKey].category;
      if (cat === 'point') agg.points += 1;
      else if (cat === 'fault') agg.faults += 1;
    }
    return [...map.values()].sort((a, b) => b.points - a.points || b.total - a.total || a.jersey - b.jersey);
  }, [teamEvents]);

  // Trajectoires d'attaque d'un joueur précis (zone départ → arrivée).
  const playerAttackGroups = (playerId: number) => {
    const groups = new Map<number, {
      start: number; total: number; points: number;
      lands: Map<number, { land: number; total: number; points: number }>;
    }>();
    for (const e of teamEvents) {
      if (e.playerId !== playerId) continue;
      if (e.zoneStart === null || e.zone === null) continue;
      if (e.actionKey !== 'attack_pt' && e.actionKey !== 'attack_no_pt') continue;
      const isPoint = e.actionKey === 'attack_pt';
      let g = groups.get(e.zoneStart);
      if (!g) { g = { start: e.zoneStart, total: 0, points: 0, lands: new Map() }; groups.set(e.zoneStart, g); }
      g.total += 1; if (isPoint) g.points += 1;
      let l = g.lands.get(e.zone);
      if (!l) { l = { land: e.zone, total: 0, points: 0 }; g.lands.set(e.zone, l); }
      l.total += 1; if (isPoint) l.points += 1;
    }
    return [...groups.values()]
      .map(g => ({ ...g, lands: [...g.lands.values()].sort((a, b) => b.total - a.total || a.land - b.land) }))
      .sort((a, b) => a.start - b.start);
  };

  const accent = activeTeam === 'mine' ? COLORS.blue : COLORS.pink;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Sélecteur d'équipe */}
      <View style={styles.segment}>
        {(['mine', 'opp'] as LiveTeam[]).map(t => {
          const isActive = t === activeTeam;
          const c = t === 'mine' ? COLORS.blue : COLORS.pink;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.segmentItem, isActive && { backgroundColor: `${c}33` }]}
              onPress={() => { setActiveTeam(t); setExpandedPlayer(null); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {t === 'mine' ? 'Mon équipe' : 'Adversaire'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {teamEvents.length === 0 ? (
        <Text style={styles.empty}>Aucune saisie pour cette équipe.</Text>
      ) : (
        <>
          {/* Détail par joueur — tap pour voir les trajectoires d'attaque */}
          <Text style={styles.sectionLabel}>PAR JOUEUR</Text>
          {players.map(p => {
            const expanded = expandedPlayer === p.playerId;
            const groups = expanded ? playerAttackGroups(p.playerId) : [];
            return (
              <View key={p.playerId}>
                <TouchableOpacity
                  style={styles.playerRow}
                  onPress={() => setExpandedPlayer(expanded ? null : p.playerId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.playerNumBadge, { borderColor: `${accent}66`, backgroundColor: `${accent}1a` }]}>
                    <Text style={[styles.playerNum, { color: accent }]}>{p.jersey}</Text>
                  </View>
                  <View style={styles.playerBody}>
                    <View style={styles.playerHeader}>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {activeTeam === 'opp' ? `Adversaire #${p.jersey}` : p.name}
                      </Text>
                      <Text style={styles.playerScore}>
                        <Text style={{ color: COLORS.green }}>{p.points} pt</Text>
                        <Text style={styles.playerScoreDot}> · </Text>
                        <Text style={{ color: COLORS.redLight }}>{p.faults} f</Text>
                        <Text style={styles.chevron}>{expanded ? '  ▾' : '  ▸'}</Text>
                      </Text>
                    </View>
                    <Text style={styles.playerBreakdown} numberOfLines={2}>
                      {LIVE_ACTIONS.filter(a => (p.byKey[a.key] ?? 0) > 0)
                        .map(a => `${a.label} ${p.byKey[a.key]}`)
                        .join('  ·  ')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.playerDetail}>
                    <Text style={styles.playerDetailLabel}>ATTAQUE — % POINT PAR TRAJECTOIRE</Text>
                    {groups.length === 0 ? (
                      <Text style={styles.smallEmpty}>Aucune attaque avec trajectoire saisie.</Text>
                    ) : (
                      groups.map(g => (
                        <View key={`pa-${g.start}`} style={styles.trajGroup}>
                          <View style={styles.trajHeader}>
                            <Text style={styles.trajTitle}>Départ · Zone {g.start}</Text>
                            <Text style={[styles.trajPct, { color: COLORS.green }]}>
                              {pct(g.points, g.total)} · {g.points}/{g.total}
                            </Text>
                          </View>
                          {g.lands.map(l => (
                            <View key={`pa-${g.start}-${l.land}`} style={styles.trajRow}>
                              <Text style={styles.trajRowLabel}>Z{g.start}→Z{l.land}</Text>
                              <View style={styles.bar}>
                                <View style={[styles.barFill, { width: `${pctNum(l.points, l.total)}%`, backgroundColor: COLORS.green }]} />
                              </View>
                              <Text style={styles.trajRowVal}>{pct(l.points, l.total)} ({l.points}/{l.total})</Text>
                            </View>
                          ))}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
    marginBottom: SPACING.md,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  empty: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.xxl,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    gap: 2,
  },
  kpiValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },

  typeGroup: {
    marginBottom: SPACING.xs,
  },
  typeGroupLabel: {
    fontSize: FONT_SIZE.xs,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  typeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.bgInput,
  },
  typeChipNum: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  typeChipLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  playerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  playerNumBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNum: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  playerBody: {
    flex: 1,
    minWidth: 0,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  playerScore: {
    fontSize: FONT_SIZE.md,
  },
  playerScoreDot: {
    color: COLORS.textMuted,
  },
  chevron: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },
  playerDetail: {
    marginTop: -SPACING.xs,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
  },
  playerDetailLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  playerBreakdown: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  smallEmpty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    paddingVertical: SPACING.sm,
  },
  trajGroup: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  trajHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  trajTitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  trajPct: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  trajRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  trajRowLabel: {
    width: 92,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  bar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bgInput,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  trajRowVal: {
    width: 86,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
});

export default LiveStatsSummaryScreen;
