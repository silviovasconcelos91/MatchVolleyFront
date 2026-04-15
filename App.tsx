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
import RosterScreen       from './src/screens/RosterScreen';
import CourtScreen        from './src/screens/CourtScreen';
import SubstitutionScreen from './src/screens/SubstitutionScreen';
import GraphScreen        from './src/screens/GraphScreen';
import StatsScreen        from './src/screens/StatsScreen';
import SetSetupScreen     from './src/screens/SetSetupScreen';

// Thème
import { COLORS, SPACING, FONT_SIZE } from './src/constants/theme';

// ── Types ──
type TabId = 'roster' | 'court' | 'sub' | 'graph' | 'stats';

type Tab = {
  id: TabId;
  label: string;
  activeColor: string;
};

// Onglets qui nécessitent que le roster soit validé
const LOCKED_TABS: TabId[] = ['court', 'sub', 'graph', 'stats'];

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  rosterValidated: boolean;
};

// ── Définition des onglets ──
// Chaque onglet a un id, un label affiché et une couleur active
const TABS: Tab[] = [
  { id: 'roster', label: 'Roster',  activeColor: '#ffd166' },
  { id: 'court',  label: 'Terrain', activeColor: COLORS.blue },
  { id: 'sub',    label: 'Rempl.',  activeColor: COLORS.blue },
  { id: 'graph',  label: 'Graphe',  activeColor: COLORS.blue },
  { id: 'stats',  label: 'Stats',   activeColor: COLORS.blue },
];

// ── Composant TabBar (navigation par onglets) ──
// Rendu séparé pour la clarté
const TabBar = ({ activeTab, onTabChange, rosterValidated }: TabBarProps) => (
  <View style={styles.tabBar}>
    {TABS.map(tab => {
      const isActive  = tab.id === activeTab;
      const isLocked  = !rosterValidated && LOCKED_TABS.includes(tab.id);
      return (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabItem, isLocked && styles.tabItemLocked]}
          onPress={() => !isLocked && onTabChange(tab.id)}
          activeOpacity={isLocked ? 1 : 0.7}
        >
          <Text
            style={[
              styles.tabLabel,
              isActive  && { color: tab.activeColor, fontWeight: '500' },
              isLocked  && styles.tabLabelLocked,
            ]}
          >
            {tab.label}
          </Text>
          {/* Cadenas sous les onglets verrouillés */}
          {isLocked ? (
            <Text style={styles.tabLock}>🔒</Text>
          ) : (
            <View
              style={[
                styles.tabIndicator,
                isActive && { backgroundColor: tab.activeColor },
              ]}
            />
          )}
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

  // Onglet actif par défaut : Roster (pour composer l'équipe en premier)
  const [activeTab, setActiveTab] = useState<TabId>('roster');

  // Écran d'accueil : visible tant que l'utilisateur n'a pas cliqué "Nouveau match"
  const [homeVisible, setHomeVisible] = useState(true);

  // Revenir sur Roster quand l'équipe est désélectionnée ou le roster réinitialisé
  useEffect(() => {
    if (!selectedTeam || !rosterValidated) {
      setActiveTab('roster');
    }
  }, [selectedTeam, rosterValidated]);

  // Basculer sur Terrain dès que la configuration du set est validée
  useEffect(() => {
    if (rosterValidated && !setSetupPending) {
      setActiveTab('court');
    }
  }, [setSetupPending, rosterValidated]);

  // ── Étape 0 : écran d'accueil ──
  if (homeVisible && !matchName) {
    return <HomeScreen onNewMatch={() => setHomeVisible(false)} />;
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

  // Rendu de l'écran correspondant à l'onglet actif
  const renderScreen = () => {
    switch (activeTab) {
      case 'roster': return <RosterScreen />;
      case 'court':  return <CourtScreen />;
      case 'sub':    return <SubstitutionScreen />;
      case 'graph':  return <GraphScreen />;
      case 'stats':  return <StatsScreen />;
      default:       return <RosterScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      {/* ── En-tête score (toujours visible) ── */}
      <ScoreHeader />

      {/* ── Bannière fin de set (conditionnelle) ── */}
      <SetBanner />

      {/* ── Barre d'onglets ── */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} rosterValidated={rosterValidated} />

      {/* ── Contenu de l'écran actif ── */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

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
  // Onglet verrouillé (roster non validé)
  tabItemLocked: {
    opacity: 0.35,
  },
  tabLabelLocked: {
    color: COLORS.textDark,
  },
  tabLock: {
    fontSize: 8,
    marginTop: 3,
  },

  // Conteneur de l'écran (flex pour remplir l'espace restant)
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
});