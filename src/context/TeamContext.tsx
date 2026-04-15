// ─────────────────────────────────────────────
//  CONTEXTE ÉQUIPES
//
//  Gère :
//    - le chargement des équipes depuis l'API
//    - la sélection de l'équipe active
//    - les états loading / error / retry
//
//  Usage : const { state, actions } = useTeam();
// ─────────────────────────────────────────────

import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { fetchTeams, Team } from '../data/teams';

// ── Types d'actions du reducer ──
const TEAM_ACTION_TYPES = {
  FETCH_START:   'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR:   'FETCH_ERROR',
  SELECT_TEAM:   'SELECT_TEAM',
  CLEAR_TEAM:    'CLEAR_TEAM',
} as const;

// ── État ──
type TeamState = {
  teams: Team[];
  selectedTeam: Team | null;
  loading: boolean;
  error: string | null;
};

// ── Actions du reducer ──
type TeamAction =
  | { type: typeof TEAM_ACTION_TYPES.FETCH_START }
  | { type: typeof TEAM_ACTION_TYPES.FETCH_SUCCESS; payload: Team[] }
  | { type: typeof TEAM_ACTION_TYPES.FETCH_ERROR;   payload: string }
  | { type: typeof TEAM_ACTION_TYPES.SELECT_TEAM;   payload: number }
  | { type: typeof TEAM_ACTION_TYPES.CLEAR_TEAM };

// ── Valeur exposée par le contexte ──
type TeamContextValue = {
  state: TeamState;
  actions: {
    selectTeam: (teamId: number) => void;
    clearTeam:  () => void;
    reload:     () => void;
  };
};

// ── État initial ──
const initialState: TeamState = {
  teams:        [],
  selectedTeam: null,
  loading:      true,
  error:        null,
};

// ── Reducer ──
function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {

    case TEAM_ACTION_TYPES.FETCH_START:
      return { ...state, loading: true, error: null };

    case TEAM_ACTION_TYPES.FETCH_SUCCESS:
      return { ...state, loading: false, teams: action.payload };

    case TEAM_ACTION_TYPES.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload };

    case TEAM_ACTION_TYPES.SELECT_TEAM: {
      const team = state.teams.find(t => t.id === action.payload);
      if (!team) return state;
      return { ...state, selectedTeam: team };
    }

    case TEAM_ACTION_TYPES.CLEAR_TEAM:
      return { ...state, selectedTeam: null };

    default:
      return state;
  }
}

// ── Création du contexte ──
const TeamContext = createContext<TeamContextValue | null>(null);

// ── Provider ──
export const TeamProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(teamReducer, initialState);

  // reloadKey est incrémenté par reload() pour déclencher un nouveau fetch
  const [reloadKey, setReloadKey] = useState(0);

  // ── Chargement des équipes ──
  // Se déclenche au montage et à chaque appel de reload()
  useEffect(() => {
    dispatch({ type: TEAM_ACTION_TYPES.FETCH_START });
    fetchTeams()
      .then(teams => dispatch({ type: TEAM_ACTION_TYPES.FETCH_SUCCESS, payload: teams }))
      .catch(() => dispatch({
        type:    TEAM_ACTION_TYPES.FETCH_ERROR,
        payload: 'Impossible de charger les équipes.',
      }));
  }, [reloadKey]);

  const actions: TeamContextValue['actions'] = {
    selectTeam: (teamId) => dispatch({ type: TEAM_ACTION_TYPES.SELECT_TEAM, payload: teamId }),
    clearTeam:  ()       => dispatch({ type: TEAM_ACTION_TYPES.CLEAR_TEAM }),
    reload:     ()       => setReloadKey(k => k + 1),
  };

  return (
    <TeamContext.Provider value={{ state, actions }}>
      {children}
    </TeamContext.Provider>
  );
};

// ── Hook pour consommer le contexte ──
// Usage : const { state, actions } = useTeam();
export const useTeam = (): TeamContextValue => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam doit être utilisé dans un TeamProvider');
  return context;
};
