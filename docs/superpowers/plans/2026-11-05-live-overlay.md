# Plan — Overlay live public (code de match)

## Objectif

Pendant un match saisi en temps réel, publier le score en ligne pour qu'un autre poste (OBS / Twitch) l'affiche en overlay via une page **sans authentification**, accessible par un **code de match** court (ex. `K7P4QX`).

La page affiche : score du set, sets gagnés, courbe d'évolution des points du set, derniers points (qui a marqué, quelle action).

## État actuel (contraintes)

- Les events live vivent uniquement en mémoire dans `LiveStatsContext` (`sets: Record<number, LiveStatEvent[]>`, actions `addEvent` / `undo` / `nextSet` / `reset`).
- Le backend ne connaît le match **qu'à la fin** : `submitMatch` génère `matchId = Date.now()` puis `POST /api/v1/matches/{matchId}/live-stats` avec `MatchLiveStatsPayload`.
- Pas de React Navigation : `App.tsx` est une machine à états, derrière `AuthGate`.
- Web déployé sur Vercel en SPA (`rewrites: /(.*) → /`). Une URL `/live/K7P4QX` arrive donc déjà sur l'app.

## Choix d'architecture (recommandés)

| Sujet | Choix | Pourquoi |
|---|---|---|
| Synchro app → backend | **Snapshot complet** (`PUT`) du `MatchLiveStatsPayload` à chaque changement, debouncé ~1 s | L'undo, le changement de set et la reprise après coupure réseau marchent tout seuls. Réutilise le payload existant. Taille faible (< 100 Ko pour un match complet). |
| Ordre / concurrence | Champ `revision` croissant envoyé par l'app. Le backend ignore une revision ≤ celle stockée | Évite qu'un vieux PUT réseau écrase un plus récent |
| Diffusion vers l'overlay | **Polling** `GET` toutes les 2 s avec `ETag` / `If-None-Match` → `304` | Simple, marche partout (OBS, proxy, Vercel). SSE possible en v2 sans changer le modèle |
| Calculs (score, courbe, derniers points) | **Backend** produit un DTO prêt à afficher | Règle CLAUDE.md : la logique métier reste dans le backend Kotlin |
| Page overlay | Route web `/live/{code}` dans la même app Expo web, **avant** `AuthGate` | Pas de second projet à déployer |
| Code | 6 caractères, alphabet sans ambiguïté `ABCDEFGHJKMNPQRSTUVWXYZ23456789` | Facile à dicter / taper ; ~10⁹ combinaisons |

## Flux

1. L'utilisateur lance la saisie live (après validation du roster, avant le set 1). Un bouton **« Diffuser en direct »** (opt-in) appelle `POST /api/v1/live-sessions` → `{ sessionId, code, publicUrl }`.
2. L'app affiche le code + l'URL (copier / partager / QR plus tard).
3. À chaque changement de `LiveStatsContext` (ou de `setsWon`) : `PUT /api/v1/live-sessions/{sessionId}/snapshot` (debounce 1 s, `revision++`). En cas d'échec, on garde seulement le dernier snapshot en attente et on réessaie (backoff). Pas de file d'events.
4. L'overlay (OBS « Source navigateur » → `https://<app>/live/K7P4QX?view=full&bg=transparent`) poll `GET /api/v1/public/live/K7P4QX`.
5. « Envoyer et terminer » : `submitMatch` envoie aussi `liveSessionId`. Le backend passe la session en `ENDED`. L'overlay affiche « Match terminé » + score final. La session expire 24 h après la fin (puis `404`).

## Étapes front

### 1. Types + client API — `src/data/liveSessionApi.ts`
- Types `LiveSession` (`sessionId`, `code`, `publicUrl`) et `PublicLiveView` (DTO public, cf. prompt backend), sans `any`.
- `createLiveSession(meta)`, `pushLiveSnapshot(sessionId, revision, payload)`, `endLiveSession(sessionId)`, `getPublicLiveView(code, etag)`.
- `getPublicLiveView` utilise un `fetch` **nu** (pas le `client` hey-api), pour ne jamais injecter de token ni déclencher le refresh 401.
- Après livraison backend : `npm run generate-api` et remplacer les types manuels par ceux générés.

### 2. État de diffusion — étendre `LiveStatsContext` (ou petit `LiveBroadcastContext`)
- État : `broadcast: { sessionId, code, status: 'idle' | 'starting' | 'live' | 'error' } | null`.
- Le payload n'est **pas** stocké : il est dérivé via `buildLiveStatsPayload(meta, state.sets)` (single source of truth).

### 3. Hook de synchro — `src/hooks/useLiveBroadcastSync.ts`
- Entrée : `sets`, `setsWon`, `broadcast`. Debounce 1 s, `revision` dans un `useRef`.
- Un seul envoi en vol à la fois. Si un changement arrive pendant l'envoi, on renvoie le dernier snapshot à la fin.
- Expose `syncStatus: 'synced' | 'pending' | 'offline'` pour un petit indicateur dans `ScoreHeader`.

### 4. UI côté saisie
- Bouton « Diffuser » dans `ScoreHeader` (ou onglet Stats) → modal avec code en gros, URL, bouton copier (`expo-clipboard`), bouton « Arrêter la diffusion ».
- Pastille d'état (vert synchro / orange en attente / rouge hors ligne).

### 5. Fin de match
- `submitMatch(…, liveSessionId?)` ajoute `liveSessionId` au payload final. Côté backend : session terminée + liée au match.

### 6. Page overlay publique — `src/screens/LiveOverlayScreen/`
- Dossier complet (`index.ts`, `.tsx`, `.styles.ts`, `.types.ts`).
- Polling 2 s, `loading` / `error` explicites, état « code inconnu ou expiré », état « match terminé ».
- Paramètres URL :
  - `view=score` : bandeau score seul.
  - `view=graph` : courbe seule.
  - `view=full` (par défaut) : score + courbe + 5 derniers points.
  - `bg=transparent` : fond transparent pour OBS.
- Courbe : extraire la logique SVG commune de `SetGraph` / `GraphScreen` dans un composant `PointsCurve` réutilisé (aujourd'hui dupliquée dans les deux).
- Pas de `ScrollView`. Taille fixe pensée 1920×1080, mise à l'échelle par `useWindowDimensions`.

### 7. Routage web public — `App.tsx`
- Avant `AuthProvider` : si `Platform.OS === 'web'` et `window.location.pathname` correspond à `^/live/([A-Z0-9]{6})$`, rendre `<LiveOverlayScreen code=… />` et rien d'autre (pas d'auth, pas de providers de match).
- Sur mobile natif : pas de route publique (l'overlay n'a de sens que dans un navigateur).
- `vercel.json` : rewrite SPA déjà OK. Ajouter un header `Cache-Control: no-cache` sur `/live/(.*)`.

### 8. Config
- `PUBLIC_WEB_URL` dans `app.config.ts` → `extra`, pour construire l'URL affichée. Ou bien utiliser `publicUrl` renvoyé par le backend (préférable : une seule source).

### 9. Vérification
- `npx tsc --noEmit`.
- Scénario manuel : 2 navigateurs. Saisie sur l'un, overlay `/live/CODE` sur l'autre. Vérifier : point, undo, set suivant, coupure réseau (mode avion) puis reprise, fin de match, code invalide.
- Test OBS : source navigateur 1920×1080, `bg=transparent`.

## Ordre de livraison

1. Backend (prompt `docs/live-overlay-backend-prompt.md`) + régénération client.
2. Étapes 1 → 3 (synchro, sans UI : vérifier en BDD / via le `GET` public).
3. Étapes 6 → 7 (overlay lisible).
4. Étapes 4 → 5 (UI de diffusion + fin de match).

## Questions ouvertes

- **Noms des joueurs publics ?** Mineurs possibles → proposer un réglage par session : `showPlayerNames` (sinon afficher seulement `#7`). Recommandé : par défaut `false`.
- Afficher le nom de l'équipe adverse ? Aujourd'hui seul `title` (« Lynx vs Grenoble ») existe ; le DTO l'utilise tel quel.
- SSE en v2 si 2 s de latence gêne (peu probable en stream, qui a lui-même 5 à 10 s de délai).
