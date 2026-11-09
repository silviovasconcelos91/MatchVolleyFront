# Live Overlay — API Frontend

Ce document décrit les endpoints de **diffusion live publique** : l'app publie l'état du match pendant la saisie temps réel, et une page web publique (overlay OBS / Twitch) l'affiche via un **code à 6 caractères**.

Tous les calculs (score, sets, trajectoire, derniers points, meilleurs marqueurs) sont faits côté backend.

---

## Authentification

Endpoints `/api/v1/live-sessions/**` :

```
Authorization: Bearer <access_token>
```

Endpoint `/api/v1/public/live/{code}` : **aucune authentification**.

---

## Cycle de vie

```
POST /live-sessions                → LIVE (revision 0, pas de snapshot)
PUT  /live-sessions/{id}/snapshot  → remplace le snapshot (à chaque changement, debounce ~1 s)
POST /live-sessions/{id}:end       → ENDED      (ou POST /matches/{matchId}/live-stats avec liveSessionId)
```

| Statut | Expiration (`expiresAt`) |
|---|---|
| `LIVE` | `updatedAt + 12h` (repoussée à chaque snapshot appliqué) |
| `ENDED` | `endedAt + 24h` |

Une session expirée répond `404` partout ; elle est supprimée par un job horaire.

---

## 1. Créer une session

```
POST /api/v1/live-sessions
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "teamId": 42,
  "title": "Les Lynx vs Grenoble",
  "venue": "home",
  "showPlayerNames": false
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `teamId` | `number` | oui | Équipe de l'utilisateur |
| `title` | `string` | oui | Max 255 caractères |
| `venue` | `"home"` \| `"away"` | oui | |
| `showPlayerNames` | `boolean` | non | Défaut `false` : la vue publique n'expose que les numéros de maillot |

**Réponse `201`**

```json
{
  "data": {
    "sessionId": "3f0c6a8e-5b1d-4c47-9a57-0e3c2b7f1d22",
    "code": "K7P4QX",
    "publicUrl": "https://matchvolley.app/live/K7P4QX",
    "title": "Les Lynx vs Grenoble",
    "venue": "home",
    "status": "LIVE",
    "showPlayerNames": false,
    "revision": 0,
    "matchId": null,
    "createdAt": "2026-11-05T19:00:00.000Z",
    "updatedAt": "2026-11-05T19:00:00.000Z",
    "endedAt": null,
    "expiresAt": "2026-11-06T07:00:00.000Z"
  },
  "message": "Live session created successfully",
  "status": 201
}
```

- `code` : 6 caractères parmi `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (pas de 0/O/1/I/L).
- `publicUrl` : construite à partir de la variable d'environnement `PUBLIC_WEB_URL`.

| Code | Cas |
|---|---|
| `201` | Créée |
| `400` | `teamId` manquant, `title` vide, `venue` invalide |
| `401` | Token absent ou invalide |
| `403` | L'équipe n'appartient pas à l'utilisateur |

---

## 2. Publier l'état du match

```
PUT /api/v1/live-sessions/{sessionId}/snapshot
Authorization: Bearer <token>
Content-Type: application/json
```

Envoyer **l'état complet** du match (undo compris) : le snapshot est remplacé, ce n'est pas un ajout d'event. `payload` suit le format décrit en **Annexe — Format du `payload`** (même format que la soumission finale `POST /matches/{matchId}/live-stats`).

```json
{
  "revision": 17,
  "payload": {
    "matchId": "1762369200000",
    "teamId": 42,
    "teamName": "Les Lynx",
    "title": "Les Lynx vs Grenoble",
    "venue": "home",
    "recordedAt": "2026-11-05T19:42:09.000Z",
    "setsWon": { "mine": 1, "opp": 1 },
    "sets": [
      {
        "setNumber": 3,
        "scoreTeam": 1,
        "scoreOpp": 0,
        "wonBy": null,
        "events": [
          {
            "id": "ev-301",
            "sequence": 1,
            "ts": 1762371729000,
            "team": "mine",
            "player": { "id": 3, "jersey": 7, "name": "Dupont", "position": 4, "poste": "R4" },
            "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
            "trajectory": { "from": 4, "to": 1 },
            "scoredFor": "mine"
          }
        ]
      }
    ]
  }
}
```

- `revision` : entier croissant (≥ 1) géré par l'app, incrémenté à chaque changement.
- Si `revision <= revision stockée`, la requête est **ignorée** (réponse réseau en retard) : `200` avec `applied: false`.

**Réponse `200` — appliqué**

```json
{
  "data": { "revision": 17, "applied": true },
  "message": "Snapshot applied",
  "status": 200
}
```

**Réponse `200` — ignoré (revision obsolète)**

```json
{
  "data": { "revision": 18, "applied": false },
  "message": "Snapshot ignored (stale revision)",
  "status": 200
}
```

### Règles de validation (`400`)

- `revision` présent et ≥ 1, `payload` présent ;
- `venue` ∈ `home` | `away` (si fourni) ;
- `sets` présent (peut être vide), au plus 5, `setNumber` entre 1 et 5 et unique ;
- `wonBy` ∈ `mine` | `opp` | `null` ;
- chaque event : `sequence` ≥ 1, `team` ∈ `mine` | `opp`, `player.jersey` présent, `action.key` et `action.category` présents ;
- temps mort (`action.key == "timeout"`) : `player` peut être `null`, `category` doit être `neutral`, `trajectory` et `scoredFor` doivent être `null` ;
- `action.category` ∈ `point` | `fault` | `neutral`, et `scoredFor` cohérent : `point` → `team`, `fault` → adversaire, `neutral` → `null` ;
- `poste` hors liste → `400`.

| Code | Cas |
|---|---|
| `200` | Appliqué ou ignoré (voir `applied`) |
| `400` | Payload invalide |
| `401` | Token absent ou invalide |
| `403` | La session appartient à un autre utilisateur |
| `404` | Session inconnue ou expirée |
| `409` | Session terminée (`ENDED`) |
| `413` | Body > 1 Mo |

---

## 3. Terminer la session

```
POST /api/v1/live-sessions/{sessionId}:end
Authorization: Bearer <token>
```

Idempotent : un second appel renvoie la session sans modifier `endedAt`.

**Réponse `200`**

```json
{
  "data": {
    "sessionId": "3f0c6a8e-5b1d-4c47-9a57-0e3c2b7f1d22",
    "code": "K7P4QX",
    "publicUrl": "https://matchvolley.app/live/K7P4QX",
    "title": "Les Lynx vs Grenoble",
    "venue": "home",
    "status": "ENDED",
    "showPlayerNames": false,
    "revision": 42,
    "matchId": null,
    "createdAt": "2026-11-05T19:00:00.000Z",
    "updatedAt": "2026-11-05T21:05:00.000Z",
    "endedAt": "2026-11-05T21:05:00.000Z",
    "expiresAt": "2026-11-06T21:05:00.000Z"
  },
  "message": "Live session ended",
  "status": 200
}
```

| Code | Cas |
|---|---|
| `200` | Terminée (ou déjà terminée) |
| `401` | Token absent ou invalide |
| `403` | La session appartient à un autre utilisateur |
| `404` | Session inconnue ou expirée |

---

## 4. Afficher / masquer les noms

```
PATCH /api/v1/live-sessions/{sessionId}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "showPlayerNames": true }
```

Seul `showPlayerNames` est modifiable (les autres champs sont ignorés). Autorisé aussi après `ENDED`.

**Réponse `200`** : même structure que `:end`, avec `"showPlayerNames": true`.

| Code | Cas |
|---|---|
| `200` | Modifiée |
| `400` | `showPlayerNames` manquant |
| `401` / `403` / `404` | Comme ci-dessus |

---

## 5. Soumission finale du match

`POST /api/v1/matches/{matchId}/live-stats` accepte un champ racine **optionnel** `liveSessionId` :

```json
{
  "matchId": "1762369200000",
  "teamId": 42,
  "...": "...",
  "liveSessionId": "3f0c6a8e-5b1d-4c47-9a57-0e3c2b7f1d22"
}
```

Si la session appartient à l'utilisateur : `matchId` est enregistré sur la session et elle passe en `ENDED` (comme `:end`).
Si l'ID est inconnu, expiré ou appartient à un autre utilisateur, il est **ignoré** : le match est quand même enregistré (`201`). Sans ce champ, le comportement est inchangé.

---

## 6. Vue publique (overlay)

```
GET /api/v1/public/live/{code}
If-None-Match: "17-LIVE-0-5c1e9a2f"     (optionnel)
```

- **Sans token.**
- Code insensible à la casse (`k7p4qx` = `K7P4QX`).
- À poller toutes les 2 s en renvoyant l'`ETag` reçu dans `If-None-Match`.

**Réponse `200`**

Headers :

```
ETag: "17-LIVE-0-5c1e9a2f"
Cache-Control: no-cache
```

```json
{
  "data": {
    "code": "K7P4QX",
    "title": "Les Lynx vs Grenoble",
    "teamName": "Les Lynx",
    "venue": "home",
    "status": "LIVE",
    "updatedAt": "2026-11-05T19:42:10.000Z",
    "setsWon": { "mine": 1, "opp": 1 },
    "currentSet": {
      "setNumber": 3,
      "score": { "mine": 14, "opp": 12 },
      "serving": "mine",
      "trajectory": [
        { "mine": 0, "opp": 0 },
        { "mine": 1, "opp": 0 },
        { "mine": 1, "opp": 1 }
      ],
      "timeouts": { "mine": 1, "opp": 0 },
      "activeTimeout": "mine"
    },
    "sets": [
      { "setNumber": 1, "score": { "mine": 25, "opp": 21 }, "wonBy": "mine" },
      { "setNumber": 2, "score": { "mine": 23, "opp": 25 }, "wonBy": "opp" },
      { "setNumber": 3, "score": { "mine": 14, "opp": 12 }, "wonBy": null }
    ],
    "lastPoints": [
      {
        "sequence": 26,
        "setNumber": 3,
        "scoredFor": "mine",
        "scoreAfter": { "mine": 14, "opp": 12 },
        "team": "mine",
        "player": { "jersey": 7, "name": null },
        "action": { "key": "attack_pt", "label": "Attaque", "category": "point" }
      },
      {
        "sequence": 25,
        "setNumber": 3,
        "scoredFor": "mine",
        "scoreAfter": { "mine": 13, "opp": 12 },
        "team": "opp",
        "player": { "jersey": 9, "name": null },
        "action": { "key": "serve_fault", "label": "Faute de service", "category": "fault" }
      }
    ],
    "topScorers": [
      { "jersey": 7, "name": null, "points": 9 },
      { "jersey": 4, "name": null, "points": 6 },
      { "jersey": 10, "name": null, "points": 6 }
    ]
  },
  "message": "Live retrieved successfully",
  "status": 200
}
```

**Réponse `304`** (l'`ETag` correspond) : pas de body, headers `ETag` et `Cache-Control: no-cache`. Ce chemin ne lit pas le snapshot : il est très léger.

### Règles de calcul

| Champ | Règle |
|---|---|
| Points | Seuls les events avec `scoredFor != null`. Les events `neutral` sont ignorés partout. Les scores sont **recalculés depuis les events** : un undo fait baisser le score. |
| `setsWon` | Nombre de sets dont `wonBy` est `mine` / `opp` |
| `currentSet` | Set au plus grand `setNumber`. `null` si aucun set |
| `trajectory` | Score cumulé après chaque point, en commençant par `{0,0}` |
| `serving` | `scoredFor` du dernier point du set (le gagnant du rallye sert). `null` si aucun point |
| `currentSet.timeouts` | **Compteur** : nombre de temps morts pris par chaque équipe dans le set en cours (`{ mine, opp }`) |
| `currentSet.activeTimeout` | **Bandeau** : `"mine"` / `"opp"` si le dernier event du set est un temps mort, sinon `null`. Le bandeau disparaît dès que l'app saisit l'event suivant (point, service, etc.). Le nom adverse n'est pas connu du backend : afficher « Adversaire » pour `"opp"` |
| Temps morts | Ignorés dans le score, `trajectory`, `lastPoints` et `topScorers` |
| `sets[].wonBy` | Repris du snapshot |
| `lastPoints` | 5 derniers points tous sets confondus, du plus récent au plus ancien. `team` / `player` = qui a **réalisé l'action** (pour une faute, le fautif) ; `scoredFor` = qui prend le point |
| `topScorers` | 3 joueurs de **mon équipe** avec le plus d'actions `category == "point"` sur le match. Égalité : numéro de maillot croissant |
| `name` | `null` si `showPlayerNames == false`. Toujours `null` pour l'adversaire |
| `status: "ENDED"` | Même structure, avec le dernier snapshot |

Avant le premier snapshot : `setsWon` = `{0,0}`, `currentSet` = `null`, listes vides.

Jamais exposés : `sessionId`, `ownerUserId`, `teamId`, ID internes des joueurs, `matchId`.

### ETag

Format opaque, à renvoyer tel quel. Il change quand la `revision`, le `status` ou `showPlayerNames` changent ; il ne contient pas le `sessionId`.

### CORS

Origines autorisées : `CORS_ALLOWED_ORIGINS`. Méthode `GET`, header de requête `If-None-Match` autorisé, header `ETag` exposé (`Access-Control-Expose-Headers: ETag`), sans credentials.

### Rate limit

120 requêtes / minute / IP (configurable : `LIVE_RATE_LIMIT_PER_MINUTE`). Au-delà :

```
HTTP 429
Retry-After: 37
```

```json
{ "data": null, "message": "Too many requests", "status": 429 }
```

| Code | Cas |
|---|---|
| `200` | Vue à jour |
| `304` | Rien de nouveau depuis l'`ETag` envoyé |
| `404` | Code inconnu **ou** session expirée (même réponse) |
| `429` | Trop de requêtes |

**Réponse `404`**

```json
{ "data": null, "message": "Live not found", "status": 404 }
```

---

## Configuration backend

| Variable | Défaut | Rôle |
|---|---|---|
| `PUBLIC_WEB_URL` | `http://localhost:8081` | Base de `publicUrl` (`<PUBLIC_WEB_URL>/live/<code>`) |
| `LIVE_RATE_LIMIT_PER_MINUTE` | `120` | Rate limit de l'endpoint public, par IP |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:*,http://127.0.0.1:*` | Doit inclure l'origine du front web |

---

## Annexe — Format du `payload`

Utilisé par `PUT /live-sessions/{id}/snapshot` et par la soumission finale `POST /matches/{matchId}/live-stats`.

### Champs racine

| Champ | Type | Description |
|---|---|---|
| `matchId` | `string` | ID unique généré côté app (`String(Date.now())`) |
| `teamId` | `number` | ID de l'équipe qui saisit |
| `teamName` | `string` | Nom de l'équipe |
| `title` | `string` | Nom du match saisi en début de match (ex. `"VSL vs Grenoble"`). Renvoyé tel quel par `GET /teams/{id}/matches` |
| `venue` | `"home"` \| `"away"` | Domicile ou extérieur |
| `recordedAt` | `string` ISO 8601 | Horodatage d'envoi |
| `setsWon` | `{ mine: number, opp: number }` | Sets remportés (sets terminés uniquement) |
| `sets` | `SetPayload[]` | Events regroupés par set, ordonnés par `setNumber` |

### Objet `SetPayload`

| Champ | Type | Description |
|---|---|---|
| `setNumber` | `number` | Numéro du set (1–5) |
| `scoreTeam` | `number` | Points de mon équipe dans ce set (dérivé des events) |
| `scoreOpp` | `number` | Points adversaire dans ce set (dérivé des events) |
| `wonBy` | `"mine"` \| `"opp"` \| `null` | `null` si set en cours ou scores égaux |
| `events` | `EventPayload[]` | Events du set, ordonnés par `sequence` (repart à 1 par set) |

### Objet `EventPayload`

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | ID unique de l'event |
| `sequence` | `number` | Ordre dans le set (commence à 1) |
| `ts` | `number` | Timestamp UNIX ms (horloge locale app) |
| `team` | `"mine"` \| `"opp"` | Équipe qui réalise l'action (pour un temps mort : l'équipe qui l'a demandé) |
| `player` | `PlayerPayload` \| `null` | Joueur. `null` uniquement pour un temps mort (`action.key == "timeout"`) |
| `action` | `ActionPayload` | Action réalisée |
| `trajectory` | `TrajectoryPayload` \| `null` | `null` si action sans zone |
| `scoredFor` | `"mine"` \| `"opp"` \| `null` | Règle : `point` → team, `fault` → adversaire, `neutral` → `null` |

#### `PlayerPayload`

| Champ | Type | Description |
|---|---|---|
| `id` | `number` \| `null` | ID interne (`null` pour adversaire) |
| `jersey` | `number` | Numéro de maillot |
| `name` | `string` | Nom complet ou `"Adv #N"` pour adversaire |
| `position` | `number` \| `null` | Zone terrain 1–6 au moment de l'action |
| `poste` | `"R4"` \| `"Central"` \| `"Passeur"` \| `"Pointu"` \| `"Libero"` \| `null` | Poste du joueur pendant le set. `null` pour l'adversaire. Sert à l'analyse par set et aux stats saison par poste. Valeur hors liste → 400 |

#### `ActionPayload`

| Champ | Type | Valeurs |
|---|---|---|
| `key` | `string` | `attack_pt`, `ace`, `block_pt`, `relance_pt`, `attack_fault`, `serve_fault`, `recv_fault`, `fault`, `good_recv`, `bad_recv`, `block_touch`, `serve_in`, `attack_no_pt`, `timeout` |
| `label` | `string` | Label FR lisible |
| `category` | `"point"` \| `"fault"` \| `"neutral"` | Catégorie |

#### `TrajectoryPayload`

| Champ | Type | Description |
|---|---|---|
| `from` | `number` \| `null` | Zone départ (1–6). `null` pour ace/service (pas de zone départ) |
| `to` | `number` | Zone d'arrivée (1–6) |

### Règles dérivées

- `scoreTeam` / `scoreOpp` : comptés depuis les events (`scoredFor`). Backend peut recalculer.
- `setsWon` : mis à jour uniquement quand "Set suivant" est validé. Le set en cours n'y figure pas encore.
- `wonBy: null` : set encore en cours **ou** scores à égalité.
- `sequence` repart à `1` à chaque nouveau set.
- `trajectory.from: null` pour ace et service réussi (zone départ non saisie).
- `player.id: null` pour tous les events adversaires.
- **Temps mort** : event `action: { key: "timeout", label: "Temps mort", category: "neutral" }`, `team` = équipe qui l'a demandé, `player: null`, `trajectory: null`, `scoredFor: null`. Placé à sa position dans la séquence du set. Ignoré dans le score et les stats d'actions.

---

### Zones terrain (numérotation FIVB)

```
                  ┌─────┬─────┬─────┐
  ADVERSAIRE      │  4  │  3  │  2  │  (avant — proche du filet)
                  ├─────┼─────┼─────┤
                  │  5  │  6  │  1  │  (arrière)
  ════════════════╪═════╪═════╪═════╡  ← FILET
  MON ÉQUIPE      │  4  │  3  │  2  │  (avant — proche du filet)
                  ├─────┼─────┼─────┤
                  │  5  │  6  │  1  │  (arrière)
                  └─────┴─────┴─────┘
```

`trajectory.from` = zone de l'équipe qui frappe · `trajectory.to` = zone adverse où la balle retombe
