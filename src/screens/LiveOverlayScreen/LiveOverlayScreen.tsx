// ─────────────────────────────────────────────
//  ÉCRAN : OVERLAY LIVE PUBLIC (web, sans authentification)
//
//  URL : /live/{code}?view=score|graph|full&bg=transparent
//  Pensé pour une source navigateur OBS 1920×1080 ; mis à l'échelle
//  pour rester lisible sur un téléphone ou un écran plus petit.
//  Toutes les valeurs affichées sont calculées par le backend.
// ─────────────────────────────────────────────

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import type { PublicLivePoint, PublicLiveView, LiveSide } from '../../data/liveSessionApi';
import { usePublicLiveView } from '../../hooks/usePublicLiveView';
import PointsCurve from '../../components/PointsCurve';
import { COLORS } from '../../constants/theme';
import type { Props } from './LiveOverlayScreen.types';
import { styles, PANEL_WIDTH, PANEL_MARGIN, GRAPH_SIZE_FULL, GRAPH_SIZE_ALONE } from './LiveOverlayScreen.styles';

// "Lynx vs Grenoble" → "Grenoble" (la partie qui ne correspond pas à notre équipe).
function guessOpponentName(title: string, teamName: string): string {
  const parts = title.split(/\s+(?:vs\.?|contre|-)\s+/i).map(p => p.trim()).filter(Boolean);
  if (parts.length !== 2) return 'Adversaire';
  const team = teamName.toLowerCase();
  const isMine = (p: string) => {
    const l = p.toLowerCase();
    return l.includes(team) || team.includes(l);
  };
  if (isMine(parts[0]) && !isMine(parts[1])) return parts[1];
  if (isMine(parts[1]) && !isMine(parts[0])) return parts[0];
  return parts[1];
}

const sideColor = (side: LiveSide): string => (side === 'mine' ? COLORS.green : COLORS.pink);

const playerLabel = (p: PublicLivePoint): string => {
  if (p.team === 'opp') return `Adv #${p.player.jersey}`;
  return p.player.name ? `#${p.player.jersey} ${p.player.name}` : `#${p.player.jersey}`;
};

// ── Bandeau score ─────────────────────────────────────────────────────────────

const ScoreBoard = ({ view }: { view: PublicLiveView }) => {
  const opponent = guessOpponentName(view.title, view.teamName);
  const current = view.currentSet;
  const finishedSets = view.sets.filter(s => s.wonBy !== null);
  const isLive = view.status === 'LIVE';

  const rows: { side: LiveSide; name: string }[] = [
    { side: 'mine', name: view.teamName },
    { side: 'opp',  name: opponent },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle} numberOfLines={1}>{view.title}</Text>
        <View style={[styles.statusBadge, isLive ? styles.statusLive : styles.statusEnded]}>
          <Text style={styles.statusText}>{isLive ? '● EN DIRECT' : 'TERMINÉ'}</Text>
        </View>
      </View>

      {rows.map(({ side, name }) => {
        const serving = isLive && current?.serving === side;
        return (
          <View key={side} style={styles.teamRow}>
            <View style={[styles.serveDot, serving && styles.serveDotActive]} />
            <Text style={styles.teamName} numberOfLines={1}>{name}</Text>
            {finishedSets.map(s => (
              <Text
                key={s.setNumber}
                style={[styles.pastSet, s.wonBy === side && styles.pastSetWon]}
              >
                {s.score[side]}
              </Text>
            ))}
            <View style={styles.setsWonBox}>
              <Text style={styles.setsWon}>{view.setsWon[side]}</Text>
            </View>
            {isLive && (
              <Text style={[styles.currentScore, { color: side === 'mine' ? COLORS.scoreHome : COLORS.textSecondary }]}>
                {current?.score[side] ?? 0}
              </Text>
            )}
          </View>
        );
      })}

      <Text style={styles.boardFooter}>
        {!current
          ? 'En attente du début du match'
          : isLive ? `SET ${current.setNumber}` : `Score final · ${view.setsWon.mine} – ${view.setsWon.opp}`}
      </Text>
    </View>
  );
};

// ── Courbe du set en cours ────────────────────────────────────────────────────

const SetCurve = ({ view, size }: { view: PublicLiveView; size: number }) => {
  const current = view.currentSet;
  if (!current) return null;
  const points = current.trajectory.map(p => ({ x: p.mine, y: p.opp }));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>
        SET {current.setNumber} · {current.score.mine} – {current.score.opp}
      </Text>
      <View style={styles.graphBox}>
        <PointsCurve
          points={points}
          size={size}
          pad={40}
          finalScore={{ my: current.score.mine, opp: current.score.opp }}
          fontSize={14}
          dotRadius={4}
          lineWidth={3}
          bgColor={COLORS.bgCard}
        />
      </View>
    </View>
  );
};

// ── Derniers points + meilleurs marqueurs ─────────────────────────────────────

const PointRow = React.memo(({ point }: { point: PublicLivePoint }) => (
  <View style={styles.pointRow}>
    <View style={[styles.pointBar, { backgroundColor: sideColor(point.scoredFor) }]} />
    <Text style={styles.pointScore}>{point.scoreAfter.mine}–{point.scoreAfter.opp}</Text>
    <Text style={styles.pointText} numberOfLines={1}>
      <Text style={styles.pointAction}>{point.action.label}</Text>
      {'  ·  '}{playerLabel(point)}
    </Text>
  </View>
));

const LastPoints = ({ view }: { view: PublicLiveView }) => {
  if (view.lastPoints.length === 0 && view.topScorers.length === 0) return null;
  return (
    <View style={styles.card}>
      {view.lastPoints.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>DERNIERS POINTS</Text>
          {view.lastPoints.map(p => (
            <PointRow key={`${p.setNumber}-${p.sequence}`} point={p} />
          ))}
        </>
      )}
      {view.topScorers.length > 0 && (
        <Text style={styles.scorers} numberOfLines={1}>
          <Text style={styles.sectionLabel}>TOP  </Text>
          {view.topScorers
            .map(s => `#${s.jersey}${s.name ? ` ${s.name}` : ''} ${s.points}`)
            .join('  ·  ')}
        </Text>
      )}
    </View>
  );
};

// ── Écran ─────────────────────────────────────────────────────────────────────

const LiveOverlayScreen = ({ code, view: layout, transparent }: Props) => {
  const { view, loading, error, notFound } = usePublicLiveView(code);
  const { width, height } = useWindowDimensions();

  // Fond transparent pour la source navigateur OBS (body/html ont un fond par défaut).
  useEffect(() => {
    if (!transparent || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
  }, [transparent]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = view ? `${view.title} · Live` : `Live ${code}`;
  }, [view, code]);

  // Grand écran : échelle relative à 1080p. Petit écran : le panneau occupe la largeur.
  const scale = width >= 1280
    ? Math.min(width / 1920, height / 1080)
    : Math.min(1, (width - PANEL_MARGIN) / PANEL_WIDTH);
  const panelLeft = transparent
    ? PANEL_MARGIN * scale
    : Math.max(0, (width - PANEL_WIDTH * scale) / 2);

  let content: React.ReactNode;
  if (loading && !view) {
    content = (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    );
  } else if (notFound) {
    content = (
      <View style={styles.card}>
        <Text style={styles.messageTitle}>Live introuvable</Text>
        <Text style={styles.messageText}>Le code {code} est inconnu ou la diffusion a expiré.</Text>
      </View>
    );
  } else if (!view) {
    content = (
      <View style={styles.card}>
        <Text style={styles.messageTitle}>Connexion impossible</Text>
        <Text style={styles.messageText}>{error ?? 'Nouvel essai en cours…'}</Text>
      </View>
    );
  } else {
    content = (
      <>
        {layout !== 'graph' && <ScoreBoard view={view} />}
        {layout !== 'score' && (
          <SetCurve view={view} size={layout === 'graph' ? GRAPH_SIZE_ALONE : GRAPH_SIZE_FULL} />
        )}
        {layout === 'full' && <LastPoints view={view} />}
        {error !== null && <Text style={styles.staleText}>{error}</Text>}
      </>
    );
  }

  return (
    <View style={[styles.root, transparent ? styles.rootTransparent : styles.rootOpaque]}>
      <View
        style={[
          styles.panel,
          { left: panelLeft, top: PANEL_MARGIN * scale, transform: [{ scale }] },
        ]}
      >
        {content}
      </View>
    </View>
  );
};

export default LiveOverlayScreen;
