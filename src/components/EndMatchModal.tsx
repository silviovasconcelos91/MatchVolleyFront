// ─────────────────────────────────────────────
//  COMPOSANT : MODAL FIN DE MATCH
//
//  Affiché quand le coach appuie sur "Terminer".
//  Montre un résumé du match et permet d'envoyer
//  les statistiques au backend.
//
//  Flux :
//    1. Coach tape "Terminer le match"
//    2. Ce modal s'ouvre avec le résumé
//    3. Coach confirme → envoi API
//    4. Succès → resetMatch() + clearTeam()
//       Erreur → message avec bouton réessayer
// ─────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import { buildMatchResult, sendMatchResult } from '../data/matchApi';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const EndMatchModal = ({ visible, onClose }: Props) => {
  const { state: matchState, actions: matchActions } = useMatch();
  const { state: teamState, actions: teamActions }   = useTeam();

  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const { mySets, oppSets, matchHistory } = matchState;
  const selectedTeam = teamState.selectedTeam;

  const handleConfirm = useCallback(() => {
    if (!selectedTeam) return;

    const payload = buildMatchResult(matchState, selectedTeam);

    setSending(true);
    setError(null);

    sendMatchResult(payload)
      .then(() => {
        // Succès : réinitialiser et retourner à la sélection d'équipe
        matchActions.resetMatch();
        teamActions.clearTeam();
      })
      .catch(() => {
        setSending(false);
        setError('Échec de l\'envoi. Vérifier la connexion et réessayer.');
      });
  }, [selectedTeam, matchState, matchActions, teamActions]);

  const handleClose = useCallback(() => {
    if (sending) return; // bloquer la fermeture pendant l'envoi
    setError(null);
    onClose();
  }, [sending, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* Fond semi-transparent */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        {/* Carte (stopper la propagation du tap) */}
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>

          <Text style={styles.title}>Terminer le match ?</Text>

          {/* ── Résumé du match ── */}
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>RÉSULTAT FINAL</Text>
            <Text style={styles.setsScore}>
              <Text style={styles.mySets}>{mySets}</Text>
              <Text style={styles.dash}> – </Text>
              <Text style={styles.oppSets}>{oppSets}</Text>
            </Text>
            <Text style={styles.summaryDetail}>
              {matchHistory.length} point{matchHistory.length !== 1 ? 's' : ''} joué{matchHistory.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* ── Message d'erreur ── */}
          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* ── Actions ── */}
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator color={COLORS.blue} size="small" />
              <Text style={styles.sendingText}>Envoi en cours...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
                <Text style={styles.btnConfirmText}>
                  {error !== null ? 'Réessayer' : 'Envoyer et terminer'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Résumé
  summary: {
    alignItems: 'center',
    backgroundColor: COLORS.bgApp,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  setsScore: {
    fontSize: FONT_SIZE.score,
    fontWeight: '700',
    lineHeight: FONT_SIZE.score * 1.1,
  },
  mySets: {
    color: COLORS.scoreHome,
  },
  dash: {
    color: COLORS.border,
  },
  oppSets: {
    color: COLORS.scoreAway,
  },
  summaryDetail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  // Erreur
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.red,
    textAlign: 'center',
  },

  // Envoi en cours
  sendingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  sendingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },

  // Boutons
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  btnConfirm: {
    flex: 2,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnConfirmText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.redLight,
    fontWeight: '500',
  },
});

export default EndMatchModal;
