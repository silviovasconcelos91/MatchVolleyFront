import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { useTeam } from '../context/TeamContext';
import { buildMatchResult, sendMatchResult } from '../data/matchApi';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import ModalBase, { modalSharedStyles } from './ModalBase';

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
        matchActions.resetMatch();
        teamActions.clearTeam();
      })
      .catch(() => {
        setSending(false);
        setError('Échec de l\'envoi. Vérifier la connexion et réessayer.');
      });
  }, [selectedTeam, matchState, matchActions, teamActions]);

  const handleClose = useCallback(() => {
    if (sending) return;
    setError(null);
    onClose();
  }, [sending, onClose]);

  return (
    <ModalBase visible={visible} title="Terminer le match ?" onClose={handleClose}>

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

      {error !== null && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {sending ? (
        <View style={styles.sendingRow}>
          <ActivityIndicator color={COLORS.blue} size="small" />
          <Text style={styles.sendingText}>Envoi en cours...</Text>
        </View>
      ) : (
        <View style={modalSharedStyles.actions}>
          <TouchableOpacity style={modalSharedStyles.btnCancel} onPress={handleClose}>
            <Text style={modalSharedStyles.btnCancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
            <Text style={styles.btnConfirmText}>
              {error !== null ? 'Réessayer' : 'Envoyer et terminer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </ModalBase>
  );
};

const styles = StyleSheet.create({
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
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.red,
    textAlign: 'center',
  },
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
