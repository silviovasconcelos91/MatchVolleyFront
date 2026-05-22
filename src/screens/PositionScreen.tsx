import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import type { MatchPlayer } from '../context/MatchContext';
import { getPositionColor, COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { ROTATIONS, resolvePlayers } from '../data/volleyball51';
import type { Roster, Pin } from '../data/volleyball51';
import { BACK_ROW_POSITIONS } from '../data/players';

function buildRoster(matchPlayers: MatchPlayer[]): Roster {
  const on = matchPlayers.filter(p => p.onCourt);
  const fn = (p: MatchPlayer) => p.name.split(' ')[0];
  const isFront = (p: MatchPlayer) => p.pos !== null && !BACK_ROW_POSITIONS.has(p.pos);

  const setter  = on.find(p => p.tacticalRole === 'Passeur');
  const opp     = on.find(p => p.tacticalRole === 'Pointu');
  const libero  = on.find(p => p.tacticalRole === 'Libero');
  const oh1     = on.find(p => p.tacticalRole === 'R4'      &&  isFront(p));
  const oh2     = on.find(p => p.tacticalRole === 'R4'      && !isFront(p));
  const mb1     = on.find(p => p.tacticalRole === 'Central' &&  isFront(p));
  const mb2     = libero ?? on.find(p => p.tacticalRole === 'Central' && !isFront(p));

  return {
    S:   setter ? fn(setter) : undefined,
    OPP: opp    ? fn(opp)    : undefined,
    OH1: oh1    ? fn(oh1)    : undefined,
    OH2: oh2    ? fn(oh2)    : undefined,
    MB1: mb1    ? fn(mb1)    : undefined,
    MB2: mb2    ? fn(mb2)    : undefined,
  };
}

function getInitialIdx(matchPlayers: MatchPlayer[]): number {
  const setter = matchPlayers.find(p => p.tacticalRole === 'Passeur' && p.onCourt);
  if (!setter?.pos) return 0;
  const idx = ROTATIONS.findIndex(r => r.setterPos === setter.pos);
  return idx >= 0 ? idx : 0;
}

const POSITION_LEGEND = [
  { role: 'S',      label: 'Passeur'  },
  { role: 'OH1',    label: 'R4'       },
  { role: 'MB1',    label: 'Central'  },
  { role: 'OPP',    label: 'Pointu'   },
  { role: 'Libero', label: 'Libero'   },
] as const;

type PinEx = Pin & { isLibero?: boolean };

const PIN_SIZE = 42;

// ── Terrain ──
type CourtViewProps = {
  pins:     PinEx[];
  onLayout: (w: number, h: number) => void;
};

const CourtView = ({ pins, onLayout }: CourtViewProps) => {
  const handle = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    onLayout(width, height);
  }, [onLayout]);

  return (
    <View style={styles.court} onLayout={handle}>
      <View style={styles.netLine}>
        <Text style={styles.netLabel}>FILET</Text>
      </View>
      <View style={styles.attackLine} />
      <View style={styles.baseline} />

      {pins.map((pin, i) => {
        const color = getPositionColor(pin.isLibero ? 'Libero' : pin.role);
        return (
          <View
            key={i}
            style={[styles.pinWrapper, { left: pin.x - PIN_SIZE / 2, top: pin.y - PIN_SIZE / 2 }]}
          >
            <View style={[styles.pinCircle, { backgroundColor: `${color}35`, borderColor: color }]}>
              <Text style={[styles.pinInitial, { color }]}>
                {pin.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.pinName, { color }]} numberOfLines={1}>
              {pin.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Écran principal ──
const PositionScreen = () => {
  const { state } = useMatch();
  const { matchPlayers, rosterValidated } = state;

  const [rotIdx, setRotIdx]     = useState(() => getInitialIdx(matchPlayers));
  const [courtSize, setCourtSize] = useState({ w: 0, h: 0 });

  const handleLayout = useCallback((w: number, h: number) => {
    setCourtSize({ w, h });
  }, []);

  const rotation = ROTATIONS[rotIdx];
  const roster   = buildRoster(matchPlayers);

  const liberoName = matchPlayers.find(p => p.tacticalRole === 'Libero' && p.onCourt)?.name.split(' ')[0] ?? null;

  const pins: PinEx[] = courtSize.w > 0
    ? resolvePlayers(rotation, roster, courtSize.w, courtSize.h).map(pin => ({
        ...pin,
        isLibero: liberoName !== null && pin.name === liberoName,
      }))
    : [];

  const setterBack = BACK_ROW_POSITIONS.has(rotation.setterPos);

  return (
    <View style={styles.container}>

      {/* Sélecteur R1–R6 */}
      <View style={styles.selector}>
        {ROTATIONS.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.selectorBtn, i === rotIdx && styles.selectorActive]}
            onPress={() => setRotIdx(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorText, i === rotIdx && styles.selectorTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info rotation */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Passeur en P{rotation.setterPos}
        </Text>
        <Text style={styles.infoSub}>
          {setterBack ? 'ligne arrière — monte au filet droit' : 'ligne avant — déjà au filet'}
        </Text>
      </View>

      {/* Terrain */}
      <CourtView pins={pins} onLayout={handleLayout} />

      {/* Légende */}
      <View style={styles.legend}>
        {POSITION_LEGEND.map(({ role, label }) => {
          const color = getPositionColor(role);
          return (
            <View key={role} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendLabel, { color }]}>{label}</Text>
            </View>
          );
        })}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },

  // Sélecteur
  selector: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: 'center',
  },
  selectorActive: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: COLORS.blue,
  },
  selectorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  selectorTextActive: {
    color: COLORS.blue,
    fontWeight: '700',
  },

  // Info
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.yellow,
    fontWeight: '600',
  },
  infoSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // Terrain
  court: {
    flex: 1,
    backgroundColor: '#081929',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  netLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 5,
    backgroundColor: COLORS.borderLight,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: SPACING.sm,
    paddingBottom: 1,
  },
  netLabel: {
    fontSize: 8,
    color: COLORS.textDark,
    letterSpacing: 1,
  },
  attackLine: {
    position: 'absolute',
    top: '33.3%',
    left: 0, right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  baseline: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: COLORS.borderLight,
  },

  // Pin
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: PIN_SIZE + 36,
    marginLeft: -18,
  },
  pinCircle: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInitial: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  pinName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  // Légende
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
});

export default PositionScreen;
