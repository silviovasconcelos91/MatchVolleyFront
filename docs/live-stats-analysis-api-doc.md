# Live Stats Analysis — API Frontend

Ce document décrit l'endpoint à consommer pour l'écran de stats d'un match enregistré en temps réel.

---

## Authentification

```
Authorization: Bearer <access_token>
```

---

## Endpoint

```
GET /api/v1/matches/{matchId}/live-stats/analysis
Authorization: Bearer <token>
```

| Code | Cas |
|------|-----|
| `200` | Succès |
| `401` | Token absent ou invalide |
| `404` | Match introuvable |

---

## Structure de la réponse

```json
{
  "data": {
    "matchId": "string",
    "globalStats": { ... },      // stats équipe sur tout le match
    "sets": [ ... ],             // stats + timeline par set
    "players": [ ... ]           // stats par joueur (match + par set)
  },
  "message": "Live stats analysis retrieved successfully",
  "status": 200
}
```

---

## Bloc `Stats` — structure commune à tous les scopes

Chaque scope (match global, set, joueur/match, joueur/set) retourne le même bloc :

```json
{
  "actions": {
    "points": [
      { "key": "attack_pt",  "label": "Attaque",  "count": 5 },
      { "key": "ace",        "label": "Ace",       "count": 2 },
      { "key": "block_pt",   "label": "Contre",    "count": 1 },
      { "key": "relance_pt", "label": "Relance",   "count": 0 }
    ],
    "faults": [
      { "key": "attack_fault", "label": "Faute attaque",  "count": 2 },
      { "key": "serve_fault",  "label": "Faute service",  "count": 1 },
      { "key": "recv_fault",   "label": "Réception",      "count": 1 },
      { "key": "fault",        "label": "Faute",          "count": 0 }
    ],
    "neutral": [
      { "key": "good_recv",    "label": "Bonne réception",  "count": 8 },
      { "key": "bad_recv",     "label": "Mauvaise récept.", "count": 2 },
      { "key": "block_touch",  "label": "Contre touché",    "count": 1 },
      { "key": "serve_in",     "label": "Service réussi",   "count": 5 },
      { "key": "attack_no_pt", "label": "Attaque (sans pt)","count": 3 }
    ]
  },
  "acesByZone": [
    { "zone": 2, "count": 1 },
    { "zone": 5, "count": 2 }
  ],
  "attacks": [
    { "playerPosition": 4, "from": 4, "to": 1, "result": "attack_pt",    "count": 3 },
    { "playerPosition": 4, "from": 4, "to": 6, "result": "attack_no_pt", "count": 2 },
    { "playerPosition": 2, "from": 2, "to": 3, "result": "attack_pt",    "count": 1 },
    { "playerPosition": 4, "from": null, "to": null, "result": "attack_fault", "count": 1 }
  ]
}
```

### `actions`

| Champ | Description |
|---|---|
| `points` | Actions qui ont rapporté un point à l'équipe |
| `faults` | Fautes commises par l'équipe (point pour l'adversaire) |
| `neutral` | Actions sans incidence sur le score |

Seules les actions effectivement présentes dans les events apparaissent dans les listes (pas d'entrées à count=0 si action absente).

### `acesByZone`

Nombre d'aces par zone d'arrivée de la balle (zones 1–6 FIVB). Trié par numéro de zone. Zone absente = 0 ace dans cette zone.

### `attacks`

Chaque combinaison unique de `(playerPosition, from, to, result)` devient une entrée :

| Champ | Type | Description |
|---|---|---|
| `playerPosition` | `number \| null` | Zone terrain du joueur au moment de l'attaque (1–6) |
| `from` | `number \| null` | Zone de départ de la balle. `null` pour les fautes d'attaque |
| `to` | `number \| null` | Zone d'arrivée de la balle. `null` pour les fautes d'attaque |
| `result` | `string` | `"attack_pt"` / `"attack_no_pt"` / `"attack_fault"` |
| `count` | `number` | Nombre de fois que cette combinaison s'est produite |

---

## Scopes

### `globalStats` — match entier

```json
"globalStats": {
  "actions": { ... },
  "acesByZone": [ ... ],
  "attacks": [ ... ]
}
```

---

### `sets` — par set

```json
"sets": [
  {
    "setNumber": 1,
    "myScore": 25,
    "oppScore": 21,
    "wonBy": "mine",
    "stats": {
      "actions": { ... },
      "acesByZone": [ ... ],
      "attacks": [ ... ]
    },
    "timeline": [
      { "myScore": 1,  "oppScore": 0, "playerId": 3,    "action": "attack_pt", "occurredAt": "2026-06-05T14:45:01.000Z" },
      { "myScore": 1,  "oppScore": 1, "playerId": null,  "action": "attack_pt", "occurredAt": "2026-06-05T14:45:09.000Z" },
      { "myScore": 2,  "oppScore": 1, "playerId": 5,    "action": "ace",       "occurredAt": "2026-06-05T14:45:16.000Z" }
    ]
  }
]
```

#### `timeline` — pour le graphe de progression

| Champ | Type | Description |
|---|---|---|
| `myScore` | `number` | Score cumulé équipe **après** ce point |
| `oppScore` | `number` | Score cumulé adversaire **après** ce point |
| `playerId` | `number \| null` | ID joueur si `team == "mine"`, sinon `null` |
| `action` | `string` | Clé de l'action |
| `occurredAt` | `string` ISO 8601 | Timestamp |

> Tracer `myScore` et `oppScore` en fonction de l'index pour la courbe de progression.

---

### `players` — par joueur

```json
"players": [
  {
    "playerId": 3,
    "jersey": 7,
    "name": "Dupont",
    "matchStats": {
      "actions": { ... },
      "acesByZone": [ ... ],
      "attacks": [ ... ]
    },
    "setStats": [
      {
        "setNumber": 1,
        "stats": {
          "actions": { ... },
          "acesByZone": [ ... ],
          "attacks": [ ... ]
        }
      },
      {
        "setNumber": 2,
        "stats": { ... }
      }
    ]
  }
]
```

- `matchStats` = stats du joueur agrégées sur tout le match
- `setStats` = breakdown par set (uniquement les sets où le joueur a agi)
- Seuls les joueurs `team == "mine"` apparaissent

---

## Exemple complet

```json
{
  "data": {
    "matchId": "match-20260605-001",
    "globalStats": {
      "actions": {
        "points": [
          { "key": "attack_pt", "label": "Attaque", "count": 2 },
          { "key": "ace",       "label": "Ace",      "count": 1 },
          { "key": "block_pt",  "label": "Contre",   "count": 1 }
        ],
        "faults": [
          { "key": "attack_fault", "label": "Faute attaque", "count": 1 }
        ],
        "neutral": [
          { "key": "good_recv", "label": "Bonne réception", "count": 1 }
        ]
      },
      "acesByZone": [
        { "zone": 5, "count": 1 }
      ],
      "attacks": [
        { "playerPosition": 4, "from": 4, "to": 1, "result": "attack_pt",    "count": 2 },
        { "playerPosition": 4, "from": null, "to": null, "result": "attack_fault", "count": 1 }
      ]
    },
    "sets": [
      {
        "setNumber": 1,
        "myScore": 4,
        "oppScore": 2,
        "wonBy": "mine",
        "stats": {
          "actions": {
            "points": [
              { "key": "attack_pt",  "label": "Attaque", "count": 1 },
              { "key": "ace",        "label": "Ace",      "count": 1 },
              { "key": "block_pt",   "label": "Contre",   "count": 1 },
              { "key": "relance_pt", "label": "Relance",  "count": 1 }
            ],
            "faults": [],
            "neutral": []
          },
          "acesByZone": [{ "zone": 5, "count": 1 }],
          "attacks": [
            { "playerPosition": 4, "from": 4, "to": 1, "result": "attack_pt", "count": 1 }
          ]
        },
        "timeline": [
          { "myScore": 1, "oppScore": 0, "playerId": 3,    "action": "attack_pt",  "occurredAt": "2026-06-05T14:45:01.000Z" },
          { "myScore": 2, "oppScore": 0, "playerId": 5,    "action": "ace",        "occurredAt": "2026-06-05T14:45:08.000Z" },
          { "myScore": 3, "oppScore": 0, "playerId": 8,    "action": "block_pt",   "occurredAt": "2026-06-05T14:45:15.000Z" },
          { "myScore": 4, "oppScore": 0, "playerId": 3,    "action": "relance_pt", "occurredAt": "2026-06-05T14:45:22.000Z" },
          { "myScore": 4, "oppScore": 1, "playerId": null, "action": "attack_pt",  "occurredAt": "2026-06-05T14:45:30.000Z" },
          { "myScore": 4, "oppScore": 2, "playerId": null, "action": "attack_pt",  "occurredAt": "2026-06-05T14:45:38.000Z" }
        ]
      }
    ],
    "players": [
      {
        "playerId": 3,
        "jersey": 7,
        "name": "Dupont",
        "matchStats": {
          "actions": {
            "points": [
              { "key": "attack_pt",  "label": "Attaque", "count": 2 },
              { "key": "relance_pt", "label": "Relance",  "count": 1 }
            ],
            "faults": [
              { "key": "attack_fault", "label": "Faute attaque", "count": 1 }
            ],
            "neutral": []
          },
          "acesByZone": [],
          "attacks": [
            { "playerPosition": 4, "from": 4, "to": 1,    "result": "attack_pt",    "count": 2 },
            { "playerPosition": 4, "from": null, "to": null, "result": "attack_fault", "count": 1 }
          ]
        },
        "setStats": [
          {
            "setNumber": 1,
            "stats": {
              "actions": {
                "points": [
                  { "key": "attack_pt",  "label": "Attaque", "count": 1 },
                  { "key": "relance_pt", "label": "Relance",  "count": 1 }
                ],
                "faults": [],
                "neutral": []
              },
              "acesByZone": [],
              "attacks": [
                { "playerPosition": 4, "from": 4, "to": 1, "result": "attack_pt", "count": 1 }
              ]
            }
          }
        ]
      },
      {
        "playerId": 5,
        "jersey": 12,
        "name": "Martin",
        "matchStats": {
          "actions": {
            "points": [{ "key": "ace", "label": "Ace", "count": 1 }],
            "faults": [],
            "neutral": []
          },
          "acesByZone": [{ "zone": 5, "count": 1 }],
          "attacks": []
        },
        "setStats": [
          {
            "setNumber": 1,
            "stats": {
              "actions": {
                "points": [{ "key": "ace", "label": "Ace", "count": 1 }],
                "faults": [],
                "neutral": []
              },
              "acesByZone": [{ "zone": 5, "count": 1 }],
              "attacks": []
            }
          }
        ]
      }
    ]
  },
  "message": "Live stats analysis retrieved successfully",
  "status": 200
}
```

---

## Types TypeScript

```typescript
interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

interface ActionCount {
  key: string;
  label: string;
  count: number;
}

interface ActionStats {
  points: ActionCount[];
  faults: ActionCount[];
  neutral: ActionCount[];
}

interface AceZone {
  zone: number;   // 1–6
  count: number;
}

interface AttackZone {
  playerPosition: number | null;   // zone terrain 1–6
  from: number | null;             // zone départ balle
  to: number | null;               // zone arrivée balle
  result: 'attack_pt' | 'attack_no_pt' | 'attack_fault';
  count: number;
}

interface ScopeStats {
  actions: ActionStats;
  acesByZone: AceZone[];
  attacks: AttackZone[];
}

interface TimelineEntry {
  myScore: number;
  oppScore: number;
  playerId: number | null;
  action: string;
  occurredAt: string;  // ISO 8601
}

interface SetAnalysis {
  setNumber: number;
  myScore: number;
  oppScore: number;
  wonBy: 'mine' | 'opp' | null;
  stats: ScopeStats;
  timeline: TimelineEntry[];
}

interface PlayerSetStats {
  setNumber: number;
  stats: ScopeStats;
}

interface PlayerAnalysis {
  playerId: number;
  jersey: number;
  name: string;
  matchStats: ScopeStats;
  setStats: PlayerSetStats[];
}

interface LiveMatchAnalysis {
  matchId: string;
  globalStats: ScopeStats;
  sets: SetAnalysis[];
  players: PlayerAnalysis[];
}
```

---

## Notes frontend

- **Graphe progression set** : `sets[n].timeline` — tracer `myScore` / `oppScore` par index
- **`playerId: null` dans timeline** = point adverse (faute ou attaque adverse)
- **Actions manquantes** : si un type d'action n'a pas été réalisé, il n'apparaît pas dans la liste (pas d'entrée count=0)
- **`attacks`** : regroupées par combinaison unique `(playerPosition, from, to, result)`. Utiliser pour une heatmap de trajectoires ou un tableau position × zone
- **`acesByZone`** : utiliser pour un diagramme circulaire ou une visualisation par zone terrain
- **`setStats` joueur** : uniquement les sets où le joueur a participé à au moins une action
