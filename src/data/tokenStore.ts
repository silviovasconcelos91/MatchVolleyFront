export const SECURE_ACCESS_KEY = 'MATCH_ACCESS_TOKEN';
export const SECURE_REFRESH_KEY = 'MATCH_REFRESH_TOKEN';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthenticated: (() => void) | null = null;

export const tokenStore = {
  getTokens: (): { accessToken: string | null; refreshToken: string | null } => ({
    accessToken: _accessToken,
    refreshToken: _refreshToken,
  }),
  setTokens: (access: string, refresh: string): void => {
    _accessToken = access;
    _refreshToken = refresh;
  },
  clearTokens: (): void => {
    _accessToken = null;
    _refreshToken = null;
  },
  setOnUnauthenticated: (cb: () => void): void => {
    _onUnauthenticated = cb;
  },
  triggerUnauthenticated: (): void => {
    _onUnauthenticated?.();
  },
};
