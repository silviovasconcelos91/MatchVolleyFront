import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import CourtGestureLayer from './CourtGestureLayer';
import type { Team } from '../../data/teams';
import { LIVE_ACTIONS, LIVE_ACTION_BY_KEY } from '../../data/liveStats';
import type { LiveTeam, LiveActionKey, LiveActionCategory } from '../../data/liveStats';
import type { ActionKey } from '../../data/players';
import { useLiveStats } from '../../context/LiveStatsContext';
import { useMatch } from '../../context/MatchContext';
import { getPositionColor, COLORS } from '../../constants/theme';
import { styles } from './LiveStatsScreen.styles';

type Props = { team: Team };

// Reflet des actions live vers MatchContext (8 clés classiques) pour mon équipe :
// score, rotation auto et stats joueur. Les actions neutres ne touchent pas le score.
const MINE_ACTION_MAP: Partial<Record<LiveActionKey, ActionKey>> = {
  attack_pt:   'atk',
  ace:         'ace',
  block_pt:    'block',
  relance_pt:  'pt',
  attack_fault: 'atk_out',
  serve_fault:  'srv_out',
  recv_fault:   'recv',
  fault:        'fault',
};

type CourtPlayer = { id: number; jersey: number; name: string; color: string; role: string };

type Target = { team: LiveTeam; player: CourtPlayer; pos: number };

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
// OPP : miroir horizontal (zone 1 adversaire = gauche coach, zone 5 = droite coach)
const OPP_ROWS  = [[1, 6, 5], [2, 3, 4]]; // arrière en haut, avant (près filet) en bas


const buildCourt = (players: CourtPlayer[]): Record<number, CourtPlayer> => {
  const map: Record<number, CourtPlayer> = {};
  ZONE_FILL_ORDER.forEach((zone, i) => {
    const p = players[i];
    if (p) map[zone] = p;
  });
  return map;
};

const LiveStatsScreen = ({ team }: Props) => {
  const { state, actions } = useLiveStats();
  const { state: matchState, actions: matchActions } = useMatch();
  const { matchPlayers, availableLiberoIds, liberoReplacements, substitutionPairs, subHistory } = matchState;

  const [target, setTarget] = useState<Target | null>(null);
  const [pendingAction, setPendingAction] = useState<LiveActionKey | null>(null);
  const [subFor, setSubFor] = useState<CourtPlayer | null>(null);

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
        role: p.tacticalRole,
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
      role: '',
    }));
    return buildCourt(players);
  }, []);

  // Joueurs du banc disponibles pour un remplacement (sélectionnés au roster,
  // hors terrain, hors libero).

  const benchPlayers = useMemo(() => {
    const liberoSet = new Set(availableLiberoIds);
    return matchPlayers.filter(p => !p.onCourt && !liberoSet.has(p.id));
  }, [matchPlayers, availableLiberoIds]);

  // Règles FIVB de remplacement (par set) :
  // - chaque joueur ne peut être impliqué que 2 fois (sortie puis retour) ;
  // - un sortant ne peut être échangé qu'avec son partenaire de paire ;
  // - un titulaire vierge ne peut être remplacé que par un remplaçant vierge ;
  // - 6 remplacements maximum par set.
  const subsCount = subHistory.length;

  const partnerOf = (id: number): number | undefined => {
    for (const [outId, inId] of Object.entries(substitutionPairs)) {
      if (Number(outId) === id) return inId;
      if (inId === id) return Number(outId);
    }
    return undefined;
  };

  const involvement = (id: number): number => {
    let n = 0;
    for (const [outId, inId] of Object.entries(substitutionPairs)) {
      if (Number(outId) === id) n += 1;
      if (inId === id) n += 1;
    }
    return n;
  };

  // Remplaçants légaux pour le joueur sortant sélectionné.
  const benchOptions = useMemo(() => {
    if (!subFor) return [];
    if (subsCount >= 6) return [];
    if (involvement(subFor.id) >= 2) return [];
    const outPartner = partnerOf(subFor.id);
    return benchPlayers.filter(b => {
      if (involvement(b.id) >= 2) return false;
      const inPartner = partnerOf(b.id);
      if (outPartner !== undefined) return b.id === outPartner;
      if (inPartner !== undefined) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subFor, benchPlayers, substitutionPairs, subsCount]);

  const handleSub = (inId: number) => {
    if (!subFor) return;
    matchActions.confirmSub({ outId: subFor.id, inId });
    setSubFor(null);
  };

  const record = useCallback((actionKey: LiveActionKey, zone: number | null, zoneStartValue: number | null) => {
    if (!target) return;
    actions.addEvent({
      team:       target.team,
      playerId:   target.player.id,
      jersey:     target.player.jersey,
      playerName: target.player.name,
      actionKey,
      zone,
      zoneStart:  zoneStartValue,
      playerPos:  target.pos,
    });
    // Reflet dans MatchContext : score, rotation auto, stats classiques.
    const def = LIVE_ACTION_BY_KEY[actionKey];
    if (target.team === 'mine') {
      const mk = MINE_ACTION_MAP[actionKey];
      if (mk) matchActions.playerAction({ playerId: target.player.id, actionKey: mk });
    } else if (def.category === 'point') {
      matchActions.oppScore();
    } else if (def.category === 'fault') {
      matchActions.oppFault();
    }
    setPendingAction(null);
    setTarget(null);
  }, [actions, matchActions, target]);

  // L'action live a-t-elle modifié le score (donc dispatché dans MatchContext) ?
  const didScore = (evTeam: LiveTeam, actionKey: LiveActionKey): boolean => {
    if (evTeam === 'mine') return MINE_ACTION_MAP[actionKey] !== undefined;
    const cat = LIVE_ACTION_BY_KEY[actionKey].category;
    return cat === 'point' || cat === 'fault';
  };

  const handleUndo = () => {
    const curSetEvents = state.sets[state.currentSet] ?? [];
    const lastEv = curSetEvents[curSetEvents.length - 1];
    actions.undo();
    if (lastEv && didScore(lastEv.team, lastEv.actionKey)) matchActions.undo();
  };

  const handleAction = (actionKey: LiveActionKey) => {
    if (!target) return;
    const def = LIVE_ACTION_BY_KEY[actionKey];
    if (def.needsZone || def.needsStartZone) {
      setPendingAction(actionKey);
      return;
    }
    record(actionKey, null, null);
  };

  const curSetEvents = state.sets[state.currentSet] ?? [];
  const last = curSetEvents.length > 0 ? curSetEvents[curSetEvents.length - 1] : null;

  const renderCell = (courtTeam: LiveTeam, courtMap: Record<number, CourtPlayer>, zone: number) => {
    // Gesture mode: show only zone numbers, no player info
    if (pendingAction !== null) {
      const def = LIVE_ACTION_BY_KEY[pendingAction];
      const actingTeam = target?.team ?? 'mine';
      // Landing half is opposite to acting team; departure is acting team's half.
      const isLanding   = actingTeam === 'mine' ? courtTeam === 'opp' : courtTeam === 'mine';
      const isDeparture = (actingTeam === 'mine' ? courtTeam === 'mine' : courtTeam === 'opp') && !!def.needsStartZone;
      const isActive = isLanding || isDeparture;
      const color = isLanding ? COLORS.pink : COLORS.blue;
      return (
        <View
          key={zone}
          style={[
            styles.gestureCell,
            isActive
              ? { borderColor: `${color}66`, backgroundColor: `${color}18` }
              : { borderColor: COLORS.border, opacity: 0.3 },
          ]}
        >
          <Text style={[styles.gestureZoneNum, { color: isActive ? color : COLORS.textDark }]}>
            {zone}
          </Text>
        </View>
      );
    }

    const player = courtMap[zone];
    if (!player) {
      return (
        <View key={zone} style={styles.courtCellEmpty}>
          <Text style={styles.courtCellEmptyText}>Z{zone}</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        key={zone}
        style={[styles.courtCell, { borderColor: `${player.color}88`, backgroundColor: `${player.color}1a` }]}
        onPress={() => setTarget({ team: courtTeam, player, pos: zone })}
        onLongPress={courtTeam === 'mine' && !availableLiberoIds.includes(player.id) ? () => setSubFor(player) : undefined}
        activeOpacity={0.7}
      >
        <Text style={[styles.courtName, { color: player.color }]} numberOfLines={1} adjustsFontSizeToFit>
          {courtTeam === 'opp' ? `Adv.` : player.name.split(' ')[0]}
        </Text>
        <Text style={styles.courtNum}>#{player.jersey}</Text>
        {courtTeam === 'mine' && player.role ? (
          <Text style={[styles.courtRole, { color: player.color }]}>{player.role}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabRoot}>
      {/* ── Terrain ── */}
      <CourtGestureLayer
        style={styles.court}
        pendingAction={pendingAction}
        targetTeam={target?.team ?? null}
        onRecord={(zone, zoneStart) => {
          if (pendingAction) record(pendingAction, zone, zoneStart);
        }}
      >
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
      </CourtGestureLayer>

      {/* ── Bannière instruction geste ── */}
      {pendingAction !== null && (
        <View style={styles.gestureInstructionBar}>
          <Text style={styles.gestureInstructionText}>
            {LIVE_ACTION_BY_KEY[pendingAction].needsStartZone
              ? `${LIVE_ACTION_BY_KEY[pendingAction].label} — glissez depuis votre camp vers l'adversaire`
              : `${LIVE_ACTION_BY_KEY[pendingAction].label} — touchez la zone d'arrivée`}
          </Text>
          <TouchableOpacity
            style={styles.gestureCancelBtn}
            onPress={() => setPendingAction(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.gestureCancelText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Libéros : faire entrer / sortir un des deux libéros ── */}
      {availableLiberoIds.length > 0 && (
        <View style={styles.liberoBar}>
          {availableLiberoIds.map(lId => {
            const lPlayer = matchPlayers.find(p => p.id === lId);
            if (!lPlayer) return null;
            const onCourt = liberoReplacements[lId] !== undefined;
            return (
              <TouchableOpacity
                key={lId}
                style={[styles.liberoBtn, onCourt && styles.liberoBtnActive]}
                onPress={() => matchActions.liberoSwap({ liberoId: lId })}
                activeOpacity={0.7}
              >
                <Text style={styles.liberoIcon}>{onCourt ? '↓' : '↕'}</Text>
                <Text style={styles.liberoText} numberOfLines={1}>
                  Libéro {lPlayer.name.split(' ')[0]} {onCourt ? '(sortir)' : '(entrer)'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Footer : dernière saisie + rotation + undo ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {last
            ? `${last.team === 'opp' ? `Adv #${last.jersey}` : last.playerName} — ${LIVE_ACTION_BY_KEY[last.actionKey].label}${
                last.zoneStart !== null && last.zone !== null
                  ? ` (Z${last.zoneStart}→Z${last.zone})`
                  : last.zone !== null
                  ? ` (Z${last.zone})`
                  : ''
              }`
            : 'Tape un joueur pour saisir une action'}
        </Text>
        <View style={styles.autoRotateToggle}>
          <Text style={styles.autoRotateLabel}>Rotation auto</Text>
          <Switch
            value={matchState.autoRotateEnabled}
            onValueChange={matchActions.toggleAutoRotate}
          />
        </View>
        <TouchableOpacity
          style={styles.rotateBtn}
          onPress={() => matchActions.rotate()}
          activeOpacity={0.7}
        >
          <Text style={styles.rotateBtnText}>↻</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.undoBtn, curSetEvents.length === 0 && styles.undoBtnDisabled]}
          onPress={handleUndo}
          disabled={curSetEvents.length === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.undoBtnText}>↩ Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal actions (après tap joueur) ── */}
      {target !== null && pendingAction === null && (
        <View style={styles.actionOverlay}>
          <Text style={styles.modalTitle}>
            {target.team === 'opp' ? `Adversaire #${target.player.jersey}` : target.player.name}
          </Text>
          <View style={styles.actionGroups}>
            {CATEGORY_ORDER.map(cat => {
              const catActions = LIVE_ACTIONS.filter(a => a.category === cat);
              const rows: typeof catActions[] = [];
              for (let i = 0; i < catActions.length; i += 2) rows.push(catActions.slice(i, i + 2));
              const color = CATEGORY_COLOR[cat];
              return (
                <View key={cat} style={[styles.actionGroup, { flex: catActions.length }]}>
                  <Text style={[styles.actionGroupLabel, { color }]}>{CATEGORY_LABEL[cat]}</Text>
                  <View style={styles.actionGroupGrid}>
                    {rows.map((row, ri) => (
                      <View key={ri} style={styles.actionGridRow}>
                        {row.map(a => (
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
                        ))}
                        {row.length < 2 && <View style={{ flex: 1 }} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.modalCancel} onPress={() => setTarget(null)} activeOpacity={0.7}>
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* ── Remplacement (appui long sur un joueur) ── */}
      {subFor !== null && (
        <View style={styles.overlay}>
          <View style={styles.subCard}>
            <Text style={styles.modalTitle}>Remplacer {subFor.name.split(' ')[0]}</Text>
            <Text style={styles.subCount}>Remplacements : {subsCount}/6</Text>
            {benchOptions.length === 0 ? (
              <Text style={styles.subEmpty}>
                {subsCount >= 6
                  ? 'Limite de 6 remplacements atteinte pour le set.'
                  : 'Aucun remplaçant autorisé (règle de paire) ou banc vide.'}
              </Text>
            ) : (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {benchOptions.map(p => {
                  const color = getPositionColor(p.tacticalRole);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.benchBtn}
                      onPress={() => handleSub(p.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.benchNum, { color }]}>{p.numero}</Text>
                      <Text style={styles.benchName} numberOfLines={1}>{p.name}</Text>
                      {p.tacticalRole ? <Text style={[styles.benchRole, { color }]}>{p.tacticalRole}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setSubFor(null)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default LiveStatsScreen;
