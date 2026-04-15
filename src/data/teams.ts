import Constants from 'expo-constants';
import type { Player } from './players';

// ── Type équipe ──
export type Team = {
  id: number;
  name: string;
  city: string;
  logoColor: string;
  players: Player[];
};

// In dev, derive the backend host from the Expo dev server host so the app
// works on physical devices (where "localhost" resolves to the device itself).
// Set API_URL in your environment to override (e.g. for staging/prod).
const getApiUrl = (): string => {
  const configured: string | undefined = Constants.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  const hostUri: string | undefined = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8080`;
  }

  return 'http://localhost:8080';
};

const API_URL = getApiUrl();

type ApiResponse<T> = {
  data: T;
  message: string;
  status: number;
};

export const fetchTeams = async (): Promise<Team[]> => {
  const res = await fetch(`${API_URL}/api/v1/teams`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as ApiResponse<Team[]>;
  return body.data;
};