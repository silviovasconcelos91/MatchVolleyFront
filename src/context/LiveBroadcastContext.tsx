// ─────────────────────────────────────────────
//  CONTEXTE : DIFFUSION LIVE PUBLIQUE
//
//  Session de diffusion (code à 6 caractères) + synchro du snapshot.
//  Le payload n'est pas stocké : il est dérivé des events de LiveStatsContext.
//  Doit être placé sous LiveStatsProvider, MatchProvider et TeamProvider.
// ─────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveStats } from './LiveStatsContext';
import { useMatch } from './MatchContext';
import { useTeam } from './TeamContext';
import type { LiveSession } from '../data/liveSessionApi';
import { createLiveSession, endLiveSession, setLiveShowPlayerNames } from '../data/liveSessionApi';
import type { LiveStatsMatchMeta } from '../data/liveStatsPayload';
import type { SessionClosedReason, SyncStatus } from '../hooks/useLiveBroadcastSync';
import { useLiveBroadcastSync } from '../hooks/useLiveBroadcastSync';

export type BroadcastStatus = 'idle' | 'starting' | 'live' | 'stopping';

type Broadcast = { session: LiveSession; matchId: string };

type LiveBroadcastContextValue = {
  session:    LiveSession | null;
  status:     BroadcastStatus;
  error:      string | null;
  syncStatus: SyncStatus;
  actions: {
    start:              (showPlayerNames: boolean) => Promise<void>;
    stop:               () => Promise<void>;
    setShowPlayerNames: (value: boolean) => Promise<void>;
    flush:              () => Promise<void>;
    // Session terminée côté backend par la soumission finale : on l'oublie sans appeler :end.
    detach:             () => void;
  };
};

const LiveBroadcastContext = createContext<LiveBroadcastContextValue | null>(null);

export const LiveBroadcastProvider = ({ children }: { children: React.ReactNode }) => {
  const { state: liveState } = useLiveStats();
  const { state: matchState } = useMatch();
  const { selectedTeam } = useTeam().state;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [status, setStatus] = useState<BroadcastStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const sessionId = broadcast?.session.sessionId ?? null;
  const matchId = broadcast?.matchId ?? null;
  const { matchName, isHome, setBannerVisible } = matchState;

  const meta = useMemo<LiveStatsMatchMeta | null>(() => {
    if (!selectedTeam || matchId === null) return null;
    return {
      matchId,
      teamId:   selectedTeam.id,
      teamName: selectedTeam.name,
      title:    matchName ?? '',
      venue:    isHome ? 'home' : 'away',
    };
  }, [selectedTeam, matchId, matchName, isHome]);

  // Set en cours = dernier set, sauf quand la bannière de fin de set est affichée.
  const ongoingSet = setBannerVisible ? null : liveState.currentSet;

  const handleSessionClosed = useCallback((reason: SessionClosedReason) => {
    setBroadcast(null);
    setStatus('idle');
    setError(reason === 'ended' ? 'La diffusion a été arrêtée.' : 'La diffusion a expiré.');
  }, []);

  const { syncStatus, flush } = useLiveBroadcastSync({
    sessionId,
    meta,
    sets: liveState.sets,
    ongoingSet,
    onSessionClosed: handleSessionClosed,
  });

  const start = useCallback(async (showPlayerNames: boolean) => {
    if (!selectedTeam) return;
    setStatus('starting');
    setError(null);
    try {
      const session = await createLiveSession({
        teamId: selectedTeam.id,
        title:  matchName ?? selectedTeam.name,
        venue:  isHome ? 'home' : 'away',
        showPlayerNames,
      });
      setBroadcast({ session, matchId: String(Date.now()) });
      setStatus('live');
    } catch {
      setStatus('idle');
      setError('Impossible de démarrer la diffusion. Vérifier la connexion.');
    }
  }, [selectedTeam, matchName, isHome]);

  const stop = useCallback(async () => {
    if (!sessionId) return;
    setStatus('stopping');
    setError(null);
    try {
      await flush();
      await endLiveSession(sessionId);
      setBroadcast(null);
      setStatus('idle');
    } catch {
      setStatus('live');
      setError('Impossible d\'arrêter la diffusion. Réessayer.');
    }
  }, [sessionId, flush]);

  const setShowPlayerNames = useCallback(async (value: boolean) => {
    if (!sessionId) return;
    setError(null);
    try {
      const session = await setLiveShowPlayerNames(sessionId, value);
      setBroadcast(prev => (prev ? { ...prev, session } : prev));
    } catch {
      setError('Impossible de modifier l\'affichage des noms.');
    }
  }, [sessionId]);

  // Quitter le match (reset, retour…) sans soumission : on termine la session.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const detach = useCallback(() => {
    // Mis à null tout de suite : le provider peut être démonté sans re-render.
    sessionIdRef.current = null;
    setBroadcast(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => {
    const id = sessionIdRef.current;
    if (id) endLiveSession(id).catch(() => {});
  }, []);

  const actions = useMemo(
    () => ({ start, stop, setShowPlayerNames, flush, detach }),
    [start, stop, setShowPlayerNames, flush, detach],
  );

  const value = useMemo<LiveBroadcastContextValue>(() => ({
    session: broadcast?.session ?? null,
    status,
    error,
    syncStatus,
    actions,
  }), [broadcast, status, error, syncStatus, actions]);

  return (
    <LiveBroadcastContext.Provider value={value}>
      {children}
    </LiveBroadcastContext.Provider>
  );
};

export const useLiveBroadcast = (): LiveBroadcastContextValue => {
  const ctx = useContext(LiveBroadcastContext);
  if (!ctx) throw new Error('useLiveBroadcast doit être utilisé dans un LiveBroadcastProvider');
  return ctx;
};
