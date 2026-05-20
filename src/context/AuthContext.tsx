import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiLogin, apiLogout, apiRefreshTokens, apiRegister } from '../data/authApi';
import { tokenStore, SECURE_ACCESS_KEY, SECURE_REFRESH_KEY } from '../data/tokenStore';

type AuthState = {
  isAuthenticated: boolean;
  loading: boolean;
};

type AuthAction =
  | { type: 'AUTHENTICATED' }
  | { type: 'UNAUTHENTICATED' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTHENTICATED':
      return { isAuthenticated: true, loading: false };
    case 'UNAUTHENTICATED':
      return { isAuthenticated: false, loading: false };
  }
}

type AuthContextValue = {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, pseudo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    loading: true,
  });

  const logout = useCallback(async (): Promise<void> => {
    const { refreshToken } = tokenStore.getTokens();
    if (refreshToken) {
      apiLogout(refreshToken);
    }
    tokenStore.clearTokens();
    await SecureStore.deleteItemAsync(SECURE_ACCESS_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY).catch(() => {});
    dispatch({ type: 'UNAUTHENTICATED' });
  }, []);

  useEffect(() => {
    tokenStore.setOnUnauthenticated(() => dispatch({ type: 'UNAUTHENTICATED' }));

    async function restoreSession(): Promise<void> {
      const access = await SecureStore.getItemAsync(SECURE_ACCESS_KEY);
      const refresh = await SecureStore.getItemAsync(SECURE_REFRESH_KEY);

      if (!access || !refresh) {
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      try {
        const tokens = await apiRefreshTokens(refresh);
        tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
        await SecureStore.setItemAsync(SECURE_ACCESS_KEY, tokens.accessToken);
        await SecureStore.setItemAsync(SECURE_REFRESH_KEY, tokens.refreshToken);
        dispatch({ type: 'AUTHENTICATED' });
      } catch {
        await SecureStore.deleteItemAsync(SECURE_ACCESS_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY).catch(() => {});
        dispatch({ type: 'UNAUTHENTICATED' });
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const tokens = await apiLogin(email, password);
    tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
    await SecureStore.setItemAsync(SECURE_ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(SECURE_REFRESH_KEY, tokens.refreshToken);
    dispatch({ type: 'AUTHENTICATED' });
  }, []);

  const register = useCallback(async (
    email: string,
    pseudo: string,
    password: string,
  ): Promise<void> => {
    await apiRegister(email, pseudo, password);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
