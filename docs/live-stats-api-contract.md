# Live Stats — Contrat API

Payload envoyée par l'app mobile (React Native / Expo) au backend Kotlin via **"Envoyer et terminer"** en mode saisie temps réel.

---

## Endpoint

```
POST /api/v1/matches/{matchId}/live-stats
Content-Type: application/json
```

---

## Champs racine

| Champ | Type | Description |
|---|---|---|
| `matchId` | `string` | ID unique généré côté app (`String(Date.now())`) |
| `teamId` | `number` | ID de l'équipe qui saisit |
| `teamName` | `string` | Nom de l'équipe |
| `title` | `string` | Nom du match saisi en début de match (ex. "VSL vs Grenoble") |
| `venue` | `"home"` \| `"away"` | Domicile ou extérieur |
| `recordedAt` | `string` ISO 8601 | Horodatage d'envoi |
| `setsWon` | `{ mine: number, opp: number }` | Sets remportés (sets terminés uniquement) |
| `sets` | `SetPayload[]` | Events regroupés par set, ordonnés par `setNumber` |

## Objet `SetPayload`

| Champ | Type | Description |
|---|---|---|
| `setNumber` | `number` | Numéro du set (1–5) |
| `scoreTeam` | `number` | Points de mon équipe dans ce set (dérivé des events) |
| `scoreOpp` | `number` | Points adversaire dans ce set (dérivé des events) |
| `wonBy` | `"mine"` \| `"opp"` \| `null` | `null` si set en cours ou scores égaux |
| `events` | `EventPayload[]` | Events du set, ordonnés par `sequence` (repart à 1 par set) |

## Objet `EventPayload`

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | ID unique de l'event |
| `sequence` | `number` | Ordre dans le set (commence à 1) |
| `ts` | `number` | Timestamp UNIX ms (horloge locale app) |
| `team` | `"mine"` \| `"opp"` | Équipe qui réalise l'action |
| `player` | `PlayerPayload` | Joueur |
| `action` | `ActionPayload` | Action réalisée |
| `trajectory` | `TrajectoryPayload` \| `null` | `null` si action sans zone |
| `scoredFor` | `"mine"` \| `"opp"` \| `null` | Règle : `point` → team, `fault` → adversaire, `neutral` → `null` |

### `PlayerPayload`

| Champ | Type | Description |
|---|---|---|
| `id` | `number` \| `null` | ID interne (`null` pour adversaire) |
| `jersey` | `number` | Numéro de maillot |
| `name` | `string` | Nom complet ou `"Adv #N"` pour adversaire |
| `position` | `number` \| `null` | Zone terrain 1–6 au moment de l'action |
| `poste` | `"R4"` \| `"Central"` \| `"Passeur"` \| `"Pointu"` \| `"Libero"` \| `null` | Poste tactique pendant le set (`null` pour l'adversaire). Valeurs exactes, sinon 400 |

### `ActionPayload`

| Champ | Type | Valeurs |
|---|---|---|
| `key` | `string` | `attack_pt`, `ace`, `block_pt`, `relance_pt`, `attack_fault`, `serve_fault`, `recv_fault`, `fault`, `good_recv`, `bad_recv`, `block_touch`, `serve_in`, `attack_no_pt` |
| `label` | `string` | Label FR lisible |
| `category` | `"point"` \| `"fault"` \| `"neutral"` | Catégorie |

### `TrajectoryPayload`

| Champ | Type | Description |
|---|---|---|
| `from` | `number` \| `null` | Zone départ (1–6). `null` pour ace/service (pas de zone départ) |
| `to` | `number` | Zone d'arrivée (1–6) |

---

## Exemple complet — 2 sets terminés + 1 en cours

```json
{
  "matchId": "1749131000000",
  "teamId": 42,
  "teamName": "Les Lynx",
  "title": "Les Lynx vs Grenoble",
  "venue": "home",
  "recordedAt": "2026-06-06T14:45:00.000Z",
  "setsWon": { "mine": 1, "opp": 1 },
  "sets": [

    {
      "setNumber": 1,
      "scoreTeam": 3,
      "scoreOpp": 2,
      "wonBy": "mine",
      "events": [
        {
          "id": "evt_1749131100000_1",
          "sequence": 1,
          "ts": 1749131100000,
          "team": "mine",
          "player": { "id": 3, "jersey": 7, "name": "Dupont", "position": 4, "poste": "R4" },
          "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
          "trajectory": { "from": 4, "to": 1 },
          "scoredFor": "mine"
        },
        {
          "id": "evt_1749131108000_2",
          "sequence": 2,
          "ts": 1749131108000,
          "team": "mine",
          "player": { "id": 5, "jersey": 12, "name": "Martin", "position": 1, "poste": "Passeur" },
          "action": { "key": "ace", "label": "Ace", "category": "point" },
          "trajectory": { "from": null, "to": 5 },
          "scoredFor": "mine"
        },
        {
          "id": "evt_1749131115000_3",
          "sequence": 3,
          "ts": 1749131115000,
          "team": "opp",
          "player": { "id": null, "jersey": 9, "name": "Adv #9", "position": 1, "poste": null },
          "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
          "trajectory": { "from": 2, "to": 6 },
          "scoredFor": "opp"
        },
        {
          "id": "evt_1749131122000_4",
          "sequence": 4,
          "ts": 1749131122000,
          "team": "mine",
          "player": { "id": 8, "jersey": 4, "name": "Bernard", "position": 3, "poste": "Central" },
          "action": { "key": "block_pt", "label": "Contre", "category": "point" },
          "trajectory": null,
          "scoredFor": "mine"
        },
        {
          "id": "evt_1749131130000_5",
          "sequence": 5,
          "ts": 1749131130000,
          "team": "opp",
          "player": { "id": null, "jersey": 5, "name": "Adv #5", "position": 4, "poste": null },
          "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
          "trajectory": { "from": 4, "to": 1 },
          "scoredFor": "opp"
        }
      ]
    },

    {
      "setNumber": 2,
      "scoreTeam": 2,
      "scoreOpp": 3,
      "wonBy": "opp",
      "events": [
        {
          "id": "evt_1749131200000_6",
          "sequence": 1,
          "ts": 1749131200000,
          "team": "mine",
          "player": { "id": 5, "jersey": 12, "name": "Martin", "position": 1, "poste": "Passeur" },
          "action": { "key": "serve_fault", "label": "Faute service", "category": "fault" },
          "trajectory": null,
          "scoredFor": "opp"
        },
        {
          "id": "evt_1749131208000_7",
          "sequence": 2,
          "ts": 1749131208000,
          "team": "mine",
          "player": { "id": 3, "jersey": 7, "name": "Dupont", "position": 4, "poste": "R4" },
          "action": { "key": "attack_no_pt", "label": "Attaque (sans pt)", "category": "neutral" },
          "trajectory": { "from": 4, "to": 3 },
          "scoredFor": null
        },
        {
          "id": "evt_1749131215000_8",
          "sequence": 3,
          "ts": 1749131215000,
          "team": "opp",
          "player": { "id": null, "jersey": 3, "name": "Adv #3", "position": 3, "poste": null },
          "action": { "key": "fault", "label": "Faute", "category": "fault" },
          "trajectory": null,
          "scoredFor": "mine"
        },
        {
          "id": "evt_1749131222000_9",
          "sequence": 4,
          "ts": 1749131222000,
          "team": "mine",
          "player": { "id": 2, "jersey": 2, "name": "Petit", "position": 5, "poste": "Libero" },
          "action": { "key": "recv_fault", "label": "Réception", "category": "fault" },
          "trajectory": null,
          "scoredFor": "opp"
        },
        {
          "id": "evt_1749131230000_10",
          "sequence": 5,
          "ts": 1749131230000,
          "team": "opp",
          "player": { "id": null, "jersey": 7, "name": "Adv #7", "position": 2, "poste": null },
          "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
          "trajectory": { "from": 2, "to": 6 },
          "scoredFor": "opp"
        }
      ]
    },

    {
      "setNumber": 3,
      "scoreTeam": 1,
      "scoreOpp": 0,
      "wonBy": null,
      "events": [
        {
          "id": "evt_1749131300000_11",
          "sequence": 1,
          "ts": 1749131300000,
          "team": "mine",
          "player": { "id": 11, "jersey": 9, "name": "Leclerc", "position": 1, "poste": "Pointu" },
          "action": { "key": "serve_in", "label": "Service réussi", "category": "neutral" },
          "trajectory": { "from": null, "to": 2 },
          "scoredFor": null
        },
        {
          "id": "evt_1749131307000_12",
          "sequence": 2,
          "ts": 1749131307000,
          "team": "mine",
          "player": { "id": 3, "jersey": 7, "name": "Dupont", "position": 4, "poste": "R4" },
          "action": { "key": "attack_pt", "label": "Attaque", "category": "point" },
          "trajectory": { "from": 4, "to": 5 },
          "scoredFor": "mine"
        }
      ]
    }

  ]
}
```

---

## Règles dérivées

- `scoreTeam` / `scoreOpp` : comptés depuis les events (`scoredFor`). Backend peut recalculer.
- `setsWon` : mis à jour uniquement quand "Set suivant" est validé. Le set en cours n'y figure pas encore.
- `wonBy: null` : set encore en cours **ou** scores à égalité.
- `sequence` repart à `1` à chaque nouveau set.
- `trajectory.from: null` pour ace et service réussi (zone départ non saisie).
- `player.id: null` pour tous les events adversaires.

---

## Zones terrain (numérotation FIVB)

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
