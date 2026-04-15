import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMatch } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  onBack: () => void;
};

const MatchSetupScreen = ({ onBack }: Props) => {
  const { actions } = useMatch();
  const [matchName, setMatchName] = useState('');
  const [isHome, setIsHome]       = useState<boolean | null>(null);

  const canContinue = matchName.trim().length > 0 && isHome !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    actions.setupMatch({ matchName: matchName.trim(), isHome: isHome as boolean });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgCard} />

      {/* ── En-tête ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau match</Text>
        <Text style={styles.headerSubtitle}>Configuration du match</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Nom du match ── */}
          <Text style={styles.label}>NOM DU MATCH</Text>
          <TextInput
            style={styles.input}
            value={matchName}
            onChangeText={setMatchName}
            placeholder="ex : VSL vs Grenoble"
            placeholderTextColor={COLORS.textDark}
            autoCorrect={false}
            returnKeyType="done"
          />

          {/* ── Domicile / Extérieur ── */}
          <Text style={[styles.label, { marginTop: SPACING.xl }]}>LIEU</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isHome === true && styles.toggleBtnActive]}
              onPress={() => setIsHome(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleIcon}>🏠</Text>
              <Text style={[styles.toggleText, isHome === true && styles.toggleTextActive]}>
                Domicile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, isHome === false && styles.toggleBtnActiveAway]}
              onPress={() => setIsHome(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleIcon}>✈️</Text>
              <Text style={[styles.toggleText, isHome === false && styles.toggleTextActive]}>
                Extérieur
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Bouton continuer ── */}
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={canContinue ? 0.7 : 1}
          >
            <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
              Sélectionner l'équipe →
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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

  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },

  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },

  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
  },
  toggleBtnActive: {
    backgroundColor: `${COLORS.green}18`,
    borderColor: `${COLORS.green}66`,
  },
  toggleBtnActiveAway: {
    backgroundColor: `${COLORS.blue}18`,
    borderColor: `${COLORS.blue}66`,
  },
  toggleIcon: {
    fontSize: 28,
  },
  toggleText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: COLORS.textPrimary,
  },

  continueBtn: {
    backgroundColor: COLORS.yellow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  continueBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    color: COLORS.bgApp,
  },
  continueBtnTextDisabled: {
    color: COLORS.textDark,
  },
});

export default MatchSetupScreen;