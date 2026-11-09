// ─────────────────────────────────────────────
//  HOOK : SYNCHRO DU SNAPSHOT LIVE
//
//  À chaque changement des events (ajout, undo, set suivant…), envoie
//  l'état complet du match au backend (PUT snapshot), debouncé ~1 s.
//  - `revision` croissante gérée ici (le backend ignore les revisions obsolètes)
//  - un seul envoi en vol ; seul le dernier snapshot en attente est conservé
//  - échec réseau → retry avec backoff exponentiel
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveStatEvent } from '../data/liveStats';
import type { LiveStatsMatchMeta, MatchLiveStatsPayload } from '../data/liveStatsPayload';
import { buildLiveStatsPayload } from '../data/liveStatsPayload';
import { LiveApiError, pushLiveSnapshot } from '../data/liveSessionApi';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';
export type SessionClosedReason = 'ended' | 'notFound';

const DEBOUNCE_MS   = 1000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS  = 30_000;

type Options = {
  sessionId:  string | null;
  meta:       LiveStatsMatchMeta | null;
  sets:       Record<number, LiveStatEvent[]>;
  ongoingSet: number | null;
  onSessionClosed: (reason: SessionClosedReason) => void;
};

type Job = { revision: number; payload: MatchLiveStatsPayload };

export function useLiveBroadcastSync({ sessionId, meta, sets, ongoingSet, onSessionClosed }: Options) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  // Dernières valeurs lues au moment de l'envoi (pas au moment du changement).
  const latestRef = useRef({ meta, sets, ongoingSet });
  latestRef.current = { meta, sets, ongoingSet };
  const onClosedRef = useRef(onSessionClosed);
  onClosedRef.current = onSessionClosed;

  const sessionRef  = useRef<string | null>(sessionId);
  const revisionRef = useRef(0);
  const pendingRef  = useRef<Job | null>(null);
  const loopRef     = useRef<Promise<void> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  const clearRetry = () => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  };

  const runLoop = useCallback((): Promise<void> => {
    if (loopRef.current) return loopRef.current;

    const loop = (async () => {
      while (pendingRef.current && sessionRef.current) {
        const job = pendingRef.current;
        const sid = sessionRef.current;
        pendingRef.current = null;
        try {
          await pushLiveSnapshot(sid, job.revision, job.payload);
          failuresRef.current = 0;
        } catch (e) {
          if (sessionRef.current !== sid) return; // session changée entre-temps
          const status = e instanceof LiveApiError ? e.status : null;

          if (status === 409 || status === 404) {
            pendingRef.current = null;
            onClosedRef.current(status === 409 ? 'ended' : 'notFound');
            return;
          }
          if (status === 400 || status === 403 || status === 413) {
            // Erreur non rejouable : on attend le prochain changement.
            setSyncStatus('error');
            return;
          }

          // Réseau / 5xx : on garde le snapshot le plus récent et on réessaie.
          if (!pendingRef.current) pendingRef.current = job;
          failuresRef.current += 1;
          setSyncStatus('offline');
          const delay = Math.min(RETRY_BASE_MS * 2 ** (failuresRef.current - 1), RETRY_MAX_MS);
          clearRetry();
          retryRef.current = setTimeout(() => {
            retryRef.current = null;
            void runLoop();
          }, delay);
          return;
        }
      }
      if (sessionRef.current) setSyncStatus('synced');
    })().finally(() => { loopRef.current = null; });

    loopRef.current = loop;
    return loop;
  }, []);

  // Construit le snapshot courant et lance l'envoi.
  const enqueue = useCallback((): Promise<void> => {
    const { meta: m, sets: s, ongoingSet: o } = latestRef.current;
    if (!sessionRef.current || !m) return Promise.resolve();
    revisionRef.current += 1;
    pendingRef.current = {
      revision: revisionRef.current,
      payload:  buildLiveStatsPayload(m, s, { ongoingSet: o }),
    };
    clearRetry();
    return runLoop();
  }, [runLoop]);

  // Nouvelle session (ou fin) : repartir de zéro.
  useEffect(() => {
    sessionRef.current  = sessionId;
    revisionRef.current = 0;
    pendingRef.current  = null;
    failuresRef.current = 0;
    clearRetry();
    setSyncStatus(sessionId ? 'pending' : 'synced');
  }, [sessionId]);

  // Changement d'état du match → envoi debouncé.
  useEffect(() => {
    if (!sessionId || !meta) return;
    setSyncStatus('pending');
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void enqueue();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [sessionId, meta, sets, ongoingSet, enqueue]);

  // Démontage : plus de retry.
  useEffect(() => () => clearRetry(), []);

  // Envoi immédiat (avant la soumission finale ou l'arrêt de la diffusion).
  const flush = useCallback((): Promise<void> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return enqueue();
  }, [enqueue]);

  return { syncStatus, flush };
}
