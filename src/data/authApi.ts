import { API_URL } from './api';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type UserResponse = {
  id: string;
  email: string;
  pseudo: string;
};

type ApiWrapper<T> = {
  data: T;
  message: string;
  status: number;
};

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body: ApiWrapper<T> = await res.json() as ApiWrapper<T>;
  if (!res.ok) {
    throw new Error(body.message ?? 'Erreur inconnue');
  }
  return body.data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth:login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow<AuthResponse>(res);
}

export async function apiRegister(
  email: string,
  pseudo: string,
  password: string,
): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth:register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pseudo, password }),
  });
  return parseOrThrow<UserResponse>(res);
}

export async function apiRefreshTokens(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth:refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseOrThrow<AuthResponse>(res);
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth:logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
}
