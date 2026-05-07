import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  onNewMatch:      () => void;
  onManagePlayers: () => void;
  onStats:         () => void;
};

const HomeScreen = ({ onNewMatch, onManagePlayers, onStats }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

    {/* ── En-tête ── */}
    <View style={styles.header}>
      <Text style={styles.title}>VolleyCoach</Text>
      <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>
    </View>

    {/* ── Actions ── */}
    <View style={styles.content}>

      {/* Nouveau match (actif) */}
      <TouchableOpacity
        style={styles.cardActive}
        onPress={onNewMatch}
        activeOpacity={0.7}
      >
        <Text style={styles.cardIcon}>🏐</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Nouveau match</Text>
          <Text style={styles.cardDesc}>Configurer et suivre un match en direct</Text>
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </TouchableOpacity>

      {/* Stats (actif) */}
      <TouchableOpacity
        style={styles.cardActive}
        onPress={onStats}
        activeOpacity={0.7}
      >
        <Text style={styles.cardIcon}>📊</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          <Text style={styles.cardDesc}>Historique et analyses des matchs</Text>
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </TouchableOpacity>

      {/* Équipes / joueurs (actif) */}
      <TouchableOpacity
        style={styles.cardActive}
        onPress={onManagePlayers}
        activeOpacity={0.7}
      >
        <Text style={styles.cardIcon}>👥</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Équipes & joueurs</Text>
          <Text style={styles.cardDesc}>Créer et gérer vos effectifs</Text>
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </TouchableOpacity>

    </View>
  </SafeAreaView>
);

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
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  content: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },

  // Carte active
  cardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: `${COLORS.yellow}55`,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardChevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.yellow,
    lineHeight: FONT_SIZE.xl,
  },

  // Carte inactive
  cardDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    opacity: 0.5,
  },
  cardIconDisabled: {
    fontSize: 28,
  },
  cardTitleDisabled: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  cardDescDisabled: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDark,
    marginTop: 2,
  },

  comingSoon: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDark,
  },
});

export default HomeScreen;