// ─────────────────────────────────────────────
//  ÉCRAN : OVERLAY LIVE PUBLIC (web, sans authentification)
//
//  URL : /live/{code}?view=score|graph|full&bg=transparent
//  full (défaut) : bandeau face à face + 3 dernières actions du set en cours
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
import { styles, PANEL_WIDTH, PANEL_MARGIN, GRAPH_SIZE_ALONE } from './LiveOverlayScreen.styles';

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
  if (p.team === 'opp') return 'Adversaire';
  return p.player.name ? `#${p.player.jersey} ${p.player.name}` : `#${p.player.jersey}`;
};

// ── Bandeau score ─────────────────────────────────────────────────────────────

// Match en 3 sets gagnants : une puce par set à gagner.
const SETS_TO_WIN = 3;

const SetDots = React.memo(({ side, won }: { side: LiveSide; won: number }) => (
  <View style={styles.dots}>
    {Array.from({ length: SETS_TO_WIN }, (_, i) => (
      <View
        key={i}
        style={[styles.dot, i < won && { backgroundColor: sideColor(side), borderColor: sideColor(side) }]}
      />
    ))}
  </View>
));

// Face à face : nom + puces des sets gagnés de chaque côté, score du set en cours au centre.
const ScoreBoard = ({ view }: { view: PublicLiveView }) => {
  const opponent = guessOpponentName(view.title, view.teamName);
  const current = view.currentSet;
  const isLive = view.status === 'LIVE';

  // Terminé : on affiche les sets gagnés au centre (score final du match).
  const score = isLive ? current?.score ?? { mine: 0, opp: 0 } : view.setsWon;
  // Temps mort en cours : remplace « SET n ». Nom adverse inconnu du backend → « Adversaire ».
  const activeTimeout = isLive ? current?.activeTimeout ?? null : null;
  const header = !isLive
    ? 'TERMINÉ'
    : activeTimeout
    ? `TEMPS MORT · ${activeTimeout === 'mine' ? view.teamName : 'Adversaire'}`
    : current ? `SET ${current.setNumber}` : 'EN ATTENTE';
  const timeouts = isLive ? current?.timeouts ?? null : null;

  return (
    <View style={styles.card}>
      <View style={styles.setHeader}>
        {isLive && <View style={styles.liveDot} />}
        <Text style={[styles.setHeaderText, activeTimeout !== null && styles.setHeaderTimeout]}>
          {header}
        </Text>
      </View>

      <View style={styles.faceOff}>
        <View style={styles.teamCol}>
          <Text style={styles.teamName} numberOfLines={1}>{view.teamName}</Text>
          <SetDots side="mine" won={view.setsWon.mine} />
          {timeouts !== null && <Text style={styles.timeoutCount}>TM {timeouts.mine}</Text>}
        </View>
        <Text style={[styles.bigScore, styles.bigScoreMine]}>{score.mine}</Text>
        <Text style={styles.scoreDash}>–</Text>
        <Text style={[styles.bigScore, styles.bigScoreOpp]}>{score.opp}</Text>
        <View style={styles.teamCol}>
          <Text style={styles.teamName} numberOfLines={1}>{opponent}</Text>
          <SetDots side="opp" won={view.setsWon.opp} />
          {timeouts !== null && <Text style={styles.timeoutCount}>TM {timeouts.opp}</Text>}
        </View>
      </View>
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

// ── 3 dernières actions du set en cours ───────────────────────────────────────

const LAST_ACTIONS_COUNT = 3;

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
  const current = view.currentSet;
  if (view.status !== 'LIVE' || !current) return null;
  // lastPoints arrive du plus récent au plus ancien, tous sets confondus.
  const setPoints = view.lastPoints
    .filter(p => p.setNumber === current.setNumber)
    .slice(0, LAST_ACTIONS_COUNT);
  if (setPoints.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>ACTIONS · SET {current.setNumber}</Text>
      {setPoints.map(p => (
        <PointRow key={`${p.setNumber}-${p.sequence}`} point={p} />
      ))}
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
        {layout === 'graph' && <SetCurve view={view} size={GRAPH_SIZE_ALONE} />}
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
