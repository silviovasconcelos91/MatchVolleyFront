# Contexte

Le front MatchVolley (React Native + Expo, aussi déployé en web/PWA sur Vercel) saisit les matchs en **temps réel** (live stats). Aujourd'hui le backend ne reçoit le match qu'à la fin, via `POST /api/v1/matches/{matchId}/live-stats` avec le payload `MatchLiveStatsPayload` décrit dans `docs/live-stats-api-contract.md` (je te le fournis à part).

Nouvelle fonctionnalité : **diffusion live publique**. Pendant le match, l'app publie l'état du match. Une page web **sans authentification**, accessible via un **code de match** à 6 caractères, l'affiche en overlay (OBS / Twitch) : score, sets, courbe d'évolution des points, derniers points marqués (qui, quelle action).

Ta mission : implémenter côté backend Kotlin la gestion des **sessions live** et l'**endpoint public**. Respecte l'architecture, les conventions de nommage, le format de réponse (`{ data: ... }`) et la sécurité déjà en place dans le projet. Avant de coder, présente-moi ton plan (entités, tables, endpoints, services, config sécurité, tests) et attends ma validation.

# Modèle

Entité `LiveSession` :

| Champ | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `code` | string(6) | Unique parmi les sessions non expirées. Alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (pas de 0/O/1/I/L). Générer avec `SecureRandom`, réessayer en cas de collision |
| `ownerUserId` | FK user | Créateur (utilisateur authentifié) |
| `teamId` | FK team | Doit appartenir à l'utilisateur |
| `title` | string | Ex. « Les Lynx vs Grenoble » |
| `venue` | `home` \| `away` | |
| `showPlayerNames` | boolean | Défaut `false`. Si `false`, la vue publique n'expose que les numéros de maillot |
| `status` | `LIVE` \| `ENDED` | |
| `revision` | long | Dernière revision acceptée |
| `snapshot` | JSON (jsonb) | Dernier `MatchLiveStatsPayload` reçu, stocké tel quel |
| `createdAt`, `updatedAt`, `endedAt` | timestamp | |
| `expiresAt` | timestamp | `endedAt + 24h`. Pour une session jamais terminée : `updatedAt + 12h` |
| `matchId` | string, nullable | Rempli quand le match final est soumis |

# Endpoints authentifiés (JWT, comme le reste de l'API)

### `POST /api/v1/live-sessions`
Body : `{ "teamId": 42, "title": "Les Lynx vs Grenoble", "venue": "home", "showPlayerNames": false }`
Réponse `201` : `{ "data": { "sessionId": "uuid", "code": "K7P4QX", "publicUrl": "https://<PUBLIC_WEB_URL>/live/K7P4QX" } }`
- `PUBLIC_WEB_URL` vient de la config (variable d'environnement), pas en dur.
- `403` si l'équipe n'appartient pas à l'utilisateur.

### `PUT /api/v1/live-sessions/{sessionId}/snapshot`
Body : `{ "revision": 17, "payload": <MatchLiveStatsPayload> }`
- Le front envoie l'**état complet** du match à chaque changement (debounce ~1 s), undo compris. Ce n'est pas un ajout d'event : on remplace le snapshot.
- Si `revision <= revision stockée` : `200`, mais ignoré (requête réseau arrivée en retard). Réponse `{ "data": { "revision": <stockée>, "applied": false } }`.
- Sinon : on valide le payload (mêmes règles que `POST …/live-stats`, `400` si invalide), on stocke, on fait `revision = revision reçue`. Réponse `{ "data": { "revision": 17, "applied": true } }`.
- `403` si l'utilisateur n'est pas le propriétaire. `409` si la session est `ENDED`.
- Taille max du body : 1 Mo.

### `POST /api/v1/live-sessions/{sessionId}:end`
- Passe en `ENDED`, `endedAt = now`, `expiresAt = now + 24h`. Idempotent.

### `PATCH /api/v1/live-sessions/{sessionId}`
Body : `{ "showPlayerNames": true }`. Seul ce champ est modifiable.

### Modification de `POST /api/v1/matches/{matchId}/live-stats`
- Accepter un champ racine **optionnel** `liveSessionId` (UUID). S'il est présent et appartient à l'utilisateur : `matchId` est renseigné sur la session et la session est terminée (comme `:end`). Sans ce champ, comportement inchangé.

# Endpoint PUBLIC (sans authentification)

### `GET /api/v1/public/live/{code}`
- Accessible **sans token** : à ajouter explicitement dans la config de sécurité, seulement pour ce chemin.
- Code insensible à la casse (normaliser en majuscules).
- `404` si code inconnu ou session expirée. Même réponse dans les deux cas, pour ne pas révéler l'existence d'un code.
- Header `ETag` = `"<sessionId>-<revision>-<status>"`. Si la requête contient `If-None-Match` égal à cet ETag : `304` sans body. Le front poll toutes les 2 s, donc ce chemin doit être très léger (idéalement pas de désérialisation du snapshot).
- `Cache-Control: no-cache`.
- CORS : autoriser l'origine du front web (config) en `GET`, avec les headers `If-None-Match` et `ETag` exposés (`Access-Control-Expose-Headers: ETag`).
- **Rate limit** par IP (ex. 120 req/min) → `429`.
- Ne jamais exposer : `ownerUserId`, `teamId`, IDs internes des joueurs, `sessionId`.

Réponse `200`. Tous les calculs sont faits **côté backend** à partir du snapshot (la logique métier reste dans le backend) :

```json
{
  "data": {
    "code": "K7P4QX",
    "title": "Les Lynx vs Grenoble",
    "teamName": "Les Lynx",
    "venue": "home",
    "status": "LIVE",
    "updatedAt": "2026-11-05T19:42:10Z",
    "setsWon": { "mine": 1, "opp": 1 },
    "currentSet": {
      "setNumber": 3,
      "score": { "mine": 14, "opp": 12 },
      "serving": "mine",
      "trajectory": [
        { "mine": 0, "opp": 0 },
        { "mine": 1, "opp": 0 },
        { "mine": 1, "opp": 1 }
      ]
    },
    "sets": [
      { "setNumber": 1, "score": { "mine": 25, "opp": 21 }, "wonBy": "mine" },
      { "setNumber": 2, "score": { "mine": 23, "opp": 25 }, "wonBy": "opp" },
      { "setNumber": 3, "score": { "mine": 14, "opp": 12 }, "wonBy": null }
    ],
    "lastPoints": [
      {
        "sequence": 42,
        "setNumber": 3,
        "scoredFor": "mine",
        "scoreAfter": { "mine": 14, "opp": 12 },
        "team": "mine",
        "player": { "jersey": 7, "name": "Dupont" },
        "action": { "key": "attack_pt", "label": "Attaque", "category": "point" }
      }
    ],
    "topScorers": [
      { "jersey": 7, "name": "Dupont", "points": 9 }
    ]
  }
}
```

Règles de calcul :
- Seuls les events avec `scoredFor != null` comptent comme points. Les events `neutral` sont ignorés partout dans cette vue.
- `currentSet` = set avec le plus grand `setNumber` du snapshot. `trajectory` = score cumulé après chaque point, en commençant par `{0,0}`.
- `serving` = `scoredFor` du dernier point du set (le gagnant du rallye sert). `null` s'il n'y a encore aucun point.
- `lastPoints` = 5 derniers points, tous sets confondus, du plus récent au plus ancien. `player` pointe le joueur qui a **réalisé l'action** (pour une faute, c'est le fautif ; `scoredFor` indique l'équipe qui prend le point).
- `topScorers` = 3 joueurs de **mon équipe** avec le plus de points (`category == "point"`, `team == "mine"`) sur tout le match. Égalité départagée par numéro de maillot croissant.
- Si `showPlayerNames == false` : `name` vaut `null` partout (on garde `jersey`). Les joueurs adverses ont toujours `name: null`.
- `status: "ENDED"` : même structure, avec le dernier snapshot.

# Nettoyage

- Job planifié (ex. toutes les heures) qui supprime les sessions dont `expiresAt < now`.

# Tests attendus

- Création : code au bon format, unicité, `403` sur une équipe d'un autre utilisateur.
- Snapshot : revision plus ancienne ignorée, `409` après la fin, `400` sur un payload invalide, `403` pour un autre utilisateur.
- Public : accessible sans token, `404` sur code inconnu et sur session expirée, `304` avec ETag, masquage des noms, champs sensibles absents.
- Calculs : trajectoire, `serving`, `lastPoints` (ordre, faute adverse), `topScorers` (départage), undo (un snapshot avec moins d'events fait baisser le score).
- `POST …/live-stats` avec `liveSessionId` : la session passe en `ENDED` avec `matchId`.

# Livrables

- Endpoints ci-dessus + mise à jour de la spec OpenAPI (le front régénère son client avec `npm run generate-api`).
- Une doc courte `live-overlay-api-doc.md` (même style que `live-stats-analysis-api-doc.md`) avec un exemple de chaque requête et réponse.
