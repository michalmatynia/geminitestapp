import { reducePageBuilderStateCore } from './page-builder-reducer-core';

import type {
  PageBuilderAction,
  PageBuilderSnapshot,
  PageBuilderState,
} from '../../types/page-builder';

const HISTORY_LIMIT = 50;

const HISTORY_IGNORED_ACTIONS = new Set<PageBuilderAction['type']>([
  'SET_PAGES',
  'CLEAR_CURRENT_PAGE',
  'SELECT_NODE',
  'TOGGLE_LEFT_PANEL',
  'TOGGLE_RIGHT_PANEL',
  'COPY_SECTION',
  'COPY_BLOCK',
  'UPDATE_PAGE_SLUGS',
  'TOGGLE_INSPECTOR',
  'UPDATE_INSPECTOR_SETTINGS',
  'SET_PREVIEW_MODE',
]);

function makeSnapshot(state: PageBuilderState): PageBuilderSnapshot {
  return {
    currentPage: state.currentPage,
    sections: state.sections,
  };
}

export function pageBuilderReducer(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState {
  if (action.type === 'UNDO') {
    if (state.history.past.length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1]!;
    const past = state.history.past.slice(0, -1);
    const future = [makeSnapshot(state), ...state.history.future];
    return {
      ...state,
      currentPage: previous.currentPage,
      sections: previous.sections,
      selectedNodeId: null,
      history: { past, future },
    };
  }

  if (action.type === 'REDO') {
    if (state.history.future.length === 0) return state;
    const next = state.history.future[0]!;
    const future = state.history.future.slice(1);
    const past = [...state.history.past, makeSnapshot(state)].slice(-HISTORY_LIMIT);
    return {
      ...state,
      currentPage: next.currentPage,
      sections: next.sections,
      selectedNodeId: null,
      history: { past, future },
    };
  }

  const nextState = reducePageBuilderStateCore(state, action);

  if (nextState === state) return state;

  if (action.type === 'SET_CURRENT_PAGE') {
    return {
      ...nextState,
      history: { past: [], future: [] },
    };
  }

  if (HISTORY_IGNORED_ACTIONS.has(action.type)) {
    return {
      ...nextState,
      history: state.history,
    };
  }

  const past = [...state.history.past, makeSnapshot(state)].slice(-HISTORY_LIMIT);
  return {
    ...nextState,
    history: { past, future: [] },
  };
}
