import React, { createContext, useContext, useReducer } from 'react';
import type { LiveStatEvent } from '../data/liveStats';

type LiveStatsState = { events: LiveStatEvent[] };

const LIVE_ACTION_TYPES = {
  ADD_EVENT: 'ADD_EVENT',
  UNDO:      'UNDO',
  RESET:     'RESET',
} as const;

type AddEventPayload = Omit<LiveStatEvent, 'id' | 'ts'>;

type LiveStatsAction =
  | { type: typeof LIVE_ACTION_TYPES.ADD_EVENT; payload: AddEventPayload }
  | { type: typeof LIVE_ACTION_TYPES.UNDO }
  | { type: typeof LIVE_ACTION_TYPES.RESET };

type LiveStatsContextValue = {
  state: LiveStatsState;
  actions: {
    addEvent: (payload: AddEventPayload) => void;
    undo:     () => void;
    reset:    () => void;
  };
};

const initialState: LiveStatsState = { events: [] };

// Compteur monotone pour garantir des ids uniques même à la même ms.
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
        id: makeEventId(),
        ts: Date.now(),
      };
      return { events: [...state.events, event] };
    }
    case LIVE_ACTION_TYPES.UNDO:
      if (state.events.length === 0) return state;
      return { events: state.events.slice(0, -1) };
    case LIVE_ACTION_TYPES.RESET:
      return initialState;
    default:
      return state;
  }
}

const LiveStatsContext = createContext<LiveStatsContextValue | null>(null);

export const LiveStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(liveStatsReducer, initialState);

  const actions: LiveStatsContextValue['actions'] = {
    addEvent: (payload) => dispatch({ type: LIVE_ACTION_TYPES.ADD_EVENT, payload }),
    undo:     ()        => dispatch({ type: LIVE_ACTION_TYPES.UNDO }),
    reset:    ()        => dispatch({ type: LIVE_ACTION_TYPES.RESET }),
  };

  return (
    <LiveStatsContext.Provider value={{ state, actions }}>
      {children}
    </LiveStatsContext.Provider>
  );
};

export const useLiveStats = (): LiveStatsContextValue => {
  const ctx = useContext(LiveStatsContext);
  if (!ctx) throw new Error('useLiveStats doit être utilisé dans un LiveStatsProvider');
  return ctx;
};
