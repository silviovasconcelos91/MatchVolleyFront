
# LiveStats — Saisie temps réel des actions (écran de test)

**Date:** 2026-06-05
**Statut:** Design approuvé

## Objectif

Écran permettant de saisir, en temps réel pendant un match, les actions de
chaque joueur des deux équipes (mon équipe + adversaire). Pour les attaques et
services qui retombent dans le camp adverse, on renseigne la zone d'arrivée
(1-6). Priorité absolue : rapidité et simplicité de saisie.

L'écran est volontairement **isolé** du flux de match classique (un bac à test
jetable), accessible via un choix de mode après la sélection de l'équipe.

## Décisions verrouillées

| Sujet | Décision |
|---|---|
| Joueurs adverses | Grille de numéros de maillot #1 à #15 (pas de roster adverse) |
| Trajectoire | Zone d'arrivée seule, 1 tap, uniquement pour les actions qui retombent dans le camp adverse |
| Accès | Bouton de choix de mode après la sélection d'équipe (Match classique / Saisie temps réel) |
| Stockage | Contexte dédié `LiveStatsContext` (useReducer), indépendant de `MatchContext` |

## Modèle de données (`src/data/liveStats.ts` — déjà écrit)

```ts
type LiveTeam = 'mine' | 'opp';
type LiveActionCategory = 'point' | 'fault' | 'neutral';
type LiveActionKey = /* 15 clés */;

type LiveActionDef = {
  key: LiveActionKey;
  label: string;
  category: LiveActionCategory;
  needsZone: boolean;   // true = retombe dans le camp adverse → demande zone 1-6
};

type LiveStatEvent = {
  id: string;
  team: LiveTeam;
  playerId: number;     // id joueur (mine) ou numéro maillot (opp)
  jersey: number;       // numéro affiché
  playerName: string;   // nom (mine) ou "Adv #N" (opp)
  actionKey: LiveActionKey;
  zone: number | null;  // 1-6 ou null
  ts: number;
};
```

### Catalogue des 15 actions

**Points remportés** (`point`)
- Attaque (`attack_pt`) — zone
- Ace (`ace`) — zone
- Contre (`block_pt`)
- Relance (`relance_pt`) — zone

**Fautes** (`fault`, point pour l'autre équipe)
- Attaque out (`attack_out`)
- Attaque filet (`attack_net`)
- Service filet (`serve_net`)
- Service out (`serve_out`)
- Réception zippée (`recv_shank`)
- Mauvaise défense (`bad_defense`)

**Neutres** (`neutral`, sans incidence sur le score)
- Bonne réception (`good_recv`)
- Mauvaise réception (`bad_recv`)
- Contre touché (`block_touch`)
- Service réussi (`serve_in`) — zone
- Attaque sans point (`attack_no_pt`) — zone

Zones en grille volley : avant `4 3 2`, arrière `5 6 1`
(`LIVE_ZONE_DISPLAY_ORDER = [4,3,2,5,6,1]`).

## Architecture

| Unité | Rôle | Statut |
|---|---|---|
| `data/liveStats.ts` | Modèle + catalogue + helpers purs | ✅ écrit |
| `context/LiveStatsContext.tsx` | `useReducer`, state `events[]`, actions `addEvent`/`undo`/`reset` | à faire |
| `screens/MatchModeScreen.tsx` | Choix de mode (2 boutons + retour) | à faire |
| `screens/LiveStatsScreen/` | UI (`index.ts`, `.tsx`, `.styles.ts`) | à faire |
| `App.tsx` | State `matchMode` + fork de rendu + provider | à modifier |

### LiveStatsContext

```ts
type LiveStatsState = { events: LiveStatEvent[] };

actions:
  addEvent(payload: Omit<LiveStatEvent,'id'|'ts'>): void  // append, id+ts générés
  undo(): void                                            // pop dernier
  reset(): void                                           // vide
```

Source unique de vérité. Les totaux par joueur sont **dérivés** dans l'écran
(jamais dupliqués en state parallèle).

### Flux d'accès (App.tsx)

```
Home → MatchSetup → TeamSelection
        → MatchModeScreen            (selectedTeam && !matchMode)
              ├─ "Match classique"   → matchMode='classic' → flux existant inchangé
              └─ "Saisie temps réel" → matchMode='live'    → LiveStatsScreen plein écran
```

- Nouveau state `matchMode: 'classic' | 'live' | null` dans `AppContent`.
- `matchMode === 'live'` : rend `<LiveStatsProvider><LiveStatsScreen team={selectedTeam} onBack=… /></LiveStatsProvider>` en plein écran avec son propre bouton retour. Le flux classique n'est jamais touché.
- Le retour Android et `clearTeam` réinitialisent `matchMode`.

### LiveStatsScreen — props et UX

```ts
type Props = { team: Team; onBack: () => void };
```

Lit la grille de mon équipe depuis `team.players` (id, name, numero, roles).
Aucune dépendance à la validation de roster de `MatchContext`.

Disposition (taps minimaux, sélections collantes) :
```
┌─ Header: titre + ↩ retour
├─ Segmented [ MON ÉQUIPE | ADVERSAIRE ]
├─ Grille joueurs : team.players (numéro+nom, couleur rôle) OU #1-15 adverse
│     tap = sélection collante (reste sélectionné après saisie)
├─ Grille actions, 3 groupes colorés : POINTS(vert) · FAUTES(rouge) · NEUTRE(gris)
│     action sans zone → enregistre direct
│     action avec zone → overlay zone [4][3][2]/[5][6][1] → 1 tap → enregistre
├─ Barre "dernière action saisie" + bouton ↩ Annuler
└─ Liste compacte des derniers events (confiance visuelle)
```

- Pas de score affiché (bac de saisie, pas un vrai match).
- Joueur reste sélectionné après chaque saisie → rafales même joueur faciles.
- Overlay zone annulable.

## Gestion des erreurs / cas limites

- Action tapée sans joueur sélectionné → no-op + hint affiché.
- `undo` retire le dernier event ; no-op si liste vide.
- Overlay zone : bouton annuler ferme sans enregistrer.

## Tests

- Reducer pur → tests unitaires : `addEvent` (append + id/ts), `undo` (pop / vide), `reset`.
- Invariants catalogue : toute `LiveActionKey` résolvable via `LIVE_ACTION_BY_KEY` ; chaque `needsZone:true` est une action attaque/service.

## Hors périmètre (YAGNI)

- Pas de persistance API.
- Pas de score réel ni de logique de set/rotation.
- Pas de noms de joueurs adverses (numéros seuls).
- Pas de zone de départ (arrivée seule).
- Pas d'ajout d'onglet dans la TabBar (la barre 5 onglets reste inchangée).
```

