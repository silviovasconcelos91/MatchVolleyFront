import Constants from 'expo-constants';

export const API_URL = (() => {
  const configured: string | undefined = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  const hostUri: string | undefined = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080`;
  }

  return 'http://192.168.1.169:8080';
})();
