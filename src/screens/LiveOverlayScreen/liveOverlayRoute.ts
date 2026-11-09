import { Platform } from 'react-native';
import type { LiveOverlayRoute, OverlayView } from './LiveOverlayScreen.types';

const LIVE_PATH = /^\/live\/([A-Za-z0-9]{6})\/?$/;
const VIEWS: OverlayView[] = ['score', 'graph', 'full'];

const isOverlayView = (v: string | null): v is OverlayView =>
  v !== null && (VIEWS as string[]).includes(v);

// Route publique web `/live/{code}?view=…&bg=transparent`, rendue sans authentification.
// Toujours null sur mobile natif : l'overlay n'a de sens que dans un navigateur.
export function getLiveOverlayRoute(): LiveOverlayRoute | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const match = LIVE_PATH.exec(window.location.pathname);
  if (!match) return null;

  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  return {
    code:        match[1].toUpperCase(),
    view:        isOverlayView(view) ? view : 'full',
    transparent: params.get('bg') === 'transparent',
  };
}
