// ─────────────────────────────────────────────
//  COMPOSANT : BANNIÈRE DE FIN DE SET
//
//  S'affiche automatiquement quand un set est
//  terminé (25 pts, 2 pts d'écart).
//  Affiche le résultat et un bouton pour
//  démarrer le set suivant.
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import EndMatchModal from './EndMatchModal';

const SetBanner = () => {
  const { state, actions } = useMatch();
  const { setBannerVisible, setWinner, setNum, myScore, oppScore, mySets, oppSets } = state;

  const [endModalVisible, setEndModalVisible] = useState(false);

  // Ne rien rendre si la bannière n'est pas visible
  if (!setBannerVisible) return null;

  const won         = setWinner === 'me';
  const matchOver   = mySets === 3 || oppSets === 3;
  const titleColor  = won ? COLORS.greenLight : COLORS.redLight;
  const borderColor = won ? `${COLORS.green}55` : `${COLORS.red}44`;
  const titleText   = won ? `Set ${setNum} remporté !` : `Set ${setNum} perdu`;
  const subtitleText = `${myScore} – ${oppScore}  ·  Sets : ${mySets} – ${oppSets}`;

  return (
    <View style={[styles.container, { borderColor }]}>

      <Text style={[styles.title, { color: titleColor }]}>{titleText}</Text>
      <Text style={styles.subtitle}>{subtitleText}</Text>

      {matchOver ? (
        <TouchableOpacity style={[styles.btn, styles.btnEnd]} onPress={() => setEndModalVisible(true)}>
          <Text style={styles.btnText}>Terminer le match</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={actions.closeSetBanner}>
          <Text style={styles.btnText}>Démarrer le set suivant</Text>
        </TouchableOpacity>
      )}

      <EndMatchModal visible={endModalVisible} onClose={() => setEndModalVisible(false)} />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
  },

  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },

  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },

  btn: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    paddingVertical: 9,
    paddingHorizontal: SPACING.xxl + SPACING.sm,
  },
  btnEnd: {
    backgroundColor: COLORS.red,
  },
  btnText: {
    color: '#ffffff',
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
  },
});

export default SetBanner;