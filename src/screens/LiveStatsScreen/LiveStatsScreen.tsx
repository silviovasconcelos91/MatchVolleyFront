import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Team } from '../../data/teams';
import {
  LIVE_ACTIONS,
  LIVE_ACTION_BY_KEY,
  LIVE_ZONE_DISPLAY_ORDER,
  OPP_JERSEYS,
} from '../../data/liveStats';
import type { LiveTeam, LiveActionKey, LiveActionCategory } from '../../data/liveStats';
import { useLiveStats } from '../../context/LiveStatsContext';
import { getPositionColor, getPlayerColor, COLORS } from '../../constants/theme';
import { styles } from './LiveStatsScreen.styles';

type Props = { team: Team; onBack: () => void };

type GridPlayer = { id: number; jersey: number; name: string; color: string };

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

const LiveStatsScreen = ({ team, onBack }: Props) => {
  const { state, actions } = useLiveStats();

  const [activeTeam, setActiveTeam] = useState<LiveTeam>('mine');
  const [selected, setSelected] = useState<GridPlayer | null>(null);
  const [pendingAction, setPendingAction] = useState<LiveActionKey | null>(null);

  // Grille de joueurs selon l'équipe active (dérivée, jamais dupliquée en state).
  const gridPlayers: GridPlayer[] = useMemo(() => {
    if (activeTeam === 'opp') {
      return OPP_JERSEYS.map(j => ({
        id: j,
        jersey: j,
        name: `Adv #${j}`,
        color: COLORS.pink,
      }));
    }
    return team.players.map(p => ({
      id: p.id,
      jersey: p.numero,
      name: p.name,
      color: p.roles[0] ? getPositionColor(p.roles[0]) : getPlayerColor(p.id),
    }));
  }, [activeTeam, team.players]);

  // Nb d'événements par joueur (team:id) pour affichage compteur.
  const countByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of state.events) {
      const k = `${e.team}:${e.playerId}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [state.events]);

  const selectTeam = (t: LiveTeam) => {
    if (t === activeTeam) return;
    setActiveTeam(t);
    setSelected(null);
    setPendingAction(null);
  };

  const record = useCallback((actionKey: LiveActionKey, zone: number | null) => {
    if (!selected) return;
    actions.addEvent({
      team:       activeTeam,
      playerId:   selected.id,
      jersey:     selected.jersey,
      playerName: selected.name,
      actionKey,
      zone,
    });
    setPendingAction(null);
  }, [actions, activeTeam, selected]);

  const handleAction = (actionKey: LiveActionKey) => {
    if (!selected) return;
    if (LIVE_ACTION_BY_KEY[actionKey].needsZone) {
      setPendingAction(actionKey);
      return;
    }
    record(actionKey, null);
  };

  const recent = useMemo(() => state.events.slice(-6).reverse(), [state.events]);

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

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Toggle équipe ── */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, activeTeam === 'mine' && styles.segmentItemActiveMine]}
            onPress={() => selectTeam('mine')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTeam === 'mine' && styles.segmentTextActive]}>
              {team.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, activeTeam === 'opp' && styles.segmentItemActiveOpp]}
            onPress={() => selectTeam('opp')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTeam === 'opp' && styles.segmentTextActive]}>
              Adversaire
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Grille joueurs ── */}
        <Text style={styles.sectionLabel}>JOUEUR</Text>
        <View style={styles.grid}>
          {gridPlayers.map(p => {
            const isSel = selected?.id === p.id;
            const count = countByPlayer.get(`${activeTeam}:${p.id}`) ?? 0;
            return (
              <TouchableOpacity
                key={`${activeTeam}:${p.id}`}
                style={[
                  styles.playerCell,
                  isSel && { borderColor: p.color, borderWidth: 2, backgroundColor: `${p.color}22` },
                ]}
                onPress={() => setSelected(isSel ? null : p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.playerNum, { color: p.color }]}>{p.jersey}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {activeTeam === 'opp' ? 'Adv.' : p.name.split(' ')[0]}
                </Text>
                <Text style={styles.playerCount}>{count > 0 ? `${count} act.` : ' '}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Actions ── */}
        <Text style={styles.hint}>
          {selected ? `Action pour ${selected.name}` : '↑ Choisis d\'abord un joueur'}
        </Text>

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
                    style={[
                      styles.actionBtn,
                      { backgroundColor: `${color}1f`, borderColor: `${color}55` },
                      !selected && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleAction(a.key)}
                    disabled={!selected}
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

        {/* ── Undo ── */}
        <TouchableOpacity
          style={[styles.undoBtn, state.events.length === 0 && styles.actionBtnDisabled]}
          onPress={actions.undo}
          disabled={state.events.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.undoBtnText}>↩ Annuler la dernière saisie</Text>
        </TouchableOpacity>

        {/* ── Récents ── */}
        <Text style={styles.sectionLabel}>DERNIÈRES SAISIES</Text>
        {recent.length === 0 ? (
          <Text style={styles.hint}>Aucune saisie pour l'instant.</Text>
        ) : (
          recent.map(e => (
            <View key={e.id} style={styles.recentRow}>
              <Text style={styles.recentText}>
                {e.team === 'opp' ? `Adv #${e.jersey}` : e.playerName} — {LIVE_ACTION_BY_KEY[e.actionKey].label}
              </Text>
              <Text style={styles.recentZone}>{e.zone !== null ? `Z${e.zone}` : ''}</Text>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Overlay zone d'arrivée ── */}
      {pendingAction !== null && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>
            Zone d'arrivée — {LIVE_ACTION_BY_KEY[pendingAction].label}
          </Text>
          <View style={styles.zoneNet} />
          <View style={styles.zoneGrid}>
            {LIVE_ZONE_DISPLAY_ORDER.map(z => (
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
          <TouchableOpacity style={styles.zoneCancel} onPress={() => setPendingAction(null)} activeOpacity={0.7}>
            <Text style={styles.zoneCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default LiveStatsScreen;
