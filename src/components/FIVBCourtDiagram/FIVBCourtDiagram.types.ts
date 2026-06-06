import type { AceZone, AttackZone } from '../../data/liveStatsAnalysis';

export type FIVBCourtDiagramProps =
  | { mode: 'attacks'; data: AttackZone[] }
  | { mode: 'aces';    data: AceZone[]    };
