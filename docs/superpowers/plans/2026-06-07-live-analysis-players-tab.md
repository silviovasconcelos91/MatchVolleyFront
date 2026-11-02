# Joueurs Tab — LiveMatchAnalysisScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le composant `PlayersTab` dans `LiveMatchAnalysisScreen.tsx` pour remplacer `PlaceholderTab` à l'onglet Joueurs.

**Architecture:** Nouveau composant `PlayersTab` inline dans `LiveMatchAnalysisScreen.tsx`, suivant le même pattern que `ResumeTab` et `SetsTab` existants. Chaque joueur s'affiche dans un accordéon : les stats globales du match sont toujours visibles, et le détail par set apparaît quand on tape le joueur.

**Tech Stack:** React Native, TypeScript strict, StyleSheet, hooks (`useState`, `useMemo`), types `LiveMatchAnalysis` / `PlayerAnalysis` depuis `../data/liveStatsAnalysis`.

---

## Fichiers touchés

- **Modifier** : `src/screens/LiveMatchAnalysisScreen.tsx`
  - Ajouter composant `PlayersTab`
  - Ajouter styles `playerAccordionHeader`, `playerBadge`, `playerBadgeText`, `playerNameText`, `setExpandedSection`, `setLabel`
  - Remplacer `<PlaceholderTab />` par `<PlayersTab data={data} />` ligne ~411

---

## Task 1 : Ajouter le composant `PlayersTab`

**Files:**
- Modify: `src/screens/LiveMatchAnalysisScreen.tsx`

- [ ] **Étape 1 : Vérifier le TypeScript avant modification**

```bash
npx tsc --noEmit
```
Attendu : 0 erreur (état de départ clean).

- [ ] **Étape 2 : Ajouter `PlayersTab` juste avant `LiveMatchAnalysisScreen`**

Insérer le composant suivant dans `src/screens/LiveMatchAnalysisScreen.tsx`, juste avant la ligne `const LiveMatchAnalysisScreen = ...` (ligne ~336) :

```tsx
type PlayersTabProps = { data: LiveMatchAnalysis };

const PlayersTab = ({ data }: PlayersTabProps) => {
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);

  const totalMatchPts = data.globalStats.actions.points.reduce(
    (a, x) => a + x.count, 0,
  );
  const totalMatchFaults = data.globalStats.actions.faults.reduce(
    (a, x) => a + x.count, 0,
  );

  const sorted = useMemo(
    () =>
      [...data.players].sort(
        (a, b) =>
          b.matchStats.actions.points.reduce((s, x) => s + x.count, 0) -
          a.matchStats.actions.points.reduce((s, x) => s + x.count, 0) ||
          a.jersey - b.jersey,
      ),
    [data.players],
  );

  if (sorted.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Aucun joueur enregistré pour ce match.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
      {sorted.map(player => {
        const expanded = expandedPlayer === player.playerId;
        const playerPts = player.matchStats.actions.points.reduce(
          (a, x) => a + x.count, 0,
        );
        const playerFaults = player.matchStats.actions.faults.reduce(
          (a, x) => a + x.count, 0,
        );

        return (
          <View key={player.playerId} style={styles.setAccordion}>
            {/* Header : badge + nom + chevron */}
            <TouchableOpacity
              style={styles.playerAccordionHeader}
              onPress={() =>
                setExpandedPlayer(expanded ? null : player.playerId)
              }
              activeOpacity={0.7}
            >
              <View style={styles.playerBadge}>
                <Text style={styles.playerBadgeText}>#{player.jersey}</Text>
              </View>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.setChevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Stats globales match — toujours visibles */}
            <View style={styles.setContent}>
              <StatBar
                sectionLabel="POINTS MARQUÉS"
                value={playerPts}
                total={totalMatchPts}
                color={COLORS.greenLight}
                items={player.matchStats.actions.points}
              />
              <View style={styles.sectionDivider} />
              <StatBar
                sectionLabel="FAUTES"
                value={playerFaults}
                total={totalMatchFaults}
                color={COLORS.redLight}
                items={player.matchStats.actions.faults}
              />
              {player.matchStats.actions.neutral.length > 0 && (
                <>
                  <View style={styles.sectionDivider} />
                  <View style={styles.statSection}>
                    <Text style={styles.statSectionLabel}>ACTIONS NEUTRES</Text>
                    <View style={[styles.chipsRow, { marginTop: SPACING.sm }]}>
                      {player.matchStats.actions.neutral.map(a => (
                        <Chip
                          key={a.key}
                          label={a.label}
                          count={a.count}
                          color={COLORS.textSecondary}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Détail par set — visible uniquement quand expanded */}
            {expanded &&
              player.setStats.map(ss => {
                const setData = data.sets.find(
                  s => s.setNumber === ss.setNumber,
                );
                const setTotalPts =
                  setData?.stats.actions.points.reduce(
                    (a, x) => a + x.count, 0,
                  ) ?? 0;
                const setTotalFaults =
                  setData?.stats.actions.faults.reduce(
                    (a, x) => a + x.count, 0,
                  ) ?? 0;
                const setPts = ss.stats.actions.points.reduce(
                  (a, x) => a + x.count, 0,
                );
                const setFaults = ss.stats.actions.faults.reduce(
                  (a, x) => a + x.count, 0,
                );

                return (
                  <View key={ss.setNumber} style={styles.setExpandedSection}>
                    <Text style={styles.setLabel}>SET {ss.setNumber}</Text>
                    <StatBar
                      sectionLabel="POINTS MARQUÉS"
                      value={setPts}
                      total={setTotalPts}
                      color={COLORS.greenLight}
                      items={ss.stats.actions.points}
                    />
                    <View style={styles.sectionDivider} />
                    <StatBar
                      sectionLabel="FAUTES"
                      value={setFaults}
                      total={setTotalFaults}
                      color={COLORS.redLight}
                      items={ss.stats.actions.faults}
                    />
                    {ss.stats.actions.neutral.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            ACTIONS NEUTRES
                          </Text>
                          <View
                            style={[
                              styles.chipsRow,
                              { marginTop: SPACING.sm },
                            ]}
                          >
                            {ss.stats.actions.neutral.map(a => (
                              <Chip
                                key={a.key}
                                label={a.label}
                                count={a.count}
                                color={COLORS.textSecondary}
                              />
                            ))}
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
          </View>
        );
      })}
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};
```

- [ ] **Étape 3 : Remplacer `<PlaceholderTab />` par `<PlayersTab data={data} />`**

Dans `LiveMatchAnalysisScreen.tsx`, chercher :

```tsx
{activeTab === 'players' && <PlaceholderTab />}
```

Remplacer par :

```tsx
{activeTab === 'players' && <PlayersTab data={data} />}
```

- [ ] **Étape 4 : Ajouter les nouveaux styles**

Dans le `StyleSheet.create({...})` à la fin du fichier, ajouter après le style `setContent` existant :

```ts
  playerAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  playerBadge: {
    borderWidth: 1,
    borderColor: `${COLORS.blue}55`,
    backgroundColor: `${COLORS.blue}18`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 44,
    alignItems: 'center',
  },
  playerBadgeText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.blue,
  },
  playerNameText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  setExpandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  setLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
```

- [ ] **Étape 5 : Vérifier le TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Étape 6 : Commit**

```bash
git add src/screens/LiveMatchAnalysisScreen.tsx
git commit -m "feat(live-analysis): implement Joueurs tab with per-player stats and per-set accordion"
```

---

## Task 2 : Vérification visuelle

- [ ] **Étape 1 : Démarrer le serveur de développement**

```bash
npx expo start --clear
```

- [ ] **Étape 2 : Naviguer vers l'onglet Joueurs**

Chemin : Statistiques → Équipe → Stats live → Choix équipe → onglet `Joueurs`

- [ ] **Étape 3 : Vérifier l'état fermé**

- Chaque joueur affiche un badge `#N` bleu, son nom, un chevron ▼
- Dessous : `StatBar` POINTS MARQUÉS avec barre de progression + chips d'actions
- Dessous : `StatBar` FAUTES
- Dessous (si applicable) : section ACTIONS NEUTRES avec chips
- Tri par points décroissants

- [ ] **Étape 4 : Vérifier l'expansion**

- Taper un joueur → chevron passe à ▲
- Apparition des sections `SET N` avec les mêmes `StatBar` pour chaque set joué
- Taper à nouveau → fermeture

- [ ] **Étape 5 : Vérifier l'état vide**

Si aucun joueur (match sans données) → message "Aucun joueur enregistré pour ce match."

- [ ] **Étape 6 : Vérifier que les autres onglets ne sont pas cassés**

Naviguer vers Résumé, Par set, Adversaire — aucune régression.
