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
    () => Object.values(state.sets).flat().filter(e => e.team === activeTeam),
    [state.sets, activeTeam],
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

  // Attaques d'un joueur groupées par position du joueur → trajectoire (zoneStart→zone arrivée).
  const playerAttackGroups = (playerId: number) => {
    const groups = new Map<number, {
      pos: number; total: number; points: number;
      trajs: Map<string, { zoneStart: number; land: number; total: number; points: number }>;
    }>();
    for (const e of teamEvents) {
      if (e.playerId !== playerId) continue;
      if (e.zone === null || e.zoneStart === null) continue;
      if (e.actionKey !== 'attack_pt' && e.actionKey !== 'attack_no_pt') continue;
      const pos = e.playerPos;
      if (pos === null) continue;
      const isPoint = e.actionKey === 'attack_pt';
      let g = groups.get(pos);
      if (!g) { g = { pos, total: 0, points: 0, trajs: new Map() }; groups.set(pos, g); }
      g.total += 1; if (isPoint) g.points += 1;
      const trajKey = `${e.zoneStart}-${e.zone}`;
      let t = g.trajs.get(trajKey);
      if (!t) { t = { zoneStart: e.zoneStart, land: e.zone, total: 0, points: 0 }; g.trajs.set(trajKey, t); }
      t.total += 1; if (isPoint) t.points += 1;
    }
    return [...groups.values()]
      .map(g => ({ ...g, trajs: [...g.trajs.values()].sort((a, b) => b.total - a.total || a.zoneStart - b.zoneStart || a.land - b.land) }))
      .sort((a, b) => a.pos - b.pos);
  };

  // Services d'un joueur groupés par zone d'arrivée → % ace.
  const playerServiceZones = (playerId: number) => {
    const m = new Map<number, { land: number; total: number; points: number }>();
    for (const e of teamEvents) {
      if (e.playerId !== playerId) continue;
      if (e.zone === null) continue;
      if (e.actionKey !== 'ace' && e.actionKey !== 'serve_in') continue;
      let r = m.get(e.zone);
      if (!r) { r = { land: e.zone, total: 0, points: 0 }; m.set(e.zone, r); }
      r.total += 1; if (e.actionKey === 'ace') r.points += 1;
    }
    return [...m.values()].sort((a, b) => b.total - a.total || a.land - b.land);
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
            const services = expanded ? playerServiceZones(p.playerId) : [];
            return (
              <View
                key={p.playerId}
                style={expanded && [
                  styles.playerBlockExpanded,
                  { borderColor: `${accent}88`, borderLeftColor: accent },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.playerRow,
                    expanded && [styles.playerRowExpanded, { backgroundColor: `${accent}1a` }],
                  ]}
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
                    <Text style={styles.playerDetailLabel}>ATTAQUE — % POINT PAR ZONE</Text>
                    {groups.length === 0 ? (
                      <Text style={styles.smallEmpty}>Aucune attaque avec trajectoire saisie.</Text>
                    ) : (
                      groups.map(g => (
                        <View key={`pa-${g.pos}`} style={styles.trajGroup}>
                          <View style={styles.trajHeader}>
                            <Text style={styles.trajTitle}>P{g.pos}</Text>
                            <Text style={[styles.trajPct, { color: COLORS.green }]}>
                              {pct(g.points, g.total)} · {g.points}/{g.total}
                            </Text>
                          </View>
                          {g.trajs.map(t => (
                            <View key={`pa-${g.pos}-${t.zoneStart}-${t.land}`} style={styles.trajRow}>
                              <Text style={styles.trajRowLabel}>Z{t.zoneStart}→Z{t.land}</Text>
                              <View style={styles.bar}>
                                <View style={[styles.barFill, { width: `${pctNum(t.points, t.total)}%`, backgroundColor: COLORS.green }]} />
                              </View>
                              <Text style={styles.trajRowVal}>{pct(t.points, t.total)} ({t.points}/{t.total})</Text>
                            </View>
                          ))}
                        </View>
                      ))
                    )}

                    <Text style={[styles.playerDetailLabel, styles.serviceLabel]}>SERVICE — ACE PAR ZONE</Text>
                    {services.length === 0 ? (
                      <Text style={styles.smallEmpty}>Aucun service avec zone saisie.</Text>
                    ) : (
                      <View style={styles.trajGroup}>
                        {services.map(s => (
                          <View key={`srv-${s.land}`} style={styles.trajRow}>
                            <Text style={styles.trajRowLabel}>Zone {s.land}</Text>
                            <View style={styles.bar}>
                              <View style={[styles.barFill, { width: `${pctNum(s.points, s.total)}%`, backgroundColor: COLORS.yellow }]} />
                            </View>
                            <Text style={styles.trajRowVal}>{pct(s.points, s.total)} ace ({s.points}/{s.total})</Text>
                          </View>
                        ))}
                      </View>
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
  // Joueur déroulé : ligne + détail regroupés dans une carte bordée (couleur équipe)
  playerBlockExpanded: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  playerRowExpanded: {
    borderWidth: 0,
    borderRadius: 0,
    marginBottom: 0,
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
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.bgInput,
  },
  serviceLabel: { marginTop: SPACING.sm },
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
