import type { Player } from './players';
import { API_URL, apiFetch } from './api';

// ── Type équipe ──
export type Team = {
  id: number;
  name: string;
  city: string;
  logoColor: string;
  players: Player[];
};

type ApiResponse<T> = {
  data: T;
  message: string;
  status: number;
};

export const fetchTeams = async (): Promise<Team[]> => {
  const url = `${API_URL}/api/v1/teams`;
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as ApiResponse<Team[]>;
  return body.data;
};