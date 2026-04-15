// ─────────────────────────────────────────────
//  COMPOSANT : AVATAR JOUEUR
//
//  Cercle avec les initiales du joueur.
//  Réutilisé dans le terrain, les stats,
//  le roster et les remplacements.
//
//  Props :
//    name   : string  – nom complet du joueur
//    color  : string  – couleur principale
//    size   : number  – taille du cercle (défaut: 34)
//    fontSize: number – taille des initiales (défaut: auto)
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PlayerAvatarProps = {
  name: string;
  color: string;
  size?: number;
  fontSize?: number;
};

// Extrait les initiales du prénom et du nom
// Ex: "Marie Leroy" → "ML"
const getInitials = (name: string): string =>
  name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();

const PlayerAvatar = ({ name, color, size = 34, fontSize }: PlayerAvatarProps) => {
  // Calculer la taille de police automatiquement si non fournie
  const computedFontSize = fontSize || Math.round(size * 0.32);

  return (
    <View
      style={[
        styles.avatar,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,       // parfaitement circulaire
          backgroundColor: `${color}22`,  // fond très transparent
          borderColor:     color,
          borderWidth:     2,
        },
      ]}
    >
      <Text style={[styles.initials, { color, fontSize: computedFontSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '500',
  },
});

export default PlayerAvatar;