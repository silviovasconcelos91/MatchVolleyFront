import React, { createContext, useContext, useReducer } from 'react';
import { createEmptyStats, Player, ActionKey, PlayerStats, BACK_ROW_POSITIONS } from '../data/players';
import type { PlayerRole } from '../data/players';

export const ACTION_TYPES = {
  // Configuration du match
  SETUP_MATCH:        'SETUP_MATCH',        // définir nom et lieu du match
  CLEAR_MATCH_SETUP:  'CLEAR_MATCH_SETUP',  // effacer le nom/lieu (retour arrière)

  // Roster
  VALIDATE_ROSTER:    'VALIDATE_ROSTER',    // valider la composition d'équipe (sélection)
  ASSIGN_SET_ROLES:   'ASSIGN_SET_ROLES',   // assigner positions et rôles avant chaque set
  RESET_ROSTER:       'RESET_ROSTER',       // réinitialiser la sélection

  // Score et actions joueur
  PLAYER_ACTION:      'PLAYER_ACTION',      // action attribuée à un joueur
  OPP_SCORE:          'OPP_SCORE',          // +1 adversaire (bouton manuel)
  OPP_FAULT:          'OPP_FAULT',          // faute adverse → +1 mon équipe
  UNDO:               'UNDO',               // annuler la dernière action

  // Terrain
  ROTATE:             'ROTATE',             // effectuer une rotation
  LIBERO_SWAP:        'LIBERO_SWAP',        // faire entrer/sortir le libero

  // Substitution
  CONFIRM_SUB:        'CONFIRM_SUB',        // confirmer un remplacement

  // Set
  CLOSE_SET_BANNER:   'CLOSE_SET_BANNER',   // démarrer le set suivant

  // Réinitialisation complète (changement d'équipe)
  RESET_MATCH:        'RESET_MATCH',        // remettre tout l'état à zéro
} as const;

// mine: true → +1 mon équipe / mine: false → +1 adversaire
export const PLAYER_ACTIONS: Record<ActionKey, { label: string; mine: boolean; section: 'points' | 'fautes' }> = {
  pt:      { label: 'Point marqué',    mine: true,  section: 'points' },
  atk:     { label: 'Attaque point',   mine: true,  section: 'points' },
  block:   { label: 'Contre point',    mine: true,  section: 'points' },
  ace:     { label: 'Service ace',     mine: true,  section: 'points' },
  atk_out: { label: 'Attaque out',     mine: false, section: 'fautes' },
  srv_out: { label: 'Service out',     mine: false, section: 'fautes' },
  recv:    { label: 'Réception ratée', mine: false, section: 'fautes' },
};

export type MatchPlayer = {
  id: number;
  name: string;
  tacticalRole: string;  // rôle tactique pour ce set (R4, Central, Passeur, Pointu, Libero)
  numero: number;
  onCourt: boolean;
  pos: number | null;
  stats: PlayerStats;
  roles: PlayerRole[];   // rôles du profil joueur (depuis l'API)
};

export type TrajectoryPoint = {
  x: number;
  y: number;
};

export type SubEntry = {
  outName: string;
  inName: string;
  score: string;
};

export type SetWinner = 'me' | 'opp' | null;

type HistoryEntry =
  | { source: 'player'; playerId: number; actionKey: ActionKey; mine: boolean }
  | { source: 'opp'; mine: false }
  | { source: 'opp_fault'; mine: true };

// history est vidé entre les sets ; matchHistory accumule tout le match.
export type MatchHistoryEvent = {
  index: number;          // numéro séquentiel global (0, 1, 2, ...)
  setNum: number;         // numéro du set dans lequel l'événement s'est produit
  source: 'player' | 'opp' | 'opp_fault';
  playerId?: number;      // uniquement si source === 'player'
  actionKey?: ActionKey;  // uniquement si source === 'player'
  playerRole?: string;    // rôle tactique du joueur au moment de l'action
  mine: boolean;          // true = mon équipe a marqué ce point
  scoreAfter: { my: number; opp: number }; // score du set après ce point
};

export type SetResult = {
  setNum: number;
  myScore: number;
  oppScore: number;
  winner: 'me' | 'opp' | null; // null si le set était en cours à la fin du match
};

export type MatchState = {
  matchName: string | null;   // nom du match (ex: "VSL vs Grenoble")
  isHome: boolean | null;     // true = domicile, false = extérieur
  rosterValidated: boolean;   // true quand l'équipe a été sélectionnée
  setSetupPending: boolean;   // true quand rôles/positions doivent être configurés avant le set
  matchPlayers: MatchPlayer[];
  originalStarterIds: number[];      // IDs des 6 titulaires terrain (hors libero), fixés à la validation
  originalLiberoId: number | null;  // ID du libero désigné au roster (jamais modifié)
  liberoId: number | null;          // ID du libero actif pour le set en cours (null = désactivé)
  liberoReplacedId: number | null;  // ID du joueur actuellement remplacé par le libero
  myScore: number;
  oppScore: number;
  mySets: number;
  oppSets: number;
  setNum: number;
  setBannerVisible: boolean;
  setWinner: SetWinner;
  history: HistoryEntry[];
  trajectory: TrajectoryPoint[];
  subHistory: SubEntry[];
  // outId → inId : joueur sorti → joueur qui l'a remplacé (reset à chaque set)
  substitutionPairs: Record<number, number>;
  // playerId → setNums joués (jamais vidé, accumulé sur tout le match)
  playerSetPresence: Record<number, number[]>;
  matchHistory: MatchHistoryEvent[]; // historique complet inter-sets (jamais vidé)
  setResults: SetResult[];           // résultats des sets terminés
  lastSetStartPositionMap: Record<number, number>; // positionMap du dernier SetSetupScreen confirmé
  setRoles: Record<number, Record<number, string>>; // setNum → playerId → tacticalRole
};

type ValidateRosterPayload = {
  starterIds: number[];
  benchIds: number[];
  liberoId: number | null;
  allPlayers: Player[];
};

type AssignSetRolesPayload = {
  positionMap: Record<number, number>;   // pos (1-6) → playerId
  tacticalRoles: Record<number, string>; // playerId → rôle tactique
  liberoActive: boolean;                 // false = libero joue comme joueur normal ce set
  newLiberoId?: number | null;           // désigner un libero si aucun n'était au roster
};

type MatchAction =
  | { type: typeof ACTION_TYPES.SETUP_MATCH;       payload: { matchName: string; isHome: boolean } }
  | { type: typeof ACTION_TYPES.CLEAR_MATCH_SETUP }
  | { type: typeof ACTION_TYPES.VALIDATE_ROSTER; payload: ValidateRosterPayload }
  | { type: typeof ACTION_TYPES.ASSIGN_SET_ROLES; payload: AssignSetRolesPayload }
  | { type: typeof ACTION_TYPES.RESET_ROSTER }
  | { type: typeof ACTION_TYPES.PLAYER_ACTION; payload: { playerId: number; actionKey: ActionKey } }
  | { type: typeof ACTION_TYPES.OPP_SCORE }
  | { type: typeof ACTION_TYPES.OPP_FAULT }
  | { type: typeof ACTION_TYPES.UNDO }
  | { type: typeof ACTION_TYPES.ROTATE }
  | { type: typeof ACTION_TYPES.LIBERO_SWAP }
  | { type: typeof ACTION_TYPES.CONFIRM_SUB; payload: { outId: number; inId: number } }
  | { type: typeof ACTION_TYPES.CLOSE_SET_BANNER }
  | { type: typeof ACTION_TYPES.RESET_MATCH };

type MatchContextValue = {
  state: MatchState;
  actions: {
    setupMatch:      (payload: { matchName: string; isHome: boolean }) => void;
    clearMatchSetup: () => void;
    validateRoster:  (payload: ValidateRosterPayload) => void;
    assignSetRoles:  (payload: AssignSetRolesPayload) => void;
    resetRoster:     () => void;
    playerAction:    (payload: { playerId: number; actionKey: ActionKey }) => void;
    oppScore:        () => void;
    oppFault:        () => void;
    undo:            () => void;
    rotate:          () => void;
    liberoSwap:      () => void;
    confirmSub:      (payload: { outId: number; inId: number }) => void;
    closeSetBanner:  () => void;
    resetMatch:      () => void;
  };
};

const initialState: MatchState = {
  matchName:           null,
  isHome:              null,
  rosterValidated:     false,
  setSetupPending:     false,
  matchPlayers:        [],
  originalStarterIds:  [],
  originalLiberoId:    null,
  liberoId:            null,
  liberoReplacedId:    null,
  myScore:             0,
  oppScore:            0,
  mySets:              0,
  oppSets:             0,
  setNum:              1,
  setBannerVisible:    false,
  setWinner:           null,
  history:             [],
  trajectory:          [{ x: 0, y: 0 }],
  subHistory:          [],
  substitutionPairs:   {},
  playerSetPresence:   {},
  matchHistory:        [],
  setResults:          [],
  lastSetStartPositionMap: {},
  setRoles:            {},
};

// Règle officielle : 25 pts min, 2 pts d'écart (prolongation au-delà)
const checkSetEnd = (myScore: number, oppScore: number): SetWinner => {
  if (myScore >= 25 && myScore - oppScore >= 2) return 'me';
  if (oppScore >= 25 && oppScore - myScore >= 2) return 'opp';
  return null;
};

function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {

    case ACTION_TYPES.SETUP_MATCH:
      return {
        ...state,
        matchName: action.payload.matchName,
        isHome:    action.payload.isHome,
      };

    case ACTION_TYPES.CLEAR_MATCH_SETUP:
      return {
        ...state,
        matchName: null,
        isHome:    null,
      };

    case ACTION_TYPES.VALIDATE_ROSTER: {
      const { starterIds, benchIds, liberoId, allPlayers } = action.payload;

      const fieldPlayers: MatchPlayer[] = starterIds.map((id): MatchPlayer | null => {
        const player = allPlayers.find(p => p.id === id);
        if (!player) return null;
        return {
          id:           player.id,
          name:         player.name,
          tacticalRole: '',
          numero:       player.numero,
          onCourt:      false,
          pos:          null,
          stats:        createEmptyStats(),
          roles:        player.roles ?? [],
        };
      }).filter((p): p is MatchPlayer => p !== null);

      // Le libero
      const liberoPlayers: MatchPlayer[] = liberoId !== null ? (() => {
        const player = allPlayers.find(p => p.id === liberoId);
        if (!player) return [];
        return [{
          id:           player.id,
          name:         player.name,
          tacticalRole: 'Libero',
          numero:       player.numero,
          onCourt:      false,
          pos:          null,
          stats:        createEmptyStats(),
          roles:        player.roles ?? [],
        }];
      })() : [];

      const benchPlayers: MatchPlayer[] = benchIds.map((id): MatchPlayer | null => {
        const player = allPlayers.find(p => p.id === id);
        if (!player) return null;
        return {
          id:           player.id,
          name:         player.name,
          tacticalRole: '',
          numero:       player.numero,
          onCourt:      false,
          pos:          null,
          stats:        createEmptyStats(),
          roles:        player.roles ?? [],
        };
      }).filter((p): p is MatchPlayer => p !== null);

      return {
        ...state,
        rosterValidated:    true,
        setSetupPending:    true,
        liberoId,
        originalLiberoId:   liberoId,
        liberoReplacedId:   null,
        originalStarterIds: starterIds,
        matchPlayers:       [...fieldPlayers, ...liberoPlayers, ...benchPlayers],
      };
    }

    case ACTION_TYPES.ASSIGN_SET_ROLES: {
      const { positionMap, tacticalRoles, liberoActive, newLiberoId } = action.payload;

      // newLiberoId fourni → remplace le libero désigné (désignation initiale ou entre sets)
      const resolvedOriginalLiberoId = newLiberoId !== undefined ? newLiberoId : state.originalLiberoId;
      const effectiveLiberoId = liberoActive ? resolvedOriginalLiberoId : null;

      const updatedPlayers = state.matchPlayers.map(p => {
        if (p.id === effectiveLiberoId) {
          return { ...p, onCourt: false, pos: null, tacticalRole: 'Libero' };
        }
        const posEntry = Object.entries(positionMap).find(([, id]) => id === p.id);
        if (posEntry) {
          return {
            ...p,
            onCourt:      true,
            pos:          Number(posEntry[0]),
            tacticalRole: tacticalRoles[p.id] ?? '',
          };
        }
        return { ...p, onCourt: false, pos: null, tacticalRole: tacticalRoles[p.id] ?? '' };
      });

      const sn = state.setNum;
      const onCourtIds = Object.values(positionMap)
        .concat(effectiveLiberoId !== null ? [effectiveLiberoId] : []);

      const playerSetPresence = { ...state.playerSetPresence };
      for (const id of onCourtIds) {
        if (!playerSetPresence[id]) playerSetPresence[id] = [];
        if (!playerSetPresence[id].includes(sn)) playerSetPresence[id] = [...playerSetPresence[id], sn];
      }

      return {
        ...state,
        setSetupPending:          false,
        liberoId:                 effectiveLiberoId,
        liberoReplacedId:         null,
        originalLiberoId:         resolvedOriginalLiberoId,
        matchPlayers:             updatedPlayers,
        lastSetStartPositionMap:  positionMap,
        playerSetPresence,
        setRoles: {
          ...state.setRoles,
          [state.setNum]: tacticalRoles,
        },
      };
    }

    case ACTION_TYPES.RESET_ROSTER:
      return {
        ...state,
        rosterValidated:    false,
        setSetupPending:    false,
        matchPlayers:       [],
        originalStarterIds: [],
        playerSetPresence:  {},
      };

    case ACTION_TYPES.PLAYER_ACTION: {
      const { playerId, actionKey } = action.payload;
      const playerAction = PLAYER_ACTIONS[actionKey];

      const updatedPlayers = state.matchPlayers.map(p => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          stats: {
            ...p.stats,
            [actionKey]: p.stats[actionKey] + 1,
          },
        };
      });

      const newMyScore  = playerAction.mine ? state.myScore + 1  : state.myScore;
      const newOppScore = playerAction.mine ? state.oppScore     : state.oppScore + 1;

      const historyEntry: HistoryEntry = { source: 'player', playerId, actionKey, mine: playerAction.mine };
      const newTrajectory = [...state.trajectory, { x: newMyScore, y: newOppScore }];

      const player = state.matchPlayers.find(p => p.id === playerId);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'player',
        playerId,
        actionKey,
        playerRole: player?.tacticalRole,
        mine:       playerAction.mine,
        scoreAfter: { my: newMyScore, opp: newOppScore },
      };

      const winner = checkSetEnd(newMyScore, newOppScore);

      return {
        ...state,
        matchPlayers:       updatedPlayers,
        myScore:            newMyScore,
        oppScore:           newOppScore,
        history:            [...state.history, historyEntry],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         newTrajectory,
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             winner === 'me'  ? state.mySets + 1  : state.mySets,
        oppSets:            winner === 'opp' ? state.oppSets + 1 : state.oppSets,
      };
    }

    case ACTION_TYPES.OPP_SCORE: {
      const newOppScore = state.oppScore + 1;
      const winner = checkSetEnd(state.myScore, newOppScore);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'opp',
        mine:       false,
        scoreAfter: { my: state.myScore, opp: newOppScore },
      };
      return {
        ...state,
        oppScore:           newOppScore,
        history:            [...state.history, { source: 'opp', mine: false }],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         [...state.trajectory, { x: state.myScore, y: newOppScore }],
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             state.mySets,
        oppSets:            winner === 'opp' ? state.oppSets + 1 : state.oppSets,
      };
    }

    case ACTION_TYPES.OPP_FAULT: {
      const newMyScore = state.myScore + 1;
      const winner = checkSetEnd(newMyScore, state.oppScore);
      const matchEvent: MatchHistoryEvent = {
        index:      state.matchHistory.length,
        setNum:     state.setNum,
        source:     'opp_fault',
        mine:       true,
        scoreAfter: { my: newMyScore, opp: state.oppScore },
      };
      return {
        ...state,
        myScore:            newMyScore,
        history:            [...state.history, { source: 'opp_fault', mine: true }],
        matchHistory:       [...state.matchHistory, matchEvent],
        trajectory:         [...state.trajectory, { x: newMyScore, y: state.oppScore }],
        setBannerVisible:   !!winner && !state.setBannerVisible,
        setWinner:          winner,
        mySets:             winner === 'me' ? state.mySets + 1 : state.mySets,
        oppSets:            state.oppSets,
      };
    }

    case ACTION_TYPES.UNDO: {
      if (state.history.length === 0) return state;

      const last = state.history[state.history.length - 1];
      const newHistory    = state.history.slice(0, -1);
      const newTrajectory = state.trajectory.length > 1
        ? state.trajectory.slice(0, -1)
        : state.trajectory;

      let newMyScore  = state.myScore;
      let newOppScore = state.oppScore;

      if (last.mine) newMyScore  = Math.max(0, newMyScore - 1);
      else           newOppScore = Math.max(0, newOppScore - 1);

      let updatedPlayers = state.matchPlayers;
      if (last.source === 'player') {
        updatedPlayers = state.matchPlayers.map(p => {
          if (p.id !== last.playerId) return p;
          return {
            ...p,
            stats: {
              ...p.stats,
              [last.actionKey]: Math.max(0, p.stats[last.actionKey] - 1),
            },
          };
        });
      }

      const undoingSetWinner = state.setBannerVisible;
      const newMySets  = undoingSetWinner && last.mine  ? state.mySets  - 1 : state.mySets;
      const newOppSets = undoingSetWinner && !last.mine ? state.oppSets - 1 : state.oppSets;

      return {
        ...state,
        myScore:          newMyScore,
        oppScore:         newOppScore,
        history:          newHistory,
        matchHistory:     state.matchHistory.slice(0, -1),
        trajectory:       newTrajectory,
        matchPlayers:     updatedPlayers,
        setBannerVisible: undoingSetWinner ? false : state.setBannerVisible,
        setWinner:        undoingSetWinner ? null  : state.setWinner,
        mySets:           newMySets,
        oppSets:          newOppSets,
      };
    }

    case ACTION_TYPES.ROTATE:
      return {
        ...state,
        // Règle officielle : chaque poste -1, poste 1 revient à 6
        matchPlayers: state.matchPlayers.map(p => {
          if (!p.onCourt || p.pos === null) return p;
          return { ...p, pos: p.pos === 1 ? 6 : p.pos - 1 };
        }),
      };

    case ACTION_TYPES.LIBERO_SWAP: {
      const libero = state.matchPlayers.find(p => p.id === state.liberoId);
      if (!libero) return state;

      if (state.liberoReplacedId === null) {
        const central = state.matchPlayers.find(
          p => p.onCourt && p.tacticalRole === 'Central' && p.pos !== null && BACK_ROW_POSITIONS.has(p.pos)
        );
        if (!central) return state;
        return {
          ...state,
          liberoReplacedId: central.id,
          matchPlayers: state.matchPlayers.map(p => {
            if (p.id === libero.id)  return { ...p, onCourt: true,  pos: central.pos };
            if (p.id === central.id) return { ...p, onCourt: false, pos: null };
            return p;
          }),
        };
      } else {
        return {
          ...state,
          liberoReplacedId: null,
          matchPlayers: state.matchPlayers.map(p => {
            if (p.id === libero.id)             return { ...p, onCourt: false, pos: null };
            if (p.id === state.liberoReplacedId) return { ...p, onCourt: true,  pos: libero.pos };
            return p;
          }),
        };
      }
    }

    case ACTION_TYPES.CONFIRM_SUB: {
      const { outId, inId } = action.payload;
      const outPlayer = state.matchPlayers.find(p => p.id === outId);
      const inPlayer  = state.matchPlayers.find(p => p.id === inId);
      if (!outPlayer || !inPlayer) return state;

      const updatedPlayers = state.matchPlayers.map(p => {
        if (p.id === outId) return { ...p, onCourt: false, pos: null };
        if (p.id === inId)  return { ...p, onCourt: true,  pos: outPlayer.pos, tacticalRole: outPlayer.tacticalRole };
        return p;
      });

      const subEntry: SubEntry = {
        outName: outPlayer.name,
        inName:  inPlayer.name,
        score:   `${state.myScore} – ${state.oppScore}`,
      };

      const subSn = state.setNum;
      const prevSets = state.playerSetPresence[inId] ?? [];
      const updatedPresence = prevSets.includes(subSn)
        ? state.playerSetPresence
        : { ...state.playerSetPresence, [inId]: [...prevSets, subSn] };

      return {
        ...state,
        matchPlayers:      updatedPlayers,
        subHistory:        [...state.subHistory, subEntry],
        substitutionPairs: { ...state.substitutionPairs, [outId]: inId },
        playerSetPresence: updatedPresence,
      };
    }

    case ACTION_TYPES.CLOSE_SET_BANNER: {
      const completedSet: SetResult = {
        setNum:   state.setNum,
        myScore:  state.myScore,
        oppScore: state.oppScore,
        winner:   state.setWinner,
      };

      const resetPlayers = state.matchPlayers.map(p => ({
        ...p,
        onCourt: false,
        pos:     null,
      }));

      return {
        ...state,
        myScore:           0,
        oppScore:          0,
        setNum:            state.setNum + 1,
        setBannerVisible:  false,
        setWinner:         null,
        history:           [],
        trajectory:        [{ x: 0, y: 0 }],
        subHistory:        [],
        substitutionPairs: {},
        setResults:        [...state.setResults, completedSet],
        setSetupPending:   true,
        liberoReplacedId:  null,
        matchPlayers:      resetPlayers,
      };
    }

    case ACTION_TYPES.RESET_MATCH:
      return initialState;

    default:
      return state;
  }
}

const MatchContext = createContext<MatchContextValue | null>(null);

export const MatchProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(matchReducer, initialState);

  const actions: MatchContextValue['actions'] = {
    setupMatch:      (payload) => dispatch({ type: ACTION_TYPES.SETUP_MATCH,      payload }),
    clearMatchSetup: ()        => dispatch({ type: ACTION_TYPES.CLEAR_MATCH_SETUP }),
    validateRoster:  (payload) => dispatch({ type: ACTION_TYPES.VALIDATE_ROSTER,  payload }),
    assignSetRoles:  (payload) => dispatch({ type: ACTION_TYPES.ASSIGN_SET_ROLES, payload }),
    resetRoster:     ()        => dispatch({ type: ACTION_TYPES.RESET_ROSTER }),
    playerAction:    (payload) => dispatch({ type: ACTION_TYPES.PLAYER_ACTION,    payload }),
    oppScore:        ()        => dispatch({ type: ACTION_TYPES.OPP_SCORE }),
    oppFault:        ()        => dispatch({ type: ACTION_TYPES.OPP_FAULT }),
    undo:            ()        => dispatch({ type: ACTION_TYPES.UNDO }),
    rotate:          ()        => dispatch({ type: ACTION_TYPES.ROTATE }),
    liberoSwap:      ()        => dispatch({ type: ACTION_TYPES.LIBERO_SWAP }),
    confirmSub:      (payload) => dispatch({ type: ACTION_TYPES.CONFIRM_SUB,      payload }),
    closeSetBanner:  ()        => dispatch({ type: ACTION_TYPES.CLOSE_SET_BANNER }),
    resetMatch:      ()        => dispatch({ type: ACTION_TYPES.RESET_MATCH }),
  };

  return (
    <MatchContext.Provider value={{ state, actions }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = (): MatchContextValue => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch doit être utilisé dans un MatchProvider');
  return context;
};