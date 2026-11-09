// view=score : bandeau score seul · view=graph : courbe seule · view=full : tout (défaut)
export type OverlayView = 'score' | 'graph' | 'full';

export type LiveOverlayRoute = {
  code:        string;   // 6 caractères, en majuscules
  view:        OverlayView;
  transparent: boolean;  // bg=transparent (source navigateur OBS)
};

export type Props = LiveOverlayRoute;
