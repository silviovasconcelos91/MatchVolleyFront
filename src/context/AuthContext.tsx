import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { apiLogin, apiLogout, apiRefreshTokens, apiRegister } from '../data/authApi';
import { tokenStore } from '../data/tokenStore';

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
    await tokenStore.clearPersisted();
    dispatch({ type: 'UNAUTHENTICATED' });
  }, []);

  useEffect(() => {
    tokenStore.setOnUnauthenticated(() => dispatch({ type: 'UNAUTHENTICATED' }));

    async function restoreSession(): Promise<void> {
      const { accessToken: access, refreshToken: refresh } = await tokenStore.loadPersisted();

      if (!access || !refresh) {
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      try {
        const tokens = await apiRefreshTokens(refresh);
        await tokenStore.persistTokens(tokens.accessToken, tokens.refreshToken);
        dispatch({ type: 'AUTHENTICATED' });
      } catch {
        await tokenStore.clearPersisted();
        dispatch({ type: 'UNAUTHENTICATED' });
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const tokens = await apiLogin(email, password);
    await tokenStore.persistTokens(tokens.accessToken, tokens.refreshToken);
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
