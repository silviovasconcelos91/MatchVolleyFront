import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const configured: string | undefined = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  // Expo Go local dev: derive host from Metro bundler URI
  const hostUri: string | undefined = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(':')[0]}:8080`;

  return 'https://matchvolley-production.up.railway.app';
}

export const API_URL = resolveApiUrl();

export const pingBackend = (): void => {
  apiFetch(`${API_URL}/api/v1/teams`).catch(() => {});
};

export const apiFetch = (url: string, options?: RequestInit): Promise<Response> => {
  return fetch(url, options).then(res => {
    return res;
  });
};
