import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Team } from '../../data/teams';
import { LIVE_ACTIONS, LIVE_ACTION_BY_KEY } from '../../data/liveStats';
import type { LiveTeam, LiveActionKey, LiveActionCategory } from '../../data/liveStats';
import { useLiveStats } from '../../context/LiveStatsContext';
import { useMatch } from '../../context/MatchContext';
import { getPositionColor, COLORS } from '../../constants/theme';
import { styles } from './LiveStatsScreen.styles';

type Props = { team: Team; onBack: () => void };

type CourtPlayer = { id: number; jersey: number; name: string; color: string };

type Target = { team: LiveTeam; player: CourtPlayer };

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

// Placement adversaire (pas de vraies positions) : jerseys 1-6 répartis sur les zones.
const ZONE_FILL_ORDER = [4, 3, 2, 5, 6, 1];

// Lignes affichées (haut → bas). Filet au centre du terrain.
const MINE_ROWS = [[4, 3, 2], [5, 6, 1]]; // avant (près filet) en haut, arrière en bas
const OPP_ROWS  = [[5, 6, 1], [4, 3, 2]]; // arrière en haut, avant (près filet) en bas

// Demi-terrain pour la zone d'arrivée. L'orientation suit la vue du coach :
// le filet est du côté du centre du terrain selon qui réalise l'action.
// Filet en haut → avant 4-3-2 en haut ; filet en bas → avant 4-3-2 en bas.
const ZONE_ROWS_NET_TOP    = [[4, 3, 2], [5, 6, 1]];
const ZONE_ROWS_NET_BOTTOM = [[5, 6, 1], [4, 3, 2]];

const buildCourt = (players: CourtPlayer[]): Record<number, CourtPlayer> => {
  const map: Record<number, CourtPlayer> = {};
  ZONE_FILL_ORDER.forEach((zone, i) => {
    const p = players[i];
    if (p) map[zone] = p;
  });
  return map;
};

const LiveStatsScreen = ({ team, onBack }: Props) => {
  const { state, actions } = useLiveStats();
  const { state: matchState } = useMatch();
  const { matchPlayers } = matchState;

  const [target, setTarget] = useState<Target | null>(null);
  const [pendingAction, setPendingAction] = useState<LiveActionKey | null>(null);

  // Joueurs sur le terrain : positions réelles issues du roster/SetSetup (MatchContext).
  const myCourt = useMemo(() => {
    const map: Record<number, CourtPlayer> = {};
    matchPlayers.forEach(p => {
      if (!p.onCourt || p.pos === null) return;
      map[p.pos] = {
        id: p.id,
        jersey: p.numero,
        name: p.name,
        color: getPositionColor(p.tacticalRole),
      };
    });
    return map;
  }, [matchPlayers]);

  const oppCourt = useMemo(() => {
    const players: CourtPlayer[] = [1, 2, 3, 4, 5, 6].map(j => ({
      id: j,
      jersey: j,
      name: `Adv #${j}`,
      color: COLORS.pink,
    }));
    return buildCourt(players);
  }, []);

  // Nb d'événements par joueur (team:id) pour le compteur sur la case.
  const countByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of state.events) {
      const k = `${e.team}:${e.playerId}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [state.events]);

  const record = useCallback((actionKey: LiveActionKey, zone: number | null) => {
    if (!target) return;
    actions.addEvent({
      team:       target.team,
      playerId:   target.player.id,
      jersey:     target.player.jersey,
      playerName: target.player.name,
      actionKey,
      zone,
    });
    setPendingAction(null);
    setTarget(null);
  }, [actions, target]);

  const handleAction = (actionKey: LiveActionKey) => {
    if (!target) return;
    if (LIVE_ACTION_BY_KEY[actionKey].needsZone) {
      setPendingAction(actionKey);
      return;
    }
    record(actionKey, null);
  };

  const last = state.events.length > 0 ? state.events[state.events.length - 1] : null;

  // Adversaire attaque → balle tombe dans mon camp (bas) → filet en haut.
  // Mon équipe attaque → balle tombe camp adverse (haut) → filet en bas.
  const zoneNetAtTop = target?.team === 'opp';
  const zoneRows = zoneNetAtTop ? ZONE_ROWS_NET_TOP : ZONE_ROWS_NET_BOTTOM;

  const renderCell = (courtTeam: LiveTeam, courtMap: Record<number, CourtPlayer>, zone: number) => {
    const player = courtMap[zone];
    if (!player) {
      return (
        <View key={zone} style={styles.courtCellEmpty}>
          <Text style={styles.courtCellEmptyText}>Z{zone}</Text>
        </View>
      );
    }
    const count = countByPlayer.get(`${courtTeam}:${player.id}`) ?? 0;
    return (
      <TouchableOpacity
        key={zone}
        style={[styles.courtCell, { borderColor: `${player.color}88`, backgroundColor: `${player.color}1a` }]}
        onPress={() => setTarget({ team: courtTeam, player })}
        activeOpacity={0.7}
      >
        <Text style={[styles.courtNum, { color: player.color }]}>{player.jersey}</Text>
        <Text style={styles.courtName} numberOfLines={1}>
          {courtTeam === 'opp' ? 'Adv.' : player.name.split(' ')[0]}
        </Text>
        <Text style={styles.courtCount}>{count > 0 ? `${count} act.` : ' '}</Text>
        <Text style={styles.courtZoneTag}>Z{zone}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saisie temps réel</Text>
        <TouchableOpacity onPress={actions.reset} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerReset}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Terrain ── */}
      <View style={styles.court}>
        {/* Demi-terrain adverse (haut) */}
        <View style={[styles.half, styles.halfTop]}>
          <Text style={[styles.halfLabel, { color: COLORS.pink }]}>ADVERSAIRE</Text>
          {OPP_ROWS.map((row, i) => (
            <View key={`opp-${i}`} style={styles.courtRow}>
              {row.map(zone => renderCell('opp', oppCourt, zone))}
            </View>
          ))}
        </View>

        <View style={styles.net} />

        {/* Demi-terrain mon équipe (bas) */}
        <View style={[styles.half, styles.halfBottom]}>
          {MINE_ROWS.map((row, i) => (
            <View key={`mine-${i}`} style={styles.courtRow}>
              {row.map(zone => renderCell('mine', myCourt, zone))}
            </View>
          ))}
          <Text style={[styles.halfLabel, { color: COLORS.blue }]}>{team.name.toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Footer : dernière saisie + undo ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {last
            ? `${last.team === 'opp' ? `Adv #${last.jersey}` : last.playerName} — ${LIVE_ACTION_BY_KEY[last.actionKey].label}${last.zone !== null ? ` (Z${last.zone})` : ''}`
            : 'Tape un joueur pour saisir une action'}
        </Text>
        <TouchableOpacity
          style={[styles.undoBtn, state.events.length === 0 && styles.undoBtnDisabled]}
          onPress={actions.undo}
          disabled={state.events.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.undoBtnText}>↩ Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal actions (après tap joueur) ── */}
      {target !== null && pendingAction === null && (
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {target.team === 'opp' ? `Adversaire #${target.player.jersey}` : target.player.name}
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {CATEGORY_ORDER.map(cat => (
                <View key={cat}>
                  <Text style={[styles.actionGroupLabel, { color: CATEGORY_COLOR[cat] }]}>
                    {CATEGORY_LABEL[cat]}
                  </Text>
                  <View style={styles.actionsRow}>
                    {LIVE_ACTIONS.filter(a => a.category === cat).map(a => {
                      const color = CATEGORY_COLOR[cat];
                      return (
                        <TouchableOpacity
                          key={a.key}
                          style={[styles.actionBtn, { backgroundColor: `${color}1f`, borderColor: `${color}55` }]}
                          onPress={() => handleAction(a.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.actionBtnText, { color }]}>
                            {a.label}{a.needsZone ? ' °' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setTarget(null)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Zone d'arrivée : demi-terrain adverse ── */}
      {pendingAction !== null && (
        <View style={styles.overlay}>
          <Text style={styles.zoneTitle}>
            Zone d'arrivée — {LIVE_ACTION_BY_KEY[pendingAction].label}
          </Text>
          {zoneNetAtTop && <Text style={styles.zoneNetLabel}>FILET</Text>}
          <View style={styles.zoneCourt}>
            {zoneRows.map((row, i) => (
              <View key={`zrow-${i}`} style={styles.zoneRow}>
                {row.map(z => (
                  <TouchableOpacity
                    key={z}
                    style={styles.zoneCell}
                    onPress={() => record(pendingAction, z)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.zoneCellText}>{z}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
          {!zoneNetAtTop && <Text style={styles.zoneNetLabel}>FILET</Text>}
          <TouchableOpacity style={styles.zoneCancel} onPress={() => setPendingAction(null)} activeOpacity={0.7}>
            <Text style={styles.zoneCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default LiveStatsScreen;
