// Board entraîneur : historique annuler / rétablir autour du contenu du board.
// État purement local (rien n'est envoyé au backend ni conservé à la fermeture).

import type { BoardContent } from './CoachBoardScreen.types';

const MAX_HISTORY = 50;

export type BoardHistory = {
  past: BoardContent[];
  present: BoardContent;
  future: BoardContent[];
};

export type BoardAction =
  | { type: 'COMMIT'; content: BoardContent }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export const initHistory = (content: BoardContent): BoardHistory => ({
  past: [],
  present: content,
  future: [],
});

export const boardReducer = (state: BoardHistory, action: BoardAction): BoardHistory => {
  switch (action.type) {
    case 'COMMIT':
      if (action.content === state.present) return state;
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: action.content,
        future: [],
      };
    case 'UNDO': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
      };
    }
    default:
      return state;
  }
};
