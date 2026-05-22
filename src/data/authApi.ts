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

async function parseOrThrow<T>(res: Response, reqBody: object): Promise<T> {
  const body: ApiWrapper<T> = await res.json() as ApiWrapper<T>;
  if (!res.ok) {
    throw new Error(body.message ?? 'Erreur inconnue');
  }
  return body.data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const url     = `${API_URL}/api/v1/auth:login`;
  const reqBody = { email, password };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  return parseOrThrow<AuthResponse>(res, reqBody);
}

export async function apiRegister(
  email: string,
  pseudo: string,
  password: string,
): Promise<UserResponse> {
  const url     = `${API_URL}/api/v1/auth:register`;
  const reqBody = { email, pseudo, password };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  return parseOrThrow<UserResponse>(res, reqBody);
}

export async function apiRefreshTokens(refreshToken: string): Promise<AuthResponse> {
  const url     = `${API_URL}/api/v1/auth:refresh`;
  const reqBody = { refreshToken };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  return parseOrThrow<AuthResponse>(res, reqBody);
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth:logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
}
