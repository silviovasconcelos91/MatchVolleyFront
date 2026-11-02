import * as SecureStore from 'expo-secure-store';

// Native persistent storage (iOS Keychain / Android Keystore).
// Web counterpart: secureStorage.web.ts (resolved automatically by Metro).
export const secureStorage = {
  getItem: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key).catch(() => null),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value).catch(() => {}),
  deleteItem: (key: string): Promise<void> =>
    SecureStore.deleteItemAsync(key).catch(() => {}),
};
