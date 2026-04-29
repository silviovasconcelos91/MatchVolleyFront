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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
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
import SetSetupScreen       from './src/screens/SetSetupScreen';
import PlayerManagementScreen from './src/screens/PlayerManagementScreen';

// Thème
import { COLORS, SPACING, FONT_SIZE } from './src/constants/theme';

// ── Types ──
type TabId = 'court' | 'sub' | 'graph' | 'stats';

type Tab = {
  id: TabId;
  label: string;
  activeColor: string;
};

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
};

// ── Définition des onglets ──
const TABS: Tab[] = [
  { id: 'court',  label: 'Terrain', activeColor: COLORS.blue },
  { id: 'sub',    label: 'Rempl.',  activeColor: COLORS.blue },
  { id: 'graph',  label: 'Graphe',  activeColor: COLORS.blue },
  { id: 'stats',  label: 'Stats',   activeColor: COLORS.blue },
];

// ── Composant TabBar ──
const TabBar = ({ activeTab, onTabChange }: TabBarProps) => (
  <View style={styles.tabBar}>
    {TABS.map(tab => {
      const isActive = tab.id === activeTab;
      return (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, isActive && { color: tab.activeColor, fontWeight: '500' }]}>
            {tab.label}
          </Text>
          <View style={[styles.tabIndicator, isActive && { backgroundColor: tab.activeColor }]} />
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Composant principal ──
const AppContent = () => {
  const { state: teamState } = useTeam();
  const { state: matchState } = useMatch();
  const { selectedTeam } = teamState;
  const { rosterValidated, setSetupPending, matchName } = matchState;

  const [activeTab, setActiveTab] = useState<TabId>('court');
  const [homeVisible, setHomeVisible] = useState(true);
  const [rosterOverlayVisible, setRosterOverlayVisible] = useState(false);
  const [playerMgmtVisible, setPlayerMgmtVisible] = useState(false);

  useEffect(() => {
    if (!selectedTeam || !rosterValidated) {
      setRosterOverlayVisible(false);
    }
  }, [selectedTeam, rosterValidated]);

  // Basculer sur Terrain dès que la configuration du set est validée
  useEffect(() => {
    if (rosterValidated && !setSetupPending) {
      setActiveTab('court');
    }
  }, [setSetupPending, rosterValidated]);

  // ── Gestion joueurs (accessible depuis l'accueil, hors match) ──
  if (playerMgmtVisible) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <PlayerManagementScreen onClose={() => setPlayerMgmtVisible(false)} />
      </SafeAreaView>
    );
  }

  // ── Étape 0 : écran d'accueil ──
  if (homeVisible && !matchName) {
    return (
      <HomeScreen
        onNewMatch={() => setHomeVisible(false)}
        onManagePlayers={() => setPlayerMgmtVisible(true)}
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

  // ── Étape 3 : configuration du set (rôles et positions) ──
  // Affiché après la validation du roster et après chaque fin de set
  if (rosterValidated && setSetupPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />
        <ScoreHeader />
        <SetSetupScreen />
      </SafeAreaView>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'court':  return <CourtScreen />;
      case 'sub':    return <SubstitutionScreen />;
      case 'graph':  return <GraphScreen />;
      case 'stats':  return <StatsScreen />;
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
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
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
      <TeamProvider>
        <MatchProvider>
          <AppContent />
        </MatchProvider>
      </TeamProvider>
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
    paddingVertical: SPACING.sm + 2, // ~10px
  },
  tabLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
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
});