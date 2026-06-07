# Live Match Analysis Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `LiveMatchAnalysisScreen` accessible from Stats → Équipe → Stats live, fetching `getLiveMatchAnalysis(matchId)` and displaying a Résumé tab (score global + team stats) with 3 placeholder tabs.

**Architecture:** Three-file change: new screen component, StatsHubScreen adds a third card, App.tsx wires two new StatsStep values (`liveMatchList`, `liveMatchDetail`). `TeamMatchListScreen` is reused for match selection. All data types already exist in `src/data/liveStatsAnalysis.ts`.

**Tech Stack:** React Native, Expo, TypeScript strict, `getLiveMatchAnalysis` from `src/data/matchApi.ts`, design tokens from `src/constants/theme.ts`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/screens/LiveMatchAnalysisScreen.tsx` | **Create** | Full screen: loading/error states, 4-tab shell, Résumé tab content |
| `src/screens/StatsHubScreen.tsx` | **Modify** | Add `onLiveStats` prop + third card |
| `App.tsx` | **Modify** | Import, StatsStep type, back-button, StatsHubScreen prop, two new step cases |

---

### Task 1: Create `LiveMatchAnalysisScreen.tsx`

**Files:**
- Create: `src/screens/LiveMatchAnalysisScreen.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLiveMatchAnalysis } from '../data/matchApi';
import type { LiveMatchAnalysis } from '../data/liveStatsAnalysis';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  matchId: string;
  matchDate: string;
  onBack: () => void;
};

type TabId = 'resume' | 'sets' | 'players' | 'opp';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resume',  label: 'Résumé'     },
  { id: 'sets',    label: 'Par set'    },
  { id: 'players', label: 'Joueurs'    },
  { id: 'opp',     label: 'Adversaire' },
];

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

// ── Chip action ──────────────────────────────────────────────────────
type ChipProps = { label: string; count: number; color: string };
const Chip = ({ label, count, color }: ChipProps) => (
  <View style={[styles.chip, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
    <Text style={[styles.chipText, { color }]}>{label} {count}</Text>
  </View>
);

// ── Onglet Résumé ────────────────────────────────────────────────────
type ResumeTabProps = { data: LiveMatchAnalysis };
const ResumeTab = ({ data }: ResumeTabProps) => {
  const { globalStats, sets } = data;

  const setsWonMine   = sets.filter(s => s.wonBy === 'mine').length;
  const setsWonOpp    = sets.filter(s => s.wonBy === 'opp').length;
  const totalMyScore  = sets.reduce((a, s) => a + s.myScore, 0);
  const totalOppScore = sets.reduce((a, s) => a + s.oppScore, 0);
  const playerPoints  = globalStats.actions.points.reduce((a, x) => a + x.count, 0);
  const teamFaults    = globalStats.actions.faults.reduce((a, x) => a + x.count, 0);
  const oppActual     = Math.max(0, totalOppScore - teamFaults);
  const oppFaults     = Math.max(0, totalMyScore - playerPoints);
  const isWin         = setsWonMine > setsWonOpp;

  return (
    <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>

      {/* ── Zone 1 : Score global ── */}
      <View style={styles.scoreCard}>
        <View style={[styles.resultBadge, isWin ? styles.resultBadgeWin : styles.resultBadgeLoss]}>
          <Text style={[styles.resultBadgeText, isWin ? styles.resultBadgeTextWin : styles.resultBadgeTextLoss]}>
            {isWin ? 'VICTOIRE' : 'DÉFAITE'}
          </Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreMain}>{setsWonMine}</Text>
          <Text style={styles.scoreSep}> – </Text>
          <Text style={styles.scoreMain}>{setsWonOpp}</Text>
          <Text style={styles.scoreUnit}>sets</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreSecondary}>{totalMyScore}</Text>
          <Text style={styles.scoreSepSecondary}> – </Text>
          <Text style={styles.scoreSecondary}>{totalOppScore}</Text>
          <Text style={styles.scoreUnitSecondary}>pts</Text>
        </View>
      </View>

      {/* ── Zone 2 : Stats équipe ── */}
      <View style={styles.teamCard}>

        {/* Points marqués */}
        <View style={styles.statSection}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statSectionLabel}>POINTS MARQUÉS</Text>
            <Text style={[styles.statRatio, { color: COLORS.greenLight }]}>
              {playerPoints} / {totalMyScore}
            </Text>
          </View>
          {globalStats.actions.points.length > 0 ? (
            <View style={styles.chipsRow}>
              {globalStats.actions.points.map(a => (
                <Chip key={a.key} label={a.label} count={a.count} color={COLORS.greenLight} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptySection}>Aucun point enregistré</Text>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Fautes */}
        <View style={styles.statSection}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statSectionLabel}>FAUTES</Text>
            <Text style={[styles.statRatio, { color: COLORS.redLight }]}>
              {teamFaults} / {totalOppScore}
            </Text>
          </View>
          {globalStats.actions.faults.length > 0 ? (
            <View style={styles.chipsRow}>
              {globalStats.actions.faults.map(a => (
                <Chip key={a.key} label={a.label} count={a.count} color={COLORS.redLight} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptySection}>Aucune faute enregistrée</Text>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Adversaire */}
        <View style={styles.statSection}>
          <Text style={styles.statSectionLabel}>ADVERSAIRE</Text>
          <View style={styles.oppRow}>
            <Text style={styles.oppLabel}>Points marqués</Text>
            <Text style={styles.oppValue}>{oppActual}</Text>
          </View>
          <View style={styles.oppRow}>
            <Text style={styles.oppLabel}>Fautes</Text>
            <Text style={styles.oppValue}>{oppFaults}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

// ── Placeholder ──────────────────────────────────────────────────────
const PlaceholderTab = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>À venir</Text>
  </View>
);

// ── Écran principal ──────────────────────────────────────────────────
const LiveMatchAnalysisScreen = ({ matchId, matchDate, onBack }: Props) => {
  const [data, setData]         = useState<LiveMatchAnalysis | null>(null);
  const [status, setStatus]     = useState<'loading' | 'error' | 'not_found' | 'ok'>('loading');
  const [activeTab, setActiveTab] = useState<TabId>('resume');

  const load = useCallback(() => {
    setStatus('loading');
    setData(null);
    getLiveMatchAnalysis(matchId)
      .then(d => { setData(d); setStatus('ok'); })
      .catch((err: Error & { status?: number }) => {
        setStatus(err.status === 404 ? 'not_found' : 'error');
      });
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Matchs</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatDate(matchDate)}</Text>
        <Text style={styles.headerSubtitle}>Analyse live</Text>
      </View>

      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
        </View>
      )}

      {status === 'not_found' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Pas de stats live pour ce match.</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Impossible de charger l'analyse live.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ok' && data !== null && (
        <>
          <View style={styles.tabBar}>
            {TABS.map(t => {
              const isActive = t.id === activeTab;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(t.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {t.label}
                  </Text>
                  <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.screenContainer}>
            {activeTab === 'resume'  && <ResumeTab data={data} />}
            {activeTab === 'sets'    && <PlaceholderTab />}
            {activeTab === 'players' && <PlaceholderTab />}
            {activeTab === 'opp'     && <PlaceholderTab />}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  header: {
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  backBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.blue,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  tabLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.blue,
    fontWeight: '500',
  },
  tabIndicator: {
    height: 2,
    width: '60%',
    marginTop: 4,
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  tabIndicatorActive: {
    backgroundColor: COLORS.blue,
  },
  screenContainer: {
    flex: 1,
  },

  // ── Tab scroll ──
  tabScroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  // ── Score global ──
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  resultBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
  },
  resultBadgeWin: {
    backgroundColor: `${COLORS.green}22`,
    borderColor: `${COLORS.green}44`,
  },
  resultBadgeLoss: {
    backgroundColor: `${COLORS.red}22`,
    borderColor: `${COLORS.red}44`,
  },
  resultBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultBadgeTextWin: {
    color: COLORS.greenLight,
  },
  resultBadgeTextLoss: {
    color: COLORS.redLight,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreMain: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scoreSep: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  scoreUnit: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  scoreSecondary: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  scoreSepSecondary: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textMuted,
  },
  scoreUnitSecondary: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },

  // ── Stats équipe ──
  teamCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  statSection: {
    padding: SPACING.md,
  },
  statHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statSectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  statRatio: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
  },
  emptySection: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  oppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  oppLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  oppValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // ── Placeholder ──
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
  },
});

export default LiveMatchAnalysisScreen;
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/LiveMatchAnalysisScreen.tsx
git commit -m "feat(live-stats): add LiveMatchAnalysisScreen with Résumé tab"
```

---

### Task 2: Update `StatsHubScreen.tsx`

**Files:**
- Modify: `src/screens/StatsHubScreen.tsx`

- [ ] **Step 1: Add `onLiveStats` to Props and add third card**

In `src/screens/StatsHubScreen.tsx`, replace:

```tsx
type Props = {
  teamName: string;
  onBack: () => void;
  onMatchStats: () => void;
  onPlayerStats: () => void;
};

const StatsHubScreen = ({ teamName, onBack, onMatchStats, onPlayerStats }: Props) => (
```

With:

```tsx
type Props = {
  teamName: string;
  onBack: () => void;
  onMatchStats: () => void;
  onPlayerStats: () => void;
  onLiveStats: () => void;
};

const StatsHubScreen = ({ teamName, onBack, onMatchStats, onPlayerStats, onLiveStats }: Props) => (
```

- [ ] **Step 2: Add the third card**

In `src/screens/StatsHubScreen.tsx`, find the existing second card (Stats joueurs) and add the third card immediately after it:

Find:
```tsx
      <TouchableOpacity style={styles.card} onPress={onPlayerStats} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>👤</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Stats joueurs</Text>
          <Text style={styles.cardDesc}>Performances individuelles</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
```

Replace with:
```tsx
      <TouchableOpacity style={styles.card} onPress={onPlayerStats} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>👤</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Stats joueurs</Text>
          <Text style={styles.cardDesc}>Performances individuelles</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={onLiveStats} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>📊</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Stats live</Text>
          <Text style={styles.cardDesc}>Analyse des matchs saisie en live</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: error about missing `onLiveStats` prop at the App.tsx call site — that's expected and will be fixed in Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/screens/StatsHubScreen.tsx
git commit -m "feat(live-stats): add Stats live card to StatsHubScreen"
```

---

### Task 3: Wire navigation in `App.tsx`

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add import**

After line 77 (`import LiveStatsSummaryScreen ...`), add:

```tsx
import LiveMatchAnalysisScreen from './src/screens/LiveMatchAnalysisScreen';
```

- [ ] **Step 2: Extend StatsStep type**

Find:
```tsx
  type StatsStep = 'teamSelection' | 'hub' | 'matchList' | 'playerList' | 'matchDetail' | 'playerDetail';
```

Replace with:
```tsx
  type StatsStep = 'teamSelection' | 'hub' | 'matchList' | 'playerList' | 'matchDetail' | 'playerDetail' | 'liveMatchList' | 'liveMatchDetail';
```

- [ ] **Step 3: Add back-button handlers**

Find:
```tsx
      if (statsStep === 'matchDetail')    { setStatsStep('matchList');     return true; }
      if (statsStep === 'playerList')     { setStatsStep('hub');           return true; }
```

Replace with:
```tsx
      if (statsStep === 'matchDetail')    { setStatsStep('matchList');     return true; }
      if (statsStep === 'liveMatchList')  { setStatsStep('hub');           return true; }
      if (statsStep === 'liveMatchDetail'){ setStatsStep('liveMatchList'); return true; }
      if (statsStep === 'playerList')     { setStatsStep('hub');           return true; }
```

- [ ] **Step 4: Add `onLiveStats` to StatsHubScreen render**

Find:
```tsx
        <StatsHubScreen
          teamName={statsTeam.name}
          onBack={() => setStatsStep('teamSelection')}
          onMatchStats={() => setStatsStep('matchList')}
          onPlayerStats={() => setStatsStep('playerList')}
        />
```

Replace with:
```tsx
        <StatsHubScreen
          teamName={statsTeam.name}
          onBack={() => setStatsStep('teamSelection')}
          onMatchStats={() => setStatsStep('matchList')}
          onPlayerStats={() => setStatsStep('playerList')}
          onLiveStats={() => setStatsStep('liveMatchList')}
        />
```

- [ ] **Step 5: Add liveMatchList and liveMatchDetail cases**

Find:
```tsx
    if (statsStep === 'playerList' && statsTeam !== null) {
      return (
        <StatsPlayersScreen
```

Replace with:
```tsx
    if (statsStep === 'liveMatchList' && statsTeam !== null) {
      return (
        <TeamMatchListScreen
          teamId={statsTeam.id}
          teamName={statsTeam.name}
          onBack={() => setStatsStep('hub')}
          onSelectMatch={(id, date) => { setStatsMatch({ id, date }); setStatsStep('liveMatchDetail'); }}
        />
      );
    }
    if (statsStep === 'liveMatchDetail' && statsMatch !== null) {
      return (
        <LiveMatchAnalysisScreen
          matchId={statsMatch.id}
          matchDate={statsMatch.date}
          onBack={() => setStatsStep('liveMatchList')}
        />
      );
    }
    if (statsStep === 'playerList' && statsTeam !== null) {
      return (
        <StatsPlayersScreen
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

Start dev server:
```bash
npx expo start --clear
```

Verify:
1. Home → Stats icon → select team → StatsHubScreen shows 3 cards: "Stats matchs", "Stats joueurs", "Stats live"
2. Tap "Stats live" → TeamMatchListScreen with list of matches
3. Tap a match → LiveMatchAnalysisScreen loads with "Analyse live" header and 4 tabs
4. If match has live stats: Résumé tab shows Zone 1 (VICTOIRE/DÉFAITE badge + sets score + pts score) and Zone 2 (POINTS MARQUÉS ratio + chips, FAUTES ratio + chips, ADVERSAIRE rows)
5. If match has no live stats: "Pas de stats live pour ce match." message
6. Tabs "Par set", "Joueurs", "Adversaire" show "À venir"
7. Back button from LiveMatchAnalysisScreen → TeamMatchListScreen → StatsHubScreen

- [ ] **Step 8: Commit**

```bash
git add App.tsx
git commit -m "feat(live-stats): wire LiveMatchAnalysisScreen into stats navigation"
```
