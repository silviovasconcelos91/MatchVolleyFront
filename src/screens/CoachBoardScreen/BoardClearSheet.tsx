// Board entraîneur : feuille « Effacer » (dessins / positions / tout).

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { styles } from './CoachBoardScreen.styles';

export type ClearChoice = 'strokes' | 'positions' | 'all';

type Props = {
  strokeCount: number;
  onPick: (choice: ClearChoice) => void;
  onCancel: () => void;
};

type OptionDef = {
  choice: ClearChoice;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  title: string;
  sub: string;
  danger?: boolean;
};

const OPTIONS: OptionDef[] = [
  { choice: 'strokes',   icon: 'pencil-off',     iconColor: COLORS.yellow,   title: 'Effacer les dessins',   sub: 'Les joueurs restent où ils sont' },
  { choice: 'positions', icon: 'restore',        iconColor: COLORS.blue,     title: 'Replacer les joueurs',  sub: 'Retour aux positions du match, dessins conservés' },
  { choice: 'all',       icon: 'delete-outline', iconColor: COLORS.redLight, title: 'Tout réinitialiser',    sub: 'Dessins + positions', danger: true },
];

const BoardClearSheet = ({ strokeCount, onPick, onCancel }: Props) => (
  <View style={styles.scrim}>
    <TouchableOpacity style={styles.scrimTap} onPress={onCancel} activeOpacity={1} accessibilityLabel="Fermer" />
    <View style={styles.sheet} accessibilityViewIsModal>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Effacer le board</Text>
      <Text style={styles.sheetSubtitle}>
        {strokeCount === 0 ? 'Aucun dessin' : `${strokeCount} dessin${strokeCount > 1 ? 's' : ''}`}
      </Text>
      {OPTIONS.map(o => (
        <TouchableOpacity
          key={o.choice}
          style={[styles.option, o.danger && styles.optionDanger]}
          onPress={() => onPick(o.choice)}
          activeOpacity={0.7}
        >
          <View style={styles.optionIcon}>
            <MaterialCommunityIcons name={o.icon} size={20} color={o.iconColor} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, o.danger && styles.actionTextDanger]}>{o.title}</Text>
            <Text style={styles.optionSub}>{o.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.sheetCancel} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.actionText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  </View>
);


export default BoardClearSheet;
