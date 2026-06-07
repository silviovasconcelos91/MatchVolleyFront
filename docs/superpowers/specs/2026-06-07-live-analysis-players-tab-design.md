# Spec: onglet Joueurs — LiveMatchAnalysisScreen

**Date**: 2026-06-07  
**Feature**: Implémenter l'onglet `players` dans `LiveMatchAnalysisScreen`  
**Fichier cible**: `src/screens/LiveMatchAnalysisScreen.tsx`

---

## Contexte

`LiveMatchAnalysisScreen` contient 4 onglets : Résumé, Par set, Joueurs, Adversaire.  
L'onglet Joueurs affiche actuellement `PlaceholderTab`. Ce spec décrit son implémentation.

---

## Données

Source : `LiveMatchAnalysis.players: PlayerAnalysis[]`

```ts
type PlayerAnalysis = {
  playerId: number;
  jersey: number;
  name: string;
  matchStats: ScopeStats;   // stats globales du match
  setStats: PlayerSetStats[]; // stats par set
};

type ScopeStats = {
  actions: ActionStats;     // { points, faults, neutral: ActionCount[] }
  acesByZone: AceZone[];
  attacks: AttackZone[];
};
```

Dénominateurs :
- **Match** : `data.globalStats.actions.{points|faults}.reduce((a, x) => a + x.count, 0)`
- **Par set** : `data.sets.find(s => s.setNumber === n)?.stats.actions.{points|faults}.reduce((a, x) => a + x.count, 0) ?? 0`

---

## Composant : `PlayersTab`

```ts
type PlayersTabProps = { data: LiveMatchAnalysis };
```

Remplace `<PlaceholderTab />` pour `activeTab === 'players'`.

### State

```ts
const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
```

Un seul joueur ouvert à la fois. Tap sur même joueur = ferme.

### Tri

Joueurs triés par points décroissants, puis par jersey croissant (stable).

```ts
const sorted = [...data.players].sort(
  (a, b) =>
    totalPts(b.matchStats) - totalPts(a.matchStats) ||
    a.jersey - b.jersey
);
```

---

## Structure visuelle

### Panel fermé

```
┌──────────────────────────────────────────────┐
│ [#12] Jean-Marc Dupont                     ▸  │
│                                               │
│  POINTS MARQUÉS               3 / 18          │
│  ████░░░░░░░░░░░░░░░          17%             │
│  [Attaque 2] [Contre 1]                       │
│                                               │
│  FAUTES                        2 / 8          │
│  ████░░░░░░░░░░░░░░░          25%             │
│  [Faute attaque 1] [Faute service 1]          │
│                                               │
│  ACTIONS NEUTRES                              │
│  [Bonne récept. 4] [Service réussi 2]         │
└──────────────────────────────────────────────┘
```

Utilise `StatBar` existant pour points et fautes.  
Section neutres : label + chips (si `neutral.length > 0`).  
Jersey badge `[#N]` en bleu (`COLORS.blue`), même style que `playerNumBadge` dans `LiveStatsSummaryScreen`.

### Panel ouvert → accordion par set

En dessous de la ligne header joueur, afficher `player.setStats` ordonnés par `setNumber` :

```
┌──────────────────────────────────────────────┐
│ [#12] Jean-Marc Dupont                     ▾  │
│──────────────────────────────────────────────│
│  SET 1                                        │
│   POINTS MARQUÉS              2 / 10          │
│   ████░░░░░░░░░░░░             20%            │
│   [Attaque 2]                                 │
│   FAUTES                       1 / 5          │
│   ██░░░░░░░░░░░░░░             20%            │
│   [Faute service 1]                           │
│   ACTIONS NEUTRES                             │
│   [Bonne récept. 2]                           │
│                                               │
│  SET 2                                        │
│   ...                                         │
└──────────────────────────────────────────────┘
```

Chaque set = section séparée avec label `SET N`.  
Dénominateurs issus de `data.sets[n]`.

---

## Réutilisation

| Élément | Source |
|---------|--------|
| `StatBar` | déjà défini dans `LiveMatchAnalysisScreen.tsx` |
| `Chip` | déjà défini dans `LiveMatchAnalysisScreen.tsx` |
| Styles accordéon | `setAccordion`, `setHeader`, `setContent`, `setTitle`, `setChevron` |
| Colors | `COLORS.blue`, `COLORS.greenLight`, `COLORS.redLight`, `COLORS.textSecondary` |

Nouveaux styles à ajouter : `playerHeader` (ligne badge + nom + chevron), `playerBadge`.

---

## État vide

Si `data.players.length === 0` :

```
Aucun joueur enregistré pour ce match.
```

Style : `emptySection` existant.

---

## Implémentation

- Fichier unique : `src/screens/LiveMatchAnalysisScreen.tsx`
- Nouveau composant `PlayersTab` (inline, comme `ResumeTab` et `SetsTab`)
- Remplace `<PlaceholderTab />` ligne ~411
- Aucun nouveau fichier

---

## Hors scope

- Onglet Adversaire (reste `PlaceholderTab`)
- Statistiques de trajectoires d'attaque par joueur (disponibles dans `PlayerAnalysis.matchStats.attacks` mais non demandées ici)
