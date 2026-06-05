// ─────────────────────────────────────────────
//  APP.TSX — POINT D'ENTRÉE PRINCIPAL
//
//  Structure de l'application :
//    - MatchProvider  : fournit l'état global du match
//    - ScoreHeader    : en-tête avec scores et boutons rapides
//    - SetBanner      : bannière fin de set (conditionnelle)
//    - TabBar         : navigation par onglets personnalisée
//    - [Screens]      : 5 écrans selon l'onglet actif
//
//  Dépendances requises :
//    npm install react-native-svg
//    (ou expo install react-native-svg si vous utilisez Expo)
//
//  Structure des fichiers :
//    App.tsx
//    src/
//      constants/theme.ts        → couleurs, espacements
//      data/players.ts           → données API (hardcodées)
//      context/MatchContext.tsx  → état global + reducer
//      components/
//        ScoreHeader.tsx         → en-tête score
//        SetBanner.tsx           → bannière fin de set
//        PlayerAvatar.tsx        → avatar joueur (initiales)
//      screens/
//        RosterScreen.tsx        → sélection de l'équipe
//        CourtScreen.tsx         → terrain + actions joueurs
//        SubstitutionScreen.tsx  → remplacements
//        GraphScreen.tsx         → graphe trajectoire
//        StatsScreen.tsx         → statistiques joueurs
// ─────────────────────────────────────────────

import './src/data/openapi/apiClient';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Contextes globaux
import { MatchProvider, useMatch } from './src/context/MatchContext';
import { TeamProvider, useTeam } from './src/context/TeamContext';

// Composants permanents (toujours visibles pendant le match)
import ScoreHeader from './src/components/ScoreHeader';
import SetBanner   from './src/components/SetBanner';

// Écrans affichés avant les onglets (flux de démarrage)
import HomeScreen          from './src/screens/HomeScreen';
import MatchSetupScreen    from './src/screens/MatchSetupScreen';
import TeamSelectionScreen from './src/screens/TeamSelectionScreen';

// Écrans des onglets
import RosterScreen         from './src/screens/RosterScreen';
import CourtScreen          from './src/screens/CourtScreen';
import SubstitutionScreen   from './src/screens/SubstitutionScreen';
import GraphScreen          from './src/screens/GraphScreen';
import StatsScreen          from './src/screens/StatsScreen';
import PositionScreen       from './src/screens/PositionScreen';
import SetSetupScreen       from './src/screens/SetSetupScreen';
import PlayerManagementScreen    from './src/screens/PlayerManagementScreen';
import StatsTeamSelectionScreen  from './src/screens/StatsTeamSelectionScreen';
import StatsHubScreen            from './src/screens/StatsHubScreen';
import TeamMatchListScreen       from './src/screens/TeamMatchListScreen';
import StatsPlayersScreen        from './src/screens/StatsPlayersScreen';
import MatchDetailScreen         from './src/screens/MatchDetailScreen';
import PlayerSeasonStatsScreen  from './src/screens/PlayerSeasonStatsScreen';
import MatchModeScreen from './src/screens/MatchModeScreen';
import LiveStatsScreen from './src/screens/LiveStatsScreen';
import { LiveStatsProvider } from './src/context/LiveStatsContext';

// Thème
import { COLORS, SPACING, FONT_SIZE } from './src/constants/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen    from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// ── Types ──
type TabId = 'court' | 'position' | 'sub' | 'graph' | 'stats';

type Tab = {
  id: TabId;
  label: string;
  activeColor: string;
};

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  disabledTabs?: Set<TabId>;
};

// ── Onglets du mode saisie temps réel ──
type LiveTabId = 'live' | 'position' | 'graph' | 'stats';
const LIVE_TABS: { id: LiveTabId; label: string; activeColor: string }[] = [
  { id: 'live',     label: 'Saisie', activeColor: COLORS.green  },
  { id: 'position', label: '5-1',    activeColor: COLORS.yellow },
  { id: 'graph',    label: 'Graphe', activeColor: COLORS.blue   },
  { id: 'stats',    label: 'Stats',  activeColor: COLORS.blue   },
];

// ── Définition des onglets ──
const TABS: Tab[] = [
  { id: 'court',    label: 'Terrain',  activeColor: COLORS.blue   },
  { id: 'position', label: '5-1',      activeColor: COLORS.yellow },
  { id: 'sub',      label: 'Rempl.',   activeColor: COLORS.blue   },
  { id: 'graph',    label: 'Graphe',   activeColor: COLORS.blue   },
  { id: 'stats',    label: 'Stats',    activeColor: COLORS.blue   },
];

// ── Composant TabBar ──
const TabBar = ({ activeTab, onTabChange, disabledTabs }: TabBarProps) => (
  <View style={styles.tabBar}>
    {TABS.map(tab => {
      const isActive   = tab.id === activeTab;
      const isDisabled = disabledTabs?.has(tab.id) ?? false;
      return (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, isDisabled && styles.tabItemDisabled]}
          onPress={() => !isDisabled && onTabChange(tab.id)}
          activeOpacity={isDisabled ? 1 : 0.7}
        >
          <Text style={[
            styles.tabLabel,
            isActive    && { color: tab.activeColor, fontWeight: '500' },
            isDisabled  && styles.tabLabelDisabled,
          ]}>
            {tab.label}
          </Text>
          <View style={[styles.tabIndicator, isActive && { backgroundColor: tab.activeColor }]} />
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Auth gate: renders auth screens or app based on session state ──
const AuthGate = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.green} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <TeamProvider>
      <MatchProvider>
        <AppContent />
      </MatchProvider>
    </TeamProvider>
  );
};

// ── Composant principal ──
const AppContent = () => {
  const { state: teamState, actions: teamActions } = useTeam();
  const { state: matchState, actions: matchActions } = useMatch();
  const { selectedTeam } = teamState;
  const { rosterValidated, setSetupPending, matchName, matchPlayers, liberoId, setNum } = matchState;

  const hasBenchPlayers = matchPlayers.some(p => !p.onCourt && p.id !== liberoId);
  const disabledTabs = new Set<TabId>(hasBenchPlayers ? [] : ['sub']);

  const [activeTab, setActiveTab] = useState<TabId>('court');
  const [homeVisible, setHomeVisible] = useState(true);
  const [rosterOverlayVisible, setRosterOverlayVisible] = useState(false);
  const [playerMgmtVisible, setPlayerMgmtVisible] = useState(false);
  const [matchMode, setMatchMode] = useState<'classic' | 'live' | null>(null);
  const [liveTab, setLiveTab] = useState<LiveTabId>('live');

  type StatsStep = 'teamSelection' | 'hub' | 'matchList' | 'playerList' | 'matchDetail' | 'playerDetail';
  const [statsStep, setStatsStep] = useState<StatsStep | null>(null);
  const [statsTeam, setStatsTeam] = useState<{ id: number; name: string } | null>(null);
  const [statsMatch, setStatsMatch] = useState<{ id: string; date: string } | null>(null);
  const [statsPlayer, setStatsPlayer] = useState<{ id: number; name: string; numero: number } | null>(null);

  useEffect(() => {
    if (!selectedTeam || !rosterValidated) {
      setRosterOverlayVisible(false);
    }
  }, [selectedTeam, rosterValidated]);

  // Si l'équipe est désélectionnée, on oublie le mode choisi.
  useEffect(() => {
    if (!selectedTeam) setMatchMode(null);
  }, [selectedTeam]);

  // Basculer sur Terrain dès que la configuration du set est validée
  useEffect(() => {
    if (rosterValidated && !setSetupPending) {
      setActiveTab('court');
    }
  }, [setSetupPending, rosterValidated]);

  // Si l'onglet actif devient désactivé (ex: dernier remplaçant utilisé), revenir sur Terrain
  useEffect(() => {
    if (disabledTabs.has(activeTab)) {
      setActiveTab('court');
    }
  }, [disabledTabs, activeTab]);

  // ── Bouton retour Android ──
  const handleBack = useCallback((): boolean => {
    if (playerMgmtVisible) {
      setPlayerMgmtVisible(false);
      return true;
    }
    if (statsStep !== null) {
      if (statsStep === 'teamSelection')  { setStatsStep(null);           return true; }
      if (statsStep === 'hub')            { setStatsStep('teamSelection'); return true; }
      if (statsStep === 'matchList')      { setStatsStep('hub');           return true; }
      if (statsStep === 'matchDetail')    { setStatsStep('matchList');     return true; }
      if (statsStep === 'playerList')     { setStatsStep('hub');           return true; }
      if (statsStep === 'playerDetail')   { setStatsStep('playerList');    return true; }
    }
    if (!matchName && !homeVisible) {
      setHomeVisible(true);
      return true;
    }
    if (matchName && !selectedTeam) {
      matchActions.clearMatchSetup();
      return true;
    }
    if (matchMode === 'live') {
      setMatchMode(null);
      return true;
    }
    if (selectedTeam && !rosterValidated) {
      teamActions.clearTeam();
      return true;
    }
    if (rosterOverlayVisible) {
      setRosterOverlayVisible(false);
      return true;
    }
    if (rosterValidated && setSetupPending && setNum === 1) {
      matchActions.resetRoster();
      return true;
    }
    return rosterValidated;

  }, [
    playerMgmtVisible, statsStep, matchName, homeVisible,
    selectedTeam, matchMode, rosterValidated, rosterOverlayVisible,
    setSetupPending, setNum, matchActions, teamActions,
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  // ── Gestion joueurs (accessible depuis l'accueil, hors match) ──
  if (playerMgmtVisible) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <PlayerManagementScreen onClose={() => setPlayerMgmtVisible(false)} />
      </SafeAreaView>
    );
  }

  // ── Statistiques (accessible depuis l'accueil, hors match) ──
  if (statsStep !== null) {
    if (statsStep === 'teamSelection') {
      return (
        <StatsTeamSelectionScreen
          onBack={() => setStatsStep(null)}
          onSelectTeam={(id, name) => { setStatsTeam({ id, name }); setStatsStep('hub'); }}
        />
      );
    }
    if (statsStep === 'hub' && statsTeam !== null) {
      return (
        <StatsHubScreen
          teamName={statsTeam.name}
          onBack={() => setStatsStep('teamSelection')}
          onMatchStats={() => setStatsStep('matchList')}
          onPlayerStats={() => setStatsStep('playerList')}
        />
      );
    }
    if (statsStep === 'matchList' && statsTeam !== null) {
      return (
        <TeamMatchListScreen
          teamId={statsTeam.id}
          teamName={statsTeam.name}
          onBack={() => setStatsStep('hub')}
          onSelectMatch={(id, date) => { setStatsMatch({ id, date }); setStatsStep('matchDetail'); }}
        />
      );
    }
    if (statsStep === 'matchDetail' && statsMatch !== null) {
      return (
        <MatchDetailScreen
          matchId={statsMatch.id}
          matchDate={statsMatch.date}
          onBack={() => setStatsStep('matchList')}
        />
      );
    }
    if (statsStep === 'playerList' && statsTeam !== null) {
      return (
        <StatsPlayersScreen
          teamId={statsTeam.id}
          teamName={statsTeam.name}
          onBack={() => setStatsStep('hub')}
          onSelectPlayer={(id, name, numero) => {
            setStatsPlayer({ id, name, numero });
            setStatsStep('playerDetail');
          }}
        />
      );
    }
    if (statsStep === 'playerDetail' && statsTeam !== null && statsPlayer !== null) {
      return (
        <PlayerSeasonStatsScreen
          playerId={statsPlayer.id}
          playerName={statsPlayer.name}
          playerNumero={statsPlayer.numero}
          teamId={statsTeam.id}
          onBack={() => setStatsStep('playerList')}
        />
      );
    }
  }

  // ── Étape 0 : écran d'accueil ──
  if (homeVisible && !matchName) {
    return (
      <HomeScreen
        onNewMatch={() => setHomeVisible(false)}
        onManagePlayers={() => setPlayerMgmtVisible(true)}
        onStats={() => setStatsStep('teamSelection')}
      />
    );
  }

  // ── Étape 1 : configuration du match (nom + domicile/extérieur) ──
  if (!matchName) {
    return <MatchSetupScreen onBack={() => setHomeVisible(true)} />;
  }

  // ── Étape 2 : sélection de l'équipe ──
  if (!selectedTeam) {
    return <TeamSelectionScreen />;
  }

  // ── Étape 2bis : choix du mode (classique / saisie temps réel) ──
  if (selectedTeam && matchMode === null) {
    return (
      <MatchModeScreen
        teamName={selectedTeam.name}
        onSelectClassic={() => setMatchMode('classic')}
        onSelectLive={() => setMatchMode('live')}
        onBack={() => teamActions.clearTeam()}
      />
    );
  }

  // ── Mode saisie temps réel : même flux roster + positions que le match classique ──
  if (matchMode === 'live') {
    // Étape A : composition du roster (titulaires + banc + libero)
    if (!rosterValidated) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
          <View style={styles.screenContainer}>
            <RosterScreen />
          </View>
        </SafeAreaView>
      );
    }
    // Étape B : placement sur le terrain + rôles
    if (setSetupPending) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
          <SetSetupScreen />
        </SafeAreaView>
      );
    }
    // Étape C : shell avec bandeau score + onglets (Saisie / 5-1 / Graphe / Stats)
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <LiveStatsProvider>
          <ScoreHeader onRosterPress={() => setRosterOverlayVisible(true)} />
          <SetBanner />
          {rosterOverlayVisible ? (
            <View style={styles.screenContainer}>
              <RosterScreen onClose={() => setRosterOverlayVisible(false)} />
            </View>
          ) : (
            <>
              <View style={styles.tabBar}>
                {LIVE_TABS.map(t => {
                  const isActive = t.id === liveTab;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.tabItem}
                      onPress={() => setLiveTab(t.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabLabel, isActive && { color: t.activeColor, fontWeight: '500' }]}>
                        {t.label}
                      </Text>
                      <View style={[styles.tabIndicator, isActive && { backgroundColor: t.activeColor }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.screenContainer}>
                {liveTab === 'live'     && <LiveStatsScreen team={selectedTeam} />}
                {liveTab === 'position' && <PositionScreen />}
                {liveTab === 'graph'    && <GraphScreen />}
                {liveTab === 'stats'    && <StatsScreen />}
              </View>
            </>
          )}
        </LiveStatsProvider>
      </SafeAreaView>
    );
  }

  // ── Étape 3 : configuration du set (rôles et positions) ──
  // Affiché après la validation du roster et après chaque fin de set
  if (rosterValidated && setSetupPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <SetSetupScreen />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'court':    return <CourtScreen />;
      case 'position': return <PositionScreen />;
      case 'sub':      return <SubstitutionScreen />;
      case 'graph':    return <GraphScreen />;
      case 'stats':    return <StatsScreen />;
    }
  };

  // ── Avant validation du roster : RosterScreen standalone ──
  if (!rosterValidated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <ScoreHeader />
        <View style={styles.screenContainer}>
          <RosterScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      <ScoreHeader onRosterPress={() => setRosterOverlayVisible(true)} />
      <SetBanner />

      {rosterOverlayVisible ? (
        <View style={styles.screenContainer}>
          <RosterScreen onClose={() => setRosterOverlayVisible(false)} />
        </View>
      ) : (
        <>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} disabledTabs={disabledTabs} />
          <View style={styles.screenContainer}>
            {renderScreen()}
          </View>
        </>
      )}

    </SafeAreaView>
  );
};

// ── Point d'entrée avec les Providers ──
// TeamProvider  : charge les équipes et gère la sélection
// MatchProvider : gère l'état du match en cours
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Zone sécurisée (évite les encoches et barres systèmes)
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  // Barre d'onglets
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  tabItemDisabled: {
    opacity: 0.35,
  },
  tabLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  tabLabelDisabled: {
    color: COLORS.textDark,
  },
  // Trait coloré sous l'onglet actif
  tabIndicator: {
    height: 2,
    width: '60%',
    borderRadius: 1,
    marginTop: 4,
    backgroundColor: 'transparent',
  },

  // Conteneur de l'écran (flex pour remplir l'espace restant)
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgApp,
  },
});