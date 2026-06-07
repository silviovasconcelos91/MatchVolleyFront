# Spec: Trajectoires d'attaque + zones aces — onglet Joueurs

**Date**: 2026-06-07  
**Feature**: Ajouter trajectoires d'attaque et zones aces dans le détail par set du PlayersTab  
**Fichier cible**: `src/screens/LiveMatchAnalysisScreen.tsx`

---

## Contexte

Le `PlayersTab` affiche un accordéon par joueur. Quand un joueur est déployé, chaque `SET N` montre ses stats (points/fautes/neutres). Cette feature ajoute deux nouvelles sections dans chaque `SET N` :

1. **Trajectoires d'attaque** — format texte groupé par position du joueur
2. **Aces par zone** — barre de distribution relative

---

## Données source

Disponibles dans `PlayerSetStats.stats: ScopeStats` :

```ts
type ScopeStats = {
  actions: ActionStats;
  acesByZone: AceZone[];  // { zone: number, count: number }
  attacks: AttackZone[];  // { playerPosition, from, to, result, count }
};

type AttackZone = {
  playerPosition: number | null;
  from: number | null;
  to: number | null;
  result: 'attack_pt' | 'attack_no_pt' | 'attack_fault';
  count: number;
};

type AceZone = {
  zone: number;
  count: number;
};
```

**Contrainte aces** : `AceZone.count` = nombre d'aces seulement, pas total de services par zone. Impossible de calculer le taux de réussite par zone. Les barres montrent la **distribution relative** des aces (% des aces de ce set qui ont atterri dans cette zone).

---

## Placement dans le layout

Dans la section `SET N` du détail déployé, **après** les sections POINTS / FAUTES / NEUTRES déjà existantes :

```
SET N
  POINTS MARQUÉS       (existant)
  FAUTES               (existant)
  ACTIONS NEUTRES      (existant)
  ─────────────────
  TRAJECTOIRES D'ATTAQUE  ← nouveau (si attacks avec zones disponibles)
  ACES PAR ZONE           ← nouveau (si acesByZone non vide)
```

---

## Section 1 : Trajectoires d'attaque

### Rendu

```
TRAJECTOIRES D'ATTAQUE
P4 : Z4→Z6 (3)  Z4→Z5 (1)
P2 : Z4→Z6 (2)  Z2→Z6 (1)
```

### Logique

Filtrer `ss.stats.attacks` pour ne garder que les entrées où `from !== null` et `to !== null`.

Regrouper par `playerPosition` :
- Clé : `playerPosition` (null → ignorer ces entrées)
- Par position : agréger les `AttackZone` ayant le même `from→to`, sommer les `count`
- Tri positions : croissant
- Tri trajectoires par position : par count total décroissant

Affichage par position :
```
P{pos} : Z{from}→Z{to} ({count})  Z{from}→Z{to} ({count})
```

Afficher la section seulement si au moins une entrée valide (from et to non null).

Si aucune entrée valide : ne pas afficher la section.

---

## Section 2 : Aces par zone

### Rendu

```
ACES PAR ZONE
Zone 5  ████░░  60%  (3 aces)
Zone 1  ████░░  40%  (2 aces)
```

### Logique

Source : `ss.stats.acesByZone`, tri par count décroissant.

Total = somme de tous les `count` dans `acesByZone` pour ce set.

Chaque barre :
- `value` = zone.count
- `total` = somme totale aces du set
- `pct` = `Math.round((value / total) * 100)`
- Largeur barre = `${pct}%`
- Couleur = `COLORS.yellow`

Afficher la section seulement si `acesByZone.length > 0`.

---

## Réutilisation

Styles existants réutilisables : `trajRow`, `bar`, `barFill`, `trajRowLabel`, `trajRowVal`, `playerDetailLabel` (ou `setLabel`).

Nouveaux styles : `attackTrajectoryRow` (ligne position + trajectoires inline).

---

## Implémentation

- **Fichier unique** : `src/screens/LiveMatchAnalysisScreen.tsx`
- Modifications dans la boucle `player.setStats.map(ss => ...)` du `PlayersTab`
- Ajouter logique de groupement des attacks inline (pas de helper séparé — YAGNI)
- Ajouter style `attackTrajectoryRow`

---

## Hors scope

- Taux de réussite ace par zone (nécessiterait backend modifié)
- Trajectoires d'attaque au niveau match global (seulement par set)
- Statistiques de service hors aces
