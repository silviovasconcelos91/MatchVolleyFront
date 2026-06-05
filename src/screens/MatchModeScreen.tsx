import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  teamName: string;
  onSelectClassic: () => void;
  onSelectLive: () => void;
  onBack: () => void;
};

const MatchModeScreen = ({ teamName, onSelectClassic, onSelectLive, onBack }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.back}>‹ Retour</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.body}>
      <Text style={styles.team}>{teamName}</Text>
      <Text style={styles.title}>Choisir le mode</Text>

      <TouchableOpacity style={[styles.card, styles.cardClassic]} onPress={onSelectClassic} activeOpacity={0.85}>
        <Text style={styles.cardTitle}>Match classique</Text>
        <Text style={styles.cardSub}>Composition, terrain, score, rotations…</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.cardLive]} onPress={onSelectLive} activeOpacity={0.85}>
        <Text style={styles.cardTitle}>Saisie temps réel</Text>
        <Text style={styles.cardSub}>Saisie rapide des actions des 2 équipes — TEST</Text>
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  back: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  team: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardClassic: {
    backgroundColor: `${COLORS.blue}18`,
    borderColor: `${COLORS.blue}55`,
  },
  cardLive: {
    backgroundColor: `${COLORS.green}18`,
    borderColor: `${COLORS.green}55`,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default MatchModeScreen;
