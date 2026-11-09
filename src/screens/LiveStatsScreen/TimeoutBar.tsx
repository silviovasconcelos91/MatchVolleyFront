// Temps morts : un bouton par équipe + compte à rebours de 30 s.
// L'état « temps mort en cours » est dérivé des événements du set :
// dernier événement = temps mort ET moins de 30 s écoulées. Annuler
// le temps mort ou saisir l'action suivante le fait donc disparaître.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { isTimeout, TIMEOUT_DURATION_MS } from '../../data/liveStats';
import type { LiveStatEvent, LiveTeam } from '../../data/liveStats';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../../constants/theme';

type Props = {
  teamName: string;
  setEvents: LiveStatEvent[];          // événements du set en cours
  onTimeout: (team: LiveTeam) => void;
};

const TICK_MS = 250;
const MAX_TIMEOUTS_PER_SET = 2;

export const timeoutTeamLabel = (team: LiveTeam, teamName: string): string =>
  team === 'mine' ? teamName : 'Adversaire';

const TimeoutBar = ({ teamName, setEvents, onTimeout }: Props) => {
  const counts = useMemo(() => {
    const c: Record<LiveTeam, number> = { mine: 0, opp: 0 };
    for (const e of setEvents) if (isTimeout(e)) c[e.team] += 1;
    return c;
  }, [setEvents]);

  const last = setEvents.length > 0 ? setEvents[setEvents.length - 1] : null;
  const runningTimeout = last && isTimeout(last) ? last : null;

  // Horloge locale, active uniquement pendant un temps mort.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!runningTimeout) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [runningTimeout]);

  const remainingMs = runningTimeout ? runningTimeout.ts + TIMEOUT_DURATION_MS - now : 0;

  if (runningTimeout && remainingMs > 0) {
    const seconds = Math.ceil(remainingMs / 1000);
    const progress = remainingMs / TIMEOUT_DURATION_MS;
    return (
      <View style={styles.running}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
        <Text style={styles.runningLabel} numberOfLines={1}>
          ⏱ TEMPS MORT · {timeoutTeamLabel(runningTimeout.team, teamName)}
        </Text>
        <Text style={styles.countdown}>{seconds}s</Text>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      {(['mine', 'opp'] as const).map(team => {
        const exhausted = counts[team] >= MAX_TIMEOUTS_PER_SET;
        return (
          <TouchableOpacity
            key={team}
            style={[styles.btn, exhausted && styles.btnDisabled]}
            onPress={() => onTimeout(team)}
            disabled={exhausted}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnText, exhausted && styles.btnTextDisabled]} numberOfLines={1}>
              ⏱ Temps mort {timeoutTeamLabel(team, teamName)} ({counts[team]}/{MAX_TIMEOUTS_PER_SET})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  btnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: COLORS.textMuted,
  },
  running: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.yellow}66`,
    backgroundColor: COLORS.bgInput,
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${COLORS.yellow}22`,
  },
  runningLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.yellow,
  },
  countdown: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.yellow,
  },
});

export default TimeoutBar;
