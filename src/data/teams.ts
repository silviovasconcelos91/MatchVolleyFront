import type { TeamDto } from './openapi/types.gen';
import { getAllTeams } from './openapi/sdk.gen';

// Re-export TeamDto under the legacy name so callers keep working unchanged.
// We widen optional fields back to required to preserve the existing contract.
export type Team = {
  id: number;
  name: string;
  city: string;
  logoColor: string;
  players: Array<{
    id: number;
    name: string;
    roles: Array<'R4' | 'Central' | 'Passeur' | 'Pointu' | 'Libero'>;
    numero: number;
    age: number;
    taille: string;
  }>;
};

// Thin wrapper that keeps the Promise<Team[]> contract expected by all callers
// (TeamContext, StatsTeamSelectionScreen, etc.).
// getAllTeams() returns { data, error } — we unwrap it here.
export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await getAllTeams();
  if (error || !data) throw new Error('Failed to fetch teams');

  return (data.data ?? []).map((dto: TeamDto): Team => ({
    id: dto.id ?? 0,
    name: dto.name ?? '',
    city: dto.city ?? '',
    logoColor: dto.logoColor ?? '',
    players: (dto.players ?? []).map(p => ({
      id: p.id ?? 0,
      name: p.name ?? '',
      roles: p.roles ?? [],
      numero: p.numero ?? 0,
      age: p.age ?? 0,
      taille: p.taille ?? '',
    })),
  }));
}
