// ─────────────────────────────────────────────
//  ÉCRAN : CONFIGURATION DU SET
//
//  Affiché avant chaque set (y compris le Set 1)
//  pour permettre au coach de :
//    - Placer les joueurs sur le terrain (grille 3×2)
//      Échange terrain ↔ terrain : tap 2 cases
//      Échange banc → terrain    : tap banc puis case
//    - Assigner les rôles tactiques
//      (R4, Central, Passeur, Pointu)
//
//  Les rôles du set précédent sont pré-remplis.
//  Le libero est affiché en lecture seule.
// ─────────────────────────────────────────────

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import { INITIAL_POSITIONS, COURT_DISPLAY_ORDER } from '../data/players';
import { getPlayerColor, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import PlayerAvatar from '../components/PlayerAvatar';

// Rôles disponibles pour les joueurs terrain (libero exclu — il est fixe)
const FIELD_ROLES = ['R4', 'Central', 'Passeur', 'Pointu'] as const;
type FieldRole = typeof FIELD_ROLES[number];

const SetSetupScreen = () => {
  const { state, actions } = useMatch();
  const { originalStarterIds, originalLiberoId, availableLiberoIds, matchPlayers, setNum, lastSetStartPositionMap } = state;

  // ── positionMap : pos (1-6) → playerId ──
  const [positionMap, setPositionMap] = useState<Record<number, number>>(() => {
    if (Object.keys(lastSetStartPositionMap).length === 6) return lastSetStartPositionMap;

    const map: Record<number, number> = {};
    originalStarterIds.forEach((id, index) => {
      if (index < INITIAL_POSITIONS.length) map[INITIAL_POSITIONS[index]] = id;
    });
    return map;
  });

  const [swapFromPos, setSwapFromPos] = useState<number | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<number | null>(null);

  // Libero actif pour ce set (par défaut oui s'il existe au roster)
  const [liberoActive, setLiberoActive] = useState<boolean>(originalLiberoId !== null);

  // ── tacticalRoles : playerId → rôle ──
  const [tacticalRoles, setTacticalRoles] = useState<Record<number, string>>(() => {
    const roles: Record<number, string> = {};
    matchPlayers.forEach(p => {
      if (p.id === originalLiberoId) return;
      if (p.tacticalRole) {
        roles[p.id] = p.tacticalRole;
      } else {
        const suggestion = p.roles.find(r => r !== 'Libero');
        if (suggestion) roles[p.id] = suggestion;
      }
    });
    return roles;
  });

  // ── Joueurs disponibles au banc (liberos exclus, non placés sur le terrain) ──
  const liberoIdSet = useMemo(() => new Set(availableLiberoIds), [availableLiberoIds]);
  const benchPlayers = useMemo(() => {
    const onCourtIds = new Set(Object.values(positionMap));
    return matchPlayers.filter(p => !liberoIdSet.has(p.id) && !onCourtIds.has(p.id));
  }, [matchPlayers, liberoIdSet, positionMap]);

  // ── Joueurs effectivement sur le terrain (dans l'ordre d'affichage) ──
  const courtPlayerIds = useMemo(
    () => COURT_DISPLAY_ORDER.map(pos => positionMap[pos]).filter((id): id is number => id !== undefined),
    [positionMap],
  );

  // ── Tap sur une case du terrain ──
  const handlePositionTap = useCallback((pos: number) => {
    // Mode "placement depuis banc" : un joueur du banc est sélectionné
    if (selectedBenchId !== null) {
      setPositionMap(prev => ({ ...prev, [pos]: selectedBenchId }));
      setSelectedBenchId(null);
      setSwapFromPos(null);
      return;
    }

    // Mode "échange terrain↔terrain"
    if (swapFromPos === null) {
      setSwapFromPos(pos);
    } else if (swapFromPos === pos) {
      setSwapFromPos(null);
    } else {
      setPositionMap(prev => {
        const playerA = prev[swapFromPos];
        const playerB = prev[pos];
        const newMap  = { ...prev };
        if (playerA !== undefined) newMap[pos] = playerA; else delete newMap[pos];
        if (playerB !== undefined) newMap[swapFromPos] = playerB; else delete newMap[swapFromPos];
        return newMap;
      });
      setSwapFromPos(null);
    }
  }, [selectedBenchId, swapFromPos]);

  // ── Tap sur un joueur du banc ──
  const handleBenchTap = useCallback((id: number) => {
    setSelectedBenchId(prev => prev === id ? null : id);
    setSwapFromPos(null); // annuler tout échange terrain en cours
  }, []);

  // ── Retirer un joueur du terrain (l'envoyer au banc) ──
  const handleRemoveFromCourt = useCallback((pos: number) => {
    setPositionMap(prev => {
      const newMap = { ...prev };
      delete newMap[pos];
      return newMap;
    });
    setSwapFromPos(null);
    setSelectedBenchId(null);
  }, []);

  const selectRole = useCallback((id: number, role: FieldRole) => {
    setTacticalRoles(prev => ({ ...prev, [id]: role }));
  }, []);

  // ── Confirmer et démarrer le set ──
  const handleConfirm = useCallback(() => {
    actions.assignSetRoles({ positionMap, tacticalRoles, liberoActive });
  }, [actions, positionMap, tacticalRoles, liberoActive]);

  // ── Libero (infos pour affichage) ──
  const liberoPlayer = originalLiberoId !== null
    ? matchPlayers.find(p => p.id === originalLiberoId) ?? null
    : null;

  // Texte d'état de la grille
  const gridHint = selectedBenchId !== null
    ? `${matchPlayers.find(p => p.id === selectedBenchId)?.name.split(' ')[0]} → choisir une case`
    : swapFromPos !== null
    ? `P${swapFromPos} sélectionné — choisir la destination`
    : 'tap 2 cases pour échanger';

  const gridHintColor = selectedBenchId !== null
    ? COLORS.green
    : swapFromPos !== null
    ? COLORS.yellow
    : COLORS.blue;

  const courtCount = Object.keys(positionMap).length;

  // Validation des postes tactiques sur les 6 joueurs terrain
  const roleValidation = useMemo(() => {
    const counts: Record<string, number> = { R4: 0, Central: 0, Passeur: 0, Pointu: 0 };
    courtPlayerIds.forEach(id => {
      const r = tacticalRoles[id];
      if (r && r in counts) counts[r]++;
    });
    const missing: string[] = [];
    if (counts.R4      < 2) missing.push(`${2 - counts.R4} R4`);
    if (counts.Central < 2) missing.push(`${2 - counts.Central} Central`);
    if (counts.Passeur < 1) missing.push('1 Passeur');
    if (counts.Pointu  < 1) missing.push('1 Pointu');
    return { counts, missing, valid: missing.length === 0 };
  }, [courtPlayerIds, tacticalRoles]);

  const canStart = courtCount === 6 && roleValidation.valid;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── En-tête ── */}
      <View style={styles.header}>
        {setNum === 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={actions.resetRoster} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>‹ Retour</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerSet}>SET {setNum}</Text>
        <Text style={styles.headerTitle}>Configuration de l'équipe</Text>
        <Text style={styles.headerHint}>
          Place 6 joueurs sur le terrain et assigne les rôles
        </Text>
      </View>

      {/* ── Éditeur de positions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          TERRAIN{'  ·  '}
          <Text style={{ color: gridHintColor }}>{gridHint}</Text>
          {'  ·  '}
          <Text style={{ color: canStart ? COLORS.green : COLORS.yellow }}>
            {courtCount}/6
          </Text>
        </Text>

        {/* Filet */}
        <View style={styles.netRow}>
          <View style={styles.net} />
          <Text style={styles.netLabel}>FILET</Text>
        </View>

        {/* Grille 3×2 : positions 4,3,2 (avant) puis 5,6,1 (arrière) */}
        <View style={styles.grid}>
          {COURT_DISPLAY_ORDER.map(pos => {
            const playerId  = positionMap[pos];
            const player    = playerId !== undefined
              ? matchPlayers.find(p => p.id === playerId)
              : null;
            const color      = player ? getPlayerColor(player.id) : COLORS.border;
            const isSelected = swapFromPos === pos;
            const isTarget   = selectedBenchId !== null; // toutes les cases sont des cibles

            return (
              <TouchableOpacity
                key={pos}
                style={[
                  styles.cell,
                  {
                    borderColor:     isSelected
                      ? color
                      : isTarget && !player
                      ? `${COLORS.green}66`
                      : player
                      ? `${color}55`
                      : COLORS.border,
                    backgroundColor: isSelected
                      ? `${color}22`
                      : isTarget && !player
                      ? `${COLORS.green}11`
                      : COLORS.bgInput,
                    borderWidth:     isSelected || (isTarget && !player) ? 2 : 1,
                  },
                ]}
                onPress={() => handlePositionTap(pos)}
                onLongPress={() => player ? handleRemoveFromCourt(pos) : undefined}
                activeOpacity={0.7}
              >
                {player ? (
                  <>
                    <PlayerAvatar name={player.name} color={color} size={24} />
                    <Text style={styles.cellName} numberOfLines={1}>
                      {player.name.split(' ')[0]}
                    </Text>
                    {tacticalRoles[player.id] ? (
                      <View style={[styles.roleBadge, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
                        <Text style={[styles.roleBadgeText, { color }]}>
                          {tacticalRoles[player.id]}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.cellPos}>P{pos}</Text>
                  </>
                ) : (
                  <Text style={[
                    styles.cellEmpty,
                    isTarget && { color: COLORS.green },
                  ]}>
                    P{pos}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.baseline} />
        <Text style={styles.longPressHint}>Appui long sur un joueur → le retirer du terrain</Text>
      </View>

      {/* ── Postes tactiques ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          POSTES TACTIQUES{'  ·  '}
          {roleValidation.valid
            ? <Text style={{ color: COLORS.green }}>✓ complet</Text>
            : <Text style={{ color: COLORS.redLight }}>
                manque : {roleValidation.missing.join(' · ')}
              </Text>
          }
        </Text>

        {/* Joueurs actuellement sur le terrain */}
        {courtPlayerIds.map(id => {
          const player     = matchPlayers.find(p => p.id === id);
          if (!player) return null;
          const color      = getPlayerColor(id);
          const activeRole = tacticalRoles[id] as FieldRole | undefined;

          return (
            <View key={id} style={styles.roleRow}>
              <PlayerAvatar name={player.name} color={color} size={28} />
              <Text style={styles.roleName} numberOfLines={1}>
                {player.name.split(' ')[0]}{' '}
                <Text style={styles.roleNumero}>#{player.numero}</Text>
              </Text>
              <View style={styles.roleBtns}>
                {FIELD_ROLES.map(role => {
                  const active = activeRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleBtn, active && { backgroundColor: `${color}22`, borderColor: `${color}88` }]}
                      onPress={() => selectRole(id, role)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.roleBtnText, active && { color, fontWeight: '700' }]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {courtPlayerIds.length === 0 && (
          <Text style={styles.rolesEmpty}>
            Place des joueurs sur le terrain pour assigner les rôles
          </Text>
        )}

        {/* Liberos — lecture seule, désignés au roster */}
        {availableLiberoIds.map(lId => {
          const lPlayer = matchPlayers.find(p => p.id === lId);
          if (!lPlayer) return null;
          return (
            <View key={lId} style={styles.roleRowLibero}>
              <View style={styles.roleRow}>
                <PlayerAvatar name={lPlayer.name} color={COLORS.yellow} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleName} numberOfLines={1}>
                    {lPlayer.name.split(' ')[0]}{' '}
                    <Text style={styles.roleNumero}>#{lPlayer.numero}</Text>
                  </Text>
                </View>
                <View style={[styles.roleChip, styles.roleChipLibero]}>
                  <Text style={[styles.roleChipText, styles.roleChipLiberoText]}>Libero</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Banc disponible ── */}
      {benchPlayers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            BANC DISPONIBLE{'  ·  '}
            <Text style={{ color: selectedBenchId !== null ? COLORS.green : COLORS.textDark }}>
              {selectedBenchId !== null
                ? 'tap une case du terrain pour placer'
                : 'tap pour sélectionner'}
            </Text>
          </Text>

          {benchPlayers.map(player => {
            const color    = getPlayerColor(player.id);
            const isChosen = selectedBenchId === player.id;
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.benchRow,
                  isChosen && { backgroundColor: `${COLORS.green}14`, borderColor: `${COLORS.green}55` },
                  !isChosen && { backgroundColor: COLORS.bgInput, borderColor: COLORS.border },
                ]}
                onPress={() => handleBenchTap(player.id)}
                activeOpacity={0.7}
              >
                <PlayerAvatar
                  name={player.name}
                  color={isChosen ? COLORS.green : color}
                  size={32}
                />
                <View style={styles.benchInfo}>
                  <Text style={[styles.benchName, isChosen && { color: COLORS.textPrimary }]}>
                    {player.name}{' '}
                    <Text style={styles.benchNumero}>#{player.numero}</Text>
                  </Text>
                  {tacticalRoles[player.id] ? (
                    <Text style={[styles.benchRole, { color }]}>
                      {tacticalRoles[player.id]}
                    </Text>
                  ) : null}
                </View>
                {isChosen ? (
                  <View style={styles.benchSelectedBadge}>
                    <Text style={styles.benchSelectedText}>prêt →</Text>
                  </View>
                ) : (
                  <View style={styles.benchBadge}>
                    <Text style={styles.benchBadgeText}>banc</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Bouton démarrer ── */}
      <TouchableOpacity
        style={[styles.confirmBtn, !canStart && styles.confirmBtnDisabled]}
        onPress={canStart ? handleConfirm : undefined}
        activeOpacity={canStart ? 0.8 : 1}
      >
        <Text style={styles.confirmBtnText}>
          {canStart
            ? `Démarrer le Set ${setNum} →`
            : courtCount < 6
            ? `${courtCount}/6 joueurs placés`
            : `Postes incomplets`}
        </Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xxl * 2 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  // En-tête
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
  },
  backBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.blue,
  },
  headerSet: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.blue,
    letterSpacing: 3,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  headerHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Section générique
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Éditeur de terrain
  netRow: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  net: {
    height: 3,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  netLabel: {
    position: 'absolute',
    right: 0,
    top: -12,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cell: {
    width: '31.5%',
    minHeight: 68,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 5,
  },
  cellName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    maxWidth: '90%',
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '600',
  },
  cellPos: {
    fontSize: 8,
    color: COLORS.textDark,
  },
  cellEmpty: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  baseline: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  longPressHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
    textAlign: 'center',
    paddingTop: 2,
  },

  // Banc disponible
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: 5,
  },
  benchInfo: {
    flex: 1,
    minWidth: 0,
  },
  benchName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  benchNumero: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    fontWeight: '400',
  },
  benchRole: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginTop: 1,
  },
  benchBadge: {
    borderWidth: 1,
    borderColor: '#ffd16644',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: '#ffd16611',
  },
  benchBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.yellow,
    fontWeight: '500',
  },
  benchSelectedBadge: {
    borderWidth: 1,
    borderColor: `${COLORS.green}66`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: `${COLORS.green}22`,
  },
  benchSelectedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.green,
    fontWeight: '600',
  },

  // Lignes de rôles tactiques
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs + 1,
    paddingHorizontal: SPACING.xs,
    flexWrap: 'wrap',
  },
  roleRowLibero: {
    marginTop: 4,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  roleName: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  roleNumero: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    fontWeight: '400',
  },
  roleBtns: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  roleBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.bgInput,
  },
  roleBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    minWidth: 64,
    alignItems: 'center',
  },
  roleChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  roleChipLibero: {
    backgroundColor: '#ffd16622',
    borderColor: '#ffd16655',
  },
  roleChipLiberoText: {
    color: COLORS.yellow,
  },
  roleChipLiberoOff: {
    backgroundColor: COLORS.bgInput,
    borderColor: COLORS.border,
  },
  roleChipLiberoOffText: {
    color: COLORS.textDark,
  },
  liberoToggleHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
    marginTop: 1,
  },
  liberoActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 2,
    marginLeft: 4,
  },
  liberoActionBtn: {
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: '#ffd16633',
    borderRadius: RADIUS.sm,
    backgroundColor: '#ffd16611',
  },
  liberoActionBtnText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.yellow,
  },
  undesignateBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginLeft: 4,
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
  },
  undesignateBtnText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
  liberoPickerLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  liberoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 6,
  },
  liberoPickerName: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  liberoPickerChip: {
    borderWidth: 1,
    borderColor: '#ffd16644',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    backgroundColor: '#ffd16611',
  },
  liberoPickerChipCurrent: {
    borderColor: '#ffd16688',
    backgroundColor: '#ffd16622',
  },
  liberoPickerChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.yellow,
    fontWeight: '600',
  },
  liberoPickerRowCurrent: {
    opacity: 0.6,
  },
  liberoPickerEmpty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    paddingVertical: SPACING.xs,
  },
  rolesEmpty: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },

  // Bouton confirmer
  confirmBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.lg,
    padding: 13,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
  },
});

export default SetSetupScreen;