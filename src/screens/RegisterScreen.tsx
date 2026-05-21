import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../constants/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  onSwitchToLogin: () => void;
};

export default function RegisterScreen({ onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(): Promise<void> {
    if (!email.trim() || !pseudo.trim() || !password.trim()) {
      setError('Tous les champs sont requis');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Format d\'email invalide');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), pseudo.trim(), password);
      onSwitchToLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.appTitle}>MatchVolley</Text>
        <Text style={styles.subtitle}>Créer un compte</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="exemple@email.com"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Pseudo</Text>
          <TextInput
            style={styles.input}
            value={pseudo}
            onChangeText={setPseudo}
            autoCapitalize="none"
            placeholder="monpseudo"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {showPassword ? 'Cacher' : 'Voir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {error !== null && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Créer mon compte</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onSwitchToLogin} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Déjà un compte ?{' '}
            <Text style={styles.switchHighlight}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.lg,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  field: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
  },
  toggleBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  toggleText: {
    color: COLORS.blue,
    fontSize: FONT_SIZE.lg,
  },
  errorBanner: {
    backgroundColor: '#2a0f0f',
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: {
    color: COLORS.redLight,
    fontSize: FONT_SIZE.lg,
  },
  button: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
  },
  switchLink: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  switchText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  switchHighlight: {
    color: COLORS.blue,
    fontWeight: '600',
  },
});
