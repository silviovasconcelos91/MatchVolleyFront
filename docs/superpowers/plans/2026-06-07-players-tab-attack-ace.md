# Attack Trajectories + Ace Zones — PlayersTab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter trajectoires d'attaque (texte groupé par position) et zones aces (barre de distribution) dans le détail par set de chaque joueur dans `PlayersTab`.

**Architecture:** Modification uniquement dans la boucle `player.setStats.map(ss => {...})` du `PlayersTab` dans `LiveMatchAnalysisScreen.tsx`. Ajout de logique de groupement inline avant le `return`, puis deux nouvelles sections JSX après ACTIONS NEUTRES. Deux nouveaux styles ajoutés.

**Tech Stack:** React Native, TypeScript strict, StyleSheet, types `AceZone` depuis `../data/liveStatsAnalysis`. Pas de nouvel import nécessaire — le narrowing TypeScript par control flow suffit pour les `AttackZone`.

---

## Fichiers touchés

- **Modifier** : `src/screens/LiveMatchAnalysisScreen.tsx`
  - Modifier la boucle `player.setStats.map(ss => {...})` (lignes ~437–502) : ajout de calculs + deux sections JSX
  - Ajouter styles `attackTrajectoryRow`, `attackPosLabel`, `attackTrajList` dans `StyleSheet.create`

---

## Task 1 : Modifier la boucle per-set dans `PlayersTab`

**Files:**
- Modify: `src/screens/LiveMatchAnalysisScreen.tsx`

- [ ] **Étape 1 : Vérifier TypeScript avant modification**

```bash
npx tsc --noEmit
```
Attendu : 0 erreur.

- [ ] **Étape 2 : Remplacer le bloc per-set dans `PlayersTab`**

Chercher le bloc suivant dans `src/screens/LiveMatchAnalysisScreen.tsx` (lignes ~437–502) :

```tsx
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
```

Remplacer par :

```tsx
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

                // ── Trajectoires d'attaque ──────────────────────────────
                // Grouper par position joueur → (from→to) → count total.
                // Ignorer les AttackZone sans zone (from/to/playerPosition null).
                const posMap = new Map<
                  number,
                  Map<string, { from: number; to: number; count: number }>
                >();
                for (const a of ss.stats.attacks) {
                  if (a.playerPosition === null || a.from === null || a.to === null) continue;
                  let trajMap = posMap.get(a.playerPosition);
                  if (!trajMap) {
                    trajMap = new Map();
                    posMap.set(a.playerPosition, trajMap);
                  }
                  const key = `${a.from}-${a.to}`;
                  const existing = trajMap.get(key);
                  if (existing) {
                    existing.count += a.count;
                  } else {
                    trajMap.set(key, { from: a.from, to: a.to, count: a.count });
                  }
                }
                const attackGroups = [...posMap.entries()]
                  .sort(([a], [b]) => a - b)
                  .map(([pos, trajMap]) => ({
                    pos,
                    trajs: [...trajMap.values()].sort((a, b) => b.count - a.count),
                  }));

                // ── Aces par zone ───────────────────────────────────────
                const totalSetAces = ss.stats.acesByZone.reduce(
                  (a, z) => a + z.count, 0,
                );
                const sortedAces = [...ss.stats.acesByZone].sort(
                  (a, b) => b.count - a.count,
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

                    {/* ── Trajectoires d'attaque ── */}
                    {attackGroups.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            TRAJECTOIRES D'ATTAQUE
                          </Text>
                          {attackGroups.map(({ pos, trajs }) => (
                            <View key={pos} style={styles.attackTrajectoryRow}>
                              <Text style={styles.attackPosLabel}>P{pos} :</Text>
                              <Text style={styles.attackTrajList}>
                                {trajs
                                  .map(t => `Z${t.from}→Z${t.to} (${t.count})`)
                                  .join('  ')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* ── Aces par zone ── */}
                    {sortedAces.length > 0 && (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.statSection}>
                          <Text style={styles.statSectionLabel}>
                            ACES PAR ZONE
                          </Text>
                          {sortedAces.map(az => {
                            const pct =
                              totalSetAces > 0
                                ? Math.round((az.count / totalSetAces) * 100)
                                : 0;
                            return (
                              <View key={az.zone} style={styles.trajRow}>
                                <Text style={styles.trajRowLabel}>
                                  Zone {az.zone}
                                </Text>
                                <View style={styles.bar}>
                                  <View
                                    style={[
                                      styles.barFill,
                                      {
                                        width: `${pct}%`,
                                        backgroundColor: COLORS.yellow,
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.trajRowVal}>
                                  {pct}% ({az.count})
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
```

- [ ] **Étape 3 : Ajouter les nouveaux styles**

Dans le `StyleSheet.create({...})` à la fin de `src/screens/LiveMatchAnalysisScreen.tsx`, ajouter ces 3 styles avant la fermeture du StyleSheet :

```ts
  attackTrajectoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  attackPosLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    width: 32,
  },
  attackTrajList: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
```

- [ ] **Étape 4 : Vérifier le TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreur. Pas de `any`, pas de non-null assertion (`!`).

- [ ] **Étape 5 : Commit**

```bash
git add src/screens/LiveMatchAnalysisScreen.tsx
git commit -m "feat(live-analysis): add attack trajectories and ace zones per set in PlayersTab"
```

---

## Task 2 : Vérification visuelle

- [ ] **Étape 1 : Démarrer le serveur**

```bash
npx expo start --clear
```

- [ ] **Étape 2 : Naviguer**

Statistiques → Équipe → Stats live → Choix équipe → onglet **Joueurs** → taper un joueur avec des données

- [ ] **Étape 3 : Vérifier les trajectoires d'attaque**

- Section `TRAJECTOIRES D'ATTAQUE` visible sous ACTIONS NEUTRES dans chaque SET N
- Format : `P4 : Z4→Z6 (3)  Z4→Z5 (1)` — positions triées, trajectoires par count décroissant
- Section absente si aucune trajectoire avec zones dans ce set

- [ ] **Étape 4 : Vérifier les aces par zone**

- Section `ACES PAR ZONE` visible sous TRAJECTOIRES D'ATTAQUE
- Barres jaunes (`COLORS.yellow`), pourcentage = distribution relative (3 aces / 5 aces totaux = 60%)
- Section absente si aucun ace dans ce set

- [ ] **Étape 5 : Vérifier les autres onglets**

Résumé, Par set, Adversaire — aucune régression.
