import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useLiveStats } from '../context/LiveStatsContext';
import { LIVE_ACTIONS, LIVE_ACTION_BY_KEY } from '../data/liveStats';
import type { LiveTeam, LiveActionKey, LiveActionCategory } from '../data/liveStats';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

const CATEGORY_ORDER: LiveActionCategory[] = ['point', 'fault', 'neutral'];
const CATEGORY_LABEL: Record<LiveActionCategory, string> = {
  point:   'POINTS REMPORTÉS',
  fault:   'FAUTES',
  neutral: 'SANS POINT',
};
const CATEGORY_COLOR: Record<LiveActionCategory, string> = {
  point:   COLORS.green,
  fault:   COLORS.red,
  neutral: COLORS.textMuted,
};

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

const LiveStatsSummaryScreen = () => {
  const { state } = useLiveStats();
  const [activeTeam, setActiveTeam] = useState<LiveTeam>('mine');

  const teamEvents = useMemo(
    () => state.events.filter(e => e.team === activeTeam),
    [state.events, activeTeam],
  );

  // Comptage par type d'action sur l'équipe active.
  const byType = useMemo(() => {
    const map: Partial<Record<LiveActionKey, number>> = {};
    for (const e of teamEvents) map[e.actionKey] = (map[e.actionKey] ?? 0) + 1;
    return map;
  }, [teamEvents]);

  const count = (...keys: LiveActionKey[]): number => keys.reduce((s, k) => s + (byType[k] ?? 0), 0);

  // KPIs d'équipe.
  const kpis = useMemo(() => {
    const points = teamEvents.filter(e => LIVE_ACTION_BY_KEY[e.actionKey].category === 'point').length;
    const faults = teamEvents.filter(e => LIVE_ACTION_BY_KEY[e.actionKey].category === 'fault').length;
    const attacks = count('attack_pt', 'attack_out', 'attack_net', 'attack_no_pt');
    const kills   = count('attack_pt');
    const serves  = count('ace', 'serve_in', 'serve_out', 'serve_net');
    const serveErr = count('serve_out', 'serve_net');
    const recvTotal = count('good_recv', 'bad_recv', 'recv_shank');
    const goodRecv  = count('good_recv');
    return {
      points, faults,
      attacks, kills, attackPct: pct(kills, attacks),
      serves, aces: count('ace'), serveErr,
      recvTotal, recvPct: pct(goodRecv, recvTotal),
      total: teamEvents.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamEvents, byType]);

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
              onPress={() => setActiveTeam(t)}
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
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: COLORS.green }]}>{kpis.points}</Text>
              <Text style={styles.kpiLabel}>Points</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: COLORS.redLight }]}>{kpis.faults}</Text>
              <Text style={styles.kpiLabel}>Fautes</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: accent }]}>{kpis.attackPct}</Text>
              <Text style={styles.kpiLabel}>Att. {kpis.kills}/{kpis.attacks}</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: accent }]}>{kpis.aces}</Text>
              <Text style={styles.kpiLabel}>Aces · {kpis.serveErr} err</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: accent }]}>{kpis.recvPct}</Text>
              <Text style={styles.kpiLabel}>Récept. ({kpis.recvTotal})</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={[styles.kpiValue, { color: COLORS.textPrimary }]}>{kpis.total}</Text>
              <Text style={styles.kpiLabel}>Actions</Text>
            </View>
          </View>

          {/* Détail par type */}
          <Text style={styles.sectionLabel}>PAR TYPE</Text>
          {CATEGORY_ORDER.map(cat => {
            const rows = LIVE_ACTIONS.filter(a => a.category === cat && (byType[a.key] ?? 0) > 0);
            if (rows.length === 0) return null;
            return (
              <View key={cat} style={styles.typeGroup}>
                <Text style={[styles.typeGroupLabel, { color: CATEGORY_COLOR[cat] }]}>{CATEGORY_LABEL[cat]}</Text>
                <View style={styles.typeWrap}>
                  {rows.map(a => (
                    <View key={a.key} style={[styles.typeChip, { borderColor: `${CATEGORY_COLOR[cat]}44` }]}>
                      <Text style={[styles.typeChipNum, { color: CATEGORY_COLOR[cat] }]}>{byType[a.key]}</Text>
                      <Text style={styles.typeChipLabel}>{a.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Détail par joueur */}
          <Text style={styles.sectionLabel}>PAR JOUEUR</Text>
          {players.map(p => (
            <View key={p.playerId} style={styles.playerRow}>
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
                  </Text>
                </View>
                <Text style={styles.playerBreakdown} numberOfLines={2}>
                  {LIVE_ACTIONS.filter(a => (p.byKey[a.key] ?? 0) > 0)
                    .map(a => `${a.label} ${p.byKey[a.key]}`)
                    .join('  ·  ')}
                </Text>
              </View>
            </View>
          ))}
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
  playerBreakdown: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default LiveStatsSummaryScreen;
