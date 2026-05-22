import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { tokenStore, SECURE_ACCESS_KEY, SECURE_REFRESH_KEY } from './tokenStore';

function resolveApiUrl(): string {
  const configured: string | undefined = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  const hostUri: string | undefined = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(':')[0]}:8080`;

  return 'https://volleymatch-production.up.railway.app';
}

export const API_URL = resolveApiUrl();

export const pingBackend = (): void => {
  apiFetch(`${API_URL}/api/v1/teams`).catch(() => {});
};

type RefreshBody = { data: { accessToken: string; refreshToken: string } };

async function doRefreshInner(): Promise<boolean> {
  const { refreshToken } = tokenStore.getTokens();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth:refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = await res.json() as RefreshBody;
    tokenStore.setTokens(body.data.accessToken, body.data.refreshToken);
    await SecureStore.setItemAsync(SECURE_ACCESS_KEY, body.data.accessToken).catch(() => {});
    await SecureStore.setItemAsync(SECURE_REFRESH_KEY, body.data.refreshToken).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

let _refreshPromise: Promise<boolean> | null = null;

export async function doRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = doRefreshInner().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

export const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const { accessToken } = tokenStore.getTokens();

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status !== 401) return res;

  const refreshed = await doRefresh();
  if (refreshed) {
    const { accessToken: newToken } = tokenStore.getTokens();
    const retryHeaders: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
      ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
    };
    return fetch(url, { ...options, headers: retryHeaders });
  }

  tokenStore.clearTokens();
  await SecureStore.deleteItemAsync(SECURE_ACCESS_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY).catch(() => {});
  tokenStore.triggerUnauthenticated();
  return res;
};
