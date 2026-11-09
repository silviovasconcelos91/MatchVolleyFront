// ─────────────────────────────────────────────
//  HOOK : POLLING DE LA VUE PUBLIQUE LIVE
//
//  GET /public/live/{code} toutes les 2 s avec If-None-Match (304 = rien de neuf).
//  404 → code inconnu ou expiré (arrêt du polling). 429 → attente Retry-After.
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { PublicLiveView } from '../data/liveSessionApi';
import { getPublicLiveView } from '../data/liveSessionApi';

const POLL_MS       = 2000;
const POLL_ENDED_MS = 10_000;
const RETRY_MS      = 5000;

type State = {
  view:     PublicLiveView | null;
  loading:  boolean;
  error:    string | null;
  notFound: boolean;
};

export function usePublicLiveView(code: string): State {
  const [view, setView]         = useState<PublicLiveView | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let etag: string | null = null;
    let ended = false;
    const controller = new AbortController();

    const tick = async () => {
      let delay: number | null = POLL_MS;
      try {
        const result = await getPublicLiveView(code, etag, controller.signal);
        if (cancelled) return;
        switch (result.kind) {
          case 'ok':
            etag  = result.etag;
            ended = result.view.status === 'ENDED';
            setView(result.view);
            setError(null);
            break;
          case 'notModified':
            setError(null);
            break;
          case 'notFound':
            setView(null);
            setNotFound(true);
            delay = null;
            break;
          case 'rateLimited':
            delay = result.retryAfterMs;
            break;
        }
        if (delay === POLL_MS && ended) delay = POLL_ENDED_MS;
      } catch {
        if (cancelled) return;
        setError('Connexion perdue, nouvel essai…');
        delay = RETRY_MS;
      }
      setLoading(false);
      if (delay !== null) timer = setTimeout(() => { void tick(); }, delay);
    };

    setLoading(true);
    setNotFound(false);
    setView(null);
    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [code]);

  return { view, loading, error, notFound };
}
