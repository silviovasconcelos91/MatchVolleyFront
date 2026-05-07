import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  teamName: string;
  onBack: () => void;
  onMatchStats: () => void;
  onPlayerStats: () => void;
};

const StatsHubScreen = ({ teamName, onBack, onMatchStats, onPlayerStats }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backBtnText}>‹ Équipes</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{teamName}</Text>
      <Text style={styles.headerSubtitle}>Choisissez une vue</Text>
    </View>

    <View style={styles.content}>
      <TouchableOpacity style={styles.card} onPress={onMatchStats} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>📋</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Stats matchs</Text>
          <Text style={styles.cardDesc}>Historique et résultats des matchs</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={onPlayerStats} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>👤</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Stats joueurs</Text>
          <Text style={styles.cardDesc}>Performances individuelles</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
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
  content: {
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: `${COLORS.blue}44`,
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
  chevron: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.blue,
    lineHeight: FONT_SIZE.xl,
  },
});

export default StatsHubScreen;
