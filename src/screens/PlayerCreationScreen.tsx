import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTeam } from '../context/TeamContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { API_URL } from '../data/api';

type Props = {
  onClose: () => void;
  defaultTeamId?: number;
};

const PlayerCreationScreen = ({ onClose, defaultTeamId }: Props) => {
  const { state: teamState, actions: teamActions } = useTeam();
  const { teams } = teamState;

  const [name,    setName]    = useState('');
  const [numero,  setNumero]  = useState('');
  const [age,     setAge]     = useState('');
  const [taille,  setTaille]  = useState('');
  const [teamId,  setTeamId]  = useState<number | null>(
    defaultTeamId ?? (teams.length === 1 ? teams[0].id : null)
  );

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = name.trim().length > 0 && numero.trim().length > 0 && teamId !== null;

  const handleSubmit = async () => {
    if (!canSubmit || teamId === null) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          name:   name.trim(),
          numero: Number(numero),
          age:    age ? Number(age) : null,
          taille: taille.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess(true);
      teamActions.reload();
    } catch {
      setError('Impossible de créer le joueur. Vérifier la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setName('');
    setNumero('');
    setAge('');
    setTaille('');
    setSuccess(false);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nouveau joueur</Text>
        </View>

        {/* ── Succès ── */}
        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ Joueur créé avec succès</Text>
            <View style={styles.successActions}>
              <TouchableOpacity style={styles.btnSuccess} onPress={handleAddAnother}>
                <Text style={styles.btnSuccessText}>Ajouter un autre</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnBack} onPress={onClose}>
                <Text style={styles.btnBackText}>Retour</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!success && (
          <>
            {/* ── Sélection équipe ── */}
            <Text style={styles.sectionLabel}>ÉQUIPE</Text>
            <View style={styles.teamList}>
              {teams.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.teamChip, teamId === t.id && styles.teamChipActive]}
                  onPress={() => setTeamId(t.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.teamDot, { backgroundColor: t.logoColor }]} />
                  <Text style={[styles.teamChipText, teamId === t.id && styles.teamChipTextActive]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Champs ── */}
            <Text style={styles.sectionLabel}>INFORMATIONS</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom complet *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="ex: Léa Martin"
                placeholderTextColor={COLORS.textDark}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Numéro *</Text>
                <TextInput
                  style={styles.input}
                  value={numero}
                  onChangeText={setNumero}
                  placeholder="ex: 7"
                  placeholderTextColor={COLORS.textDark}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Âge</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="ex: 23"
                  placeholderTextColor={COLORS.textDark}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Taille</Text>
              <TextInput
                style={styles.input}
                value={taille}
                onChangeText={setTaille}
                placeholder="ex: 1m75"
                placeholderTextColor={COLORS.textDark}
                autoCapitalize="none"
              />
            </View>

            {/* ── Erreur ── */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Bouton créer ── */}
            <TouchableOpacity
              style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {canSubmit ? 'Créer le joueur' : 'Remplir nom + numéro + équipe'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  header: {
    marginBottom: SPACING.xl,
  },
  backBtn: {
    marginBottom: SPACING.sm,
  },
  backBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.blue,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Équipe
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  teamChipActive: {
    borderColor: COLORS.blue + '66',
    backgroundColor: COLORS.blue + '18',
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamChipText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  teamChipTextActive: {
    color: COLORS.blue,
    fontWeight: '500',
  },

  // Champs
  field: {
    marginBottom: SPACING.md,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },

  // Erreur
  errorBox: {
    backgroundColor: `${COLORS.red}18`,
    borderWidth: 1,
    borderColor: `${COLORS.red}44`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.redLight,
  },

  // Succès
  successBox: {
    backgroundColor: `${COLORS.green}18`,
    borderWidth: 1,
    borderColor: `${COLORS.green}44`,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  successText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.greenLight,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  successActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btnSuccess: {
    flex: 1,
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  btnSuccessText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.greenLight,
    fontWeight: '500',
  },
  btnBack: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  btnBackText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  // Bouton créer
  submitBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.lg,
    padding: 13,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
  },
});

export default PlayerCreationScreen;
