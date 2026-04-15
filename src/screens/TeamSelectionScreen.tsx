// ─────────────────────────────────────────────
//  ÉCRAN : SÉLECTION DE L'ÉQUIPE
//
//  Affiché au lancement de l'app (avant les onglets).
//  Le coach choisit son équipe pour accéder
//  à l'interface de match correspondante.
//
//  États :
//    loading → indicateur de chargement
//    error   → message + bouton "Réessayer"
//    teams   → liste des équipes disponibles
// ─────────────────────────────────────────────

import React, { useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, StatusBar, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeam } from '../context/TeamContext';
import { useMatch } from '../context/MatchContext';
import type { Team } from '../data/teams';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

// ── Composant ligne équipe (mémoïsé) ──
type TeamRowProps = {
  team: Team;
  onPress: (teamId: number) => void;
};

const TeamRow = memo(({ team, onPress }: TeamRowProps) => (
  <TouchableOpacity
    style={styles.teamRow}
    onPress={() => onPress(team.id)}
    activeOpacity={0.7}
  >
    {/* Cercle coloré avec la première lettre */}
    <View style={[styles.teamLogo, { backgroundColor: `${team.logoColor}22`, borderColor: `${team.logoColor}55` }]}>
      <Text style={[styles.teamLogoLetter, { color: team.logoColor }]}>
        {team.name[0]}
      </Text>
    </View>

    {/* Nom et ville */}
    <View style={styles.teamInfo}>
      <Text style={styles.teamName}>{team.name}</Text>
      <Text style={styles.teamCity}>{team.city}</Text>
    </View>

    {/* Compteur de joueurs + chevron */}
    <View style={styles.teamMeta}>
      <Text style={styles.teamPlayerCount}>{team.players.length} joueuses</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
));

// ── Écran principal ──
const TeamSelectionScreen = () => {
  const { state, actions } = useTeam();
  const { actions: matchActions } = useMatch();
  const { teams, loading, error } = state;

  const handleSelectTeam = useCallback((teamId: number) => {
    actions.selectTeam(teamId);
  }, [actions]);

  const renderTeam = useCallback(({ item }: ListRenderItemInfo<Team>) => (
    <TeamRow team={item} onPress={handleSelectTeam} />
  ), [handleSelectTeam]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      {/* ── En-tête ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={matchActions.clearMatchSetup}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionner une équipe</Text>
        <Text style={styles.headerSubtitle}>Choisissez votre équipe pour ce match</Text>
      </View>

      {/* ── Contenu ── */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.blue} size="large" />
          <Text style={styles.loadingText}>Chargement des équipes...</Text>
        </View>
      )}

      {!loading && error !== null && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={actions.reload}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && error === null && (
        <FlatList<Team>
          data={teams}
          keyExtractor={item => String(item.id)}
          renderItem={renderTeam}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune équipe disponible.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },

  // En-tête
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

  // États loading / error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.red,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  retryBtn: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },

  // Liste
  listContent: {
    padding: SPACING.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xxl,
  },

  // Ligne équipe
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamLogoLetter: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  teamCity: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  teamMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  teamPlayerCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textDark,
    lineHeight: FONT_SIZE.xl,
  },
});

export default TeamSelectionScreen;
