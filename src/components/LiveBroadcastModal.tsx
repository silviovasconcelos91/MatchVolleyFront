// ─────────────────────────────────────────────
//  MODAL : DIFFUSION EN DIRECT
//
//  Démarre / arrête la diffusion publique du match (overlay OBS / Twitch)
//  et affiche le code à 6 caractères + l'URL publique à partager.
// ─────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLiveBroadcast } from '../context/LiveBroadcastContext';
import type { SyncStatus } from '../hooks/useLiveBroadcastSync';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import ModalBase, { modalSharedStyles } from './ModalBase';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const SYNC_STATUS_COLOR: Record<SyncStatus, string> = {
  synced:  COLORS.green,
  pending: COLORS.yellow,
  offline: COLORS.red,
  error:   COLORS.red,
};

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  synced:  'Synchronisé',
  pending: 'Envoi en attente…',
  offline: 'Hors ligne — nouvel essai automatique',
  error:   'Erreur d\'envoi — données refusées',
};

const LiveBroadcastModal = ({ visible, onClose }: Props) => {
  const { session, status, error, syncStatus, actions } = useLiveBroadcast();

  const [showNames, setShowNames] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = useCallback(() => {
    if (!session) return;
    Clipboard.setStringAsync(session.publicUrl)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [session]);

  const handleStart = useCallback(() => {
    void actions.start(showNames);
  }, [actions, showNames]);

  const handleToggleNames = useCallback((value: boolean) => {
    void actions.setShowPlayerNames(value);
  }, [actions]);

  const handleStop = useCallback(() => {
    void actions.stop();
  }, [actions]);

  const busy = status === 'starting' || status === 'stopping';

  return (
    <ModalBase visible={visible} title="Diffusion en direct" onClose={onClose}>

      {session ? (
        <>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>CODE DU MATCH</Text>
            <Text style={styles.code} selectable>{session.code}</Text>
            <Text style={styles.url} selectable numberOfLines={1}>{session.publicUrl}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Text style={styles.copyBtnText}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: SYNC_STATUS_COLOR[syncStatus] }]} />
            <Text style={styles.syncText}>{SYNC_STATUS_LABEL[syncStatus]}</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Afficher les noms des joueurs</Text>
            <Switch
              value={session.showPlayerNames}
              onValueChange={handleToggleNames}
              disabled={busy}
              trackColor={{ true: COLORS.green, false: COLORS.border }}
            />
          </View>

          <Text style={styles.hint}>
            OBS : source navigateur avec l'URL + <Text style={styles.hintCode}>?bg=transparent</Text>
            {'  ·  '}<Text style={styles.hintCode}>view=score</Text> / <Text style={styles.hintCode}>graph</Text> / <Text style={styles.hintCode}>full</Text>
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.message}>
            Publie le score en direct sur une page publique (overlay OBS / Twitch),
            accessible avec un code à 6 caractères.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Afficher les noms des joueurs</Text>
            <Switch
              value={showNames}
              onValueChange={setShowNames}
              disabled={busy}
              trackColor={{ true: COLORS.green, false: COLORS.border }}
            />
          </View>
          {!showNames && (
            <Text style={styles.hint}>Par défaut, seuls les numéros de maillot sont visibles.</Text>
          )}
        </>
      )}

      {error !== null && <Text style={styles.errorText}>{error}</Text>}

      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={COLORS.blue} size="small" />
          <Text style={styles.busyText}>{status === 'starting' ? 'Démarrage…' : 'Arrêt…'}</Text>
        </View>
      ) : (
        <View style={modalSharedStyles.actions}>
          <TouchableOpacity style={modalSharedStyles.btnCancel} onPress={onClose}>
            <Text style={modalSharedStyles.btnCancelText}>Fermer</Text>
          </TouchableOpacity>
          {session ? (
            <TouchableOpacity style={styles.btnStop} onPress={handleStop}>
              <Text style={styles.btnStopText}>Arrêter la diffusion</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnStart} onPress={handleStart}>
              <Text style={styles.btnStartText}>Démarrer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </ModalBase>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  codeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.bgApp,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  codeLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  code: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 6,
  },
  url: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  copyBtn: {
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: `${COLORS.blue}55`,
    backgroundColor: `${COLORS.blue}18`,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  copyBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.blue,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  syncText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  hintCode: {
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.red,
    textAlign: 'center',
  },
  busyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  busyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
  btnStart: {
    flex: 2,
    backgroundColor: `${COLORS.green}22`,
    borderWidth: 1,
    borderColor: `${COLORS.green}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnStartText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.greenLight,
    fontWeight: '500',
  },
  btnStop: {
    flex: 2,
    backgroundColor: `${COLORS.red}22`,
    borderWidth: 1,
    borderColor: `${COLORS.red}55`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  btnStopText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.redLight,
    fontWeight: '500',
  },
});

export default LiveBroadcastModal;
