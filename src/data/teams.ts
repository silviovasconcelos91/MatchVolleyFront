import type { Player } from './players';
import { API_URL } from './api';

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
  console.log('[fetchTeams] GET', url);
  const res = await fetch(url);
  console.log('[fetchTeams] status', res.status);
  if (!res.ok) {
    const text = await res.text();
    console.error('[fetchTeams] error body', text);
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as ApiResponse<Team[]>;
  console.log('[fetchTeams] teams count', body.data?.length);
  return body.data;
};