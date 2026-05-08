// ─────────────────────────────────────────────
//  CONTEXTE DU MATCH (état global)
//
//  Utilise React Context + useReducer pour
//  centraliser tout l'état du match.
//
//  Tous les composants peuvent lire et modifier
//  l'état via le hook useMatch().
// ─────────────────────────────────────────────

import React, { createContext, useContext, useReducer } from 'react';
import { createEmptyStats, Player, ActionKey, PlayerStats } from '../data/players';

// ── Types d'actions du reducer ──
// Chaque action modifie l'état du match de façon prévisible
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

// ── Définition des 7 types d'actions joueur ──
// mine: true  → +1 mon équipe
// mine: false → +1 adversaire
export const PLAYER_ACTIONS: Record<ActionKey, { label: string; mine: boolean; section: 'points' | 'fautes' }> = {
  pt:      { label: 'Point marqué',    mine: true,  section: 'points' },
  atk:     { label: 'Attaque point',   mine: true,  section: 'points' },
  block:   { label: 'Contre point',    mine: true,  section: 'points' },
  ace:     { label: 'Service ace',     mine: true,  section: 'points' },
  atk_out: { label: 'Attaque out',     mine: false, section: 'fautes' },
  srv_out: { label: 'Service out',     mine: false, section: 'fautes' },
  recv:    { label: 'Réception ratée', mine: false, section: 'fautes' },
};

// ── Types ──

export type MatchPlayer = {
  id: number;
  name: string;
  tacticalRole: string;  // rôle tactique pour ce set (R4, Central, Passeur, Pointu, Libero)
  numero: number;
  onCourt: boolean;
  pos: number | null;
  stats: PlayerStats;
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

// ── Événement du match (pour reconstruction complète) ──
// Chaque point marqué est enregistré avec son contexte.
// Contrairement à `history` (undo, vidé entre les sets),
// `matchHistory` accumule tous les événements du match entier.
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

// ── Résultat d'un set terminé ──
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
  matchHistory: MatchHistoryEvent[]; // historique complet inter-sets (jamais vidé)
  setResults: SetResult[];           // résultats des sets terminés
  lastSetStartPositionMap: Record<number, number>; // positionMap du dernier SetSetupScreen confirmé
};

// Payload pour la sélection des joueurs (sans rôles ni positions — gérés dans SetSetupScreen)
type ValidateRosterPayload = {
  starterIds: number[];
  benchIds: number[];
  liberoId: number | null;
  allPlayers: Player[];
};

// Payload pour la configuration des rôles/positions avant chaque set
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

// Postes de la zone arrière (le libero ne peut remplacer qu'en arrière)
const BACK_ROW_POSITIONS = new Set([1, 5, 6]);

// ── État initial ──
const initialState: MatchState = {
  // --- Configuration du match ---
  matchName: null,
  isHome:    null,

  // --- Roster ---
  rosterValidated:    false,   // true quand l'équipe a été sélectionnée
  setSetupPending:    false,   // true quand le SetSetupScreen doit s'afficher
  matchPlayers:       [],      // joueurs sélectionnés pour ce match (terrain + banc)
  originalStarterIds: [],      // IDs des 6 titulaires terrain fixes (hors libero)
  originalLiberoId:   null,    // ID du libero désigné au roster (référence immuable)
  liberoId:           null,    // ID du libero actif ce set (null = désactivé)
  liberoReplacedId:   null,    // ID du joueur actuellement remplacé par le libero

  // --- Score du set en cours ---
  myScore:  0,
  oppScore: 0,

  // --- Sets gagnés sur le match ---
  mySets:   0,
  oppSets:  0,
  setNum:   1,              // numéro du set en cours

  // --- Fin de set ---
  setBannerVisible: false,  // afficher la bannière de fin de set ?
  setWinner: null,          // 'me' | 'opp'

  // --- Historique des actions (pour le undo) ---
  history: [],

  // --- Trajectoire du graphe ---
  trajectory: [{ x: 0, y: 0 }],

  // --- Historique des remplacements ---
  subHistory: [],

  // --- Historique complet du match (inter-sets, jamais vidé) ---
  matchHistory: [],

  // --- Résultats des sets terminés ---
  setResults: [],
  lastSetStartPositionMap: {},
};

// ── Vérifier si un set est terminé ──
// Règle officielle : 25 pts minimum, 2 pts d'écart (prolongation au-delà)
const checkSetEnd = (myScore: number, oppScore: number): SetWinner => {
  if (myScore >= 25 && myScore - oppScore >= 2) return 'me';
  if (oppScore >= 25 && oppScore - myScore >= 2) return 'opp';
  return null;
};

// ── Reducer principal ──
// Reçoit l'état actuel et une action, retourne le nouvel état
function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {

    // ── Configurer le match ──
    case ACTION_TYPES.SETUP_MATCH:
      return {
        ...state,
        matchName: action.payload.matchName,
        isHome:    action.payload.isHome,
      };

    // ── Effacer la configuration (retour arrière) ──
    case ACTION_TYPES.CLEAR_MATCH_SETUP:
      return {
        ...state,
        matchName: null,
        isHome:    null,
      };

    // ── Valider la sélection de l'équipe ──
    // Crée les MatchPlayers sans rôles ni positions — assignés dans ASSIGN_SET_ROLES
    case ACTION_TYPES.VALIDATE_ROSTER: {
      const { starterIds, benchIds, liberoId, allPlayers } = action.payload;

      // Titulaires terrain : sans rôle ni position pour l'instant
      const fieldPlayers: MatchPlayer[] = starterIds.map((id): MatchPlayer | null => {
        const player = allPlayers.find(p => p.id === id);
        if (!player) return null;
        return {
          id:           player.id,
          name:         player.name,
          tacticalRole: '',
          numero:       player.numero,
          onCourt:      false,  // sera mis à jour par ASSIGN_SET_ROLES
          pos:          null,   // sera mis à jour par ASSIGN_SET_ROLES
          stats:        createEmptyStats(),
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
        }];
      })() : [];

      // Joueurs du banc
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
        };
      }).filter((p): p is MatchPlayer => p !== null);

      return {
        ...state,
        rosterValidated:    true,
        setSetupPending:    true,   // → affiche SetSetupScreen pour le Set 1
        liberoId,
        originalLiberoId:   liberoId,  // référence immuable pour restaurer entre les sets
        liberoReplacedId:   null,
        originalStarterIds: starterIds,
        matchPlayers:       [...fieldPlayers, ...liberoPlayers, ...benchPlayers],
      };
    }

    // ── Assigner les rôles et positions avant un set ──
    case ACTION_TYPES.ASSIGN_SET_ROLES: {
      const { positionMap, tacticalRoles, liberoActive, newLiberoId } = action.payload;

      // newLiberoId fourni → remplace le libero (désignation initiale ou changement entre sets)
      // sinon → conserver le libero actuel
      const resolvedOriginalLiberoId = newLiberoId !== undefined ? newLiberoId : state.originalLiberoId;

      // liberoId effectif pour ce set : resolvedOriginalLiberoId si actif, null sinon
      const effectiveLiberoId = liberoActive ? resolvedOriginalLiberoId : null;

      const updatedPlayers = state.matchPlayers.map(p => {
        const isActiveLibero = p.id === effectiveLiberoId;

        // Libero actif → hors terrain, rôle figé
        if (isActiveLibero) {
          return { ...p, onCourt: false, pos: null, tacticalRole: 'Libero' };
        }

        // Tous les autres joueurs : position déterminée par la positionMap
        const posEntry = Object.entries(positionMap).find(([, id]) => id === p.id);
        if (posEntry) {
          return {
            ...p,
            onCourt:      true,
            pos:          Number(posEntry[0]),
            tacticalRole: tacticalRoles[p.id] ?? '',
          };
        }

        // Joueur au banc
        return { ...p, onCourt: false, pos: null, tacticalRole: tacticalRoles[p.id] ?? '' };
      });

      return {
        ...state,
        setSetupPending:          false,
        liberoId:                 effectiveLiberoId,
        liberoReplacedId:         null,
        originalLiberoId:         resolvedOriginalLiberoId,
        matchPlayers:             updatedPlayers,
        lastSetStartPositionMap:  positionMap,
      };
    }

    // ── Réinitialiser la sélection du roster ──
    case ACTION_TYPES.RESET_ROSTER:
      return {
        ...state,
        rosterValidated:    false,
        setSetupPending:    false,
        matchPlayers:       [],
        originalStarterIds: [],
      };

    // ── Action attribuée à un joueur ──
    case ACTION_TYPES.PLAYER_ACTION: {
      const { playerId, actionKey } = action.payload;
      const playerAction = PLAYER_ACTIONS[actionKey];

      // Mettre à jour les stats du joueur concerné
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

      // Mettre à jour le score selon le type d'action
      const newMyScore  = playerAction.mine ? state.myScore + 1  : state.myScore;
      const newOppScore = playerAction.mine ? state.oppScore     : state.oppScore + 1;

      // Enregistrer dans l'historique pour le undo
      const historyEntry: HistoryEntry = { source: 'player', playerId, actionKey, mine: playerAction.mine };
      const newTrajectory = [...state.trajectory, { x: newMyScore, y: newOppScore }];

      // Enregistrer dans l'historique complet du match (pour reconstruction)
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

      // Vérifier si le set est terminé
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

    // ── +1 adversaire (bouton manuel) ──
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

    // ── Faute adverse → +1 mon équipe ──
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

    // ── Annuler la dernière action ──
    case ACTION_TYPES.UNDO: {
      if (state.history.length === 0) return state; // rien à annuler

      const last = state.history[state.history.length - 1];
      const newHistory    = state.history.slice(0, -1);
      const newTrajectory = state.trajectory.length > 1
        ? state.trajectory.slice(0, -1)
        : state.trajectory;

      // Recalculer les scores
      let newMyScore  = state.myScore;
      let newOppScore = state.oppScore;

      if (last.mine) {
        newMyScore  = Math.max(0, newMyScore - 1);
      } else {
        newOppScore = Math.max(0, newOppScore - 1);
      }

      // Remettre à zéro la stat du joueur si c'est une action joueur
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

    // ── Rotation des joueurs ──
    case ACTION_TYPES.ROTATE:
      return {
        ...state,
        matchPlayers: state.matchPlayers.map(p => {
          if (!p.onCourt || p.pos === null) return p; // les joueurs au banc ne tournent pas
          // Règle officielle : chaque poste diminue de 1, le poste 1 revient à 6
          return { ...p, pos: p.pos === 1 ? 6 : p.pos - 1 };
        }),
      };

    // ── Échange libero / centrale ──
    case ACTION_TYPES.LIBERO_SWAP: {
      const libero = state.matchPlayers.find(p => p.id === state.liberoId);
      if (!libero) return state;

      if (state.liberoReplacedId === null) {
        // Libero entre : trouver un central en zone arrière
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
        // Libero sort : le central reprend sa place
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

    // ── Confirmer un remplacement ──
    case ACTION_TYPES.CONFIRM_SUB: {
      const { outId, inId } = action.payload;
      const outPlayer = state.matchPlayers.find(p => p.id === outId);
      const inPlayer  = state.matchPlayers.find(p => p.id === inId);
      if (!outPlayer || !inPlayer) return state;

      // Le joueur entrant prend le poste et le rôle tactique du joueur sortant
      const updatedPlayers = state.matchPlayers.map(p => {
        if (p.id === outId) return { ...p, onCourt: false, pos: null };
        if (p.id === inId)  return { ...p, onCourt: true,  pos: outPlayer.pos, tacticalRole: outPlayer.tacticalRole };
        return p;
      });

      // Enregistrer le remplacement dans l'historique
      const subEntry: SubEntry = {
        outName: outPlayer.name,
        inName:  inPlayer.name,
        score:   `${state.myScore} – ${state.oppScore}`,
      };

      return {
        ...state,
        matchPlayers: updatedPlayers,
        subHistory:   [...state.subHistory, subEntry],
      };
    }

    // ── Démarrer le set suivant ──
    // Remet les scores à zéro et déclenche SetSetupScreen pour reconfigurer rôles/positions
    case ACTION_TYPES.CLOSE_SET_BANNER: {
      // Sauvegarder le résultat du set terminé
      const completedSet: SetResult = {
        setNum:   state.setNum,
        myScore:  state.myScore,
        oppScore: state.oppScore,
        winner:   state.setWinner,
      };

      // Remettre tous les joueurs hors terrain (les positions seront réassignées dans SetSetupScreen)
      const resetPlayers = state.matchPlayers.map(p => ({
        ...p,
        onCourt: false,
        pos:     null,
      }));

      return {
        ...state,
        myScore:          0,
        oppScore:         0,
        setNum:           state.setNum + 1,
        setBannerVisible: false,
        setWinner:        null,
        history:          [],
        trajectory:       [{ x: 0, y: 0 }],
        setResults:       [...state.setResults, completedSet],
        setSetupPending:  true,   // → affiche SetSetupScreen pour le nouveau set
        liberoReplacedId: null,
        matchPlayers:     resetPlayers,
      };
    }

    // ── Réinitialisation complète (changement d'équipe) ──
    case ACTION_TYPES.RESET_MATCH:
      return initialState;

    default:
      return state;
  }
}

// ── Création du contexte ──
const MatchContext = createContext<MatchContextValue | null>(null);

// ── Provider à envelopper autour de l'app ──
export const MatchProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(matchReducer, initialState);

  // Helpers pour dispatch - évite de répéter le type partout dans les composants
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

// ── Hook pour consommer le contexte ──
// Usage : const { state, actions } = useMatch();
export const useMatch = (): MatchContextValue => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch doit être utilisé dans un MatchProvider');
  return context;
};