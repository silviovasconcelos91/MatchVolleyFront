import { Alert } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

// Native destructive confirmation. Web counterpart: confirmAction.web.ts.
export const confirmAction = ({ title, message, confirmLabel, onConfirm }: ConfirmOptions): void => {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};
