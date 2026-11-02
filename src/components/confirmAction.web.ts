import type { ConfirmOptions } from './confirmAction';

// react-native-web's Alert.alert is a no-op → use the browser confirm dialog.
export const confirmAction = ({ title, message, onConfirm }: ConfirmOptions): void => {
  if (window.confirm(`${title}\n\n${message}`)) onConfirm();
};
