import { secureStorage } from './secureStorage';

const ACCESS_KEY  = 'MATCH_ACCESS_TOKEN';
const REFRESH_KEY = 'MATCH_REFRESH_TOKEN';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthenticated: (() => void) | null = null;

export const tokenStore = {
  getTokens: (): { accessToken: string | null; refreshToken: string | null } => ({
    accessToken: _accessToken,
    refreshToken: _refreshToken,
  }),
  // Set in-memory tokens and persist them.
  persistTokens: async (access: string, refresh: string): Promise<void> => {
    _accessToken = access;
    _refreshToken = refresh;
    await Promise.all([
      secureStorage.setItem(ACCESS_KEY, access),
      secureStorage.setItem(REFRESH_KEY, refresh),
    ]);
  },
  // Read persisted tokens from storage without touching in-memory state.
  loadPersisted: async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.getItem(ACCESS_KEY),
      secureStorage.getItem(REFRESH_KEY),
    ]);
    return { accessToken, refreshToken };
  },
  // Clear in-memory tokens and remove them from storage.
  clearPersisted: async (): Promise<void> => {
    _accessToken = null;
    _refreshToken = null;
    await Promise.all([
      secureStorage.deleteItem(ACCESS_KEY),
      secureStorage.deleteItem(REFRESH_KEY),
    ]);
  },
  setOnUnauthenticated: (cb: () => void): void => {
    _onUnauthenticated = cb;
  },
  triggerUnauthenticated: (): void => {
    _onUnauthenticated?.();
  },
};
