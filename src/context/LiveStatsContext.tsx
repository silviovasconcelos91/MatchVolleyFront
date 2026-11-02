import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { LiveStatEvent } from '../data/liveStats';

type LiveStatsState = {
  sets:       Record<number, LiveStatEvent[]>;
  currentSet: number;
};

const LIVE_ACTION_TYPES = {
  ADD_EVENT: 'ADD_EVENT',
  UNDO:      'UNDO',
  NEXT_SET:  'NEXT_SET',
  RESET:     'RESET',
} as const;

type AddEventPayload = Omit<LiveStatEvent, 'id' | 'ts' | 'setNumber'>;

type LiveStatsAction =
  | { type: typeof LIVE_ACTION_TYPES.ADD_EVENT; payload: AddEventPayload }
  | { type: typeof LIVE_ACTION_TYPES.UNDO }
  | { type: typeof LIVE_ACTION_TYPES.NEXT_SET }
  | { type: typeof LIVE_ACTION_TYPES.RESET };

type LiveStatsContextValue = {
  state: LiveStatsState;
  actions: {
    addEvent: (payload: AddEventPayload) => void;
    undo:     () => void;
    nextSet:  () => void;
    reset:    () => void;
  };
};

const initialState: LiveStatsState = {
  sets:       { 1: [] },
  currentSet: 1,
};

let eventCounter = 0;
const makeEventId = (): string => {
  eventCounter += 1;
  return `evt_${Date.now()}_${eventCounter}`;
};

function liveStatsReducer(state: LiveStatsState, action: LiveStatsAction): LiveStatsState {
  switch (action.type) {
    case LIVE_ACTION_TYPES.ADD_EVENT: {
      const event: LiveStatEvent = {
        ...action.payload,
        setNumber: state.currentSet,
        id: makeEventId(),
        ts: Date.now(),
      };
      const cur = state.sets[state.currentSet] ?? [];
      return {
        ...state,
        sets: { ...state.sets, [state.currentSet]: [...cur, event] },
      };
    }
    case LIVE_ACTION_TYPES.UNDO: {
      const cur = state.sets[state.currentSet] ?? [];
      if (cur.length === 0) return state;
      return {
        ...state,
        sets: { ...state.sets, [state.currentSet]: cur.slice(0, -1) },
      };
    }
    case LIVE_ACTION_TYPES.NEXT_SET: {
      const next = state.currentSet + 1;
      return { currentSet: next, sets: { ...state.sets, [next]: [] } };
    }
    case LIVE_ACTION_TYPES.RESET:
      return initialState;
    default:
      return state;
  }
}

const LiveStatsContext = createContext<LiveStatsContextValue | null>(null);

export const LiveStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(liveStatsReducer, initialState);

  // dispatch is stable → actions never change identity.
  const actions = useMemo<LiveStatsContextValue['actions']>(() => ({
    addEvent: (payload) => dispatch({ type: LIVE_ACTION_TYPES.ADD_EVENT, payload }),
    undo:     ()        => dispatch({ type: LIVE_ACTION_TYPES.UNDO }),
    nextSet:  ()        => dispatch({ type: LIVE_ACTION_TYPES.NEXT_SET }),
    reset:    ()        => dispatch({ type: LIVE_ACTION_TYPES.RESET }),
  }), []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <LiveStatsContext.Provider value={value}>
      {children}
    </LiveStatsContext.Provider>
  );
};

export const useLiveStats = (): LiveStatsContextValue => {
  const ctx = useContext(LiveStatsContext);
  if (!ctx) throw new Error('useLiveStats doit être utilisé dans un LiveStatsProvider');
  return ctx;
};
