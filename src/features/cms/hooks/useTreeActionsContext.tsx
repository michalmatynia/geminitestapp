'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useAutoExpand } from './useAutoExpand';
import { usePageBuilder } from './usePageBuilderContext';
import { useTreeActionGroups } from './useTreeActionGroups';
import { useTreeBlockActions } from './useTreeBlockActions';
import { useTreeGridActions } from './useTreeGridActions';
import { useTreeSectionActions } from './useTreeSectionActions';

import type {
  TreeActionsActionsContextValue,
  TreeActionsContextValue,
  TreeActionsProviderProps,
  TreeActionsStateContextValue,
} from './useTreeActionsContext.types';

export const TreeActionsStateContext = createContext<TreeActionsStateContextValue | null>(null);
export const TreeActionsActionsContext = createContext<TreeActionsActionsContextValue | null>(null);

export function TreeActionsProvider({
  children,
  expandedIds,
  setExpandedIds,
}: TreeActionsProviderProps): React.JSX.Element {
  const { state, dispatch } = usePageBuilder();
  const { autoExpand, toggleExpand } = useAutoExpand(setExpandedIds);

  const selectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SELECT_NODE', nodeId });
    },
    [dispatch]
  );

  const blockActions = useTreeBlockActions({
    dispatch,
    autoExpand,
  });
  const sectionActions = useTreeSectionActions({
    dispatch,
    autoExpand,
    sections: state.sections,
  });
  const gridActions = useTreeGridActions({
    dispatch,
    autoExpand,
  });
  const { actionsValue } = useTreeActionGroups({
    ...blockActions,
    ...sectionActions,
    ...gridActions,
    selectNode,
    toggleExpand,
    autoExpand,
  });

  const stateValue = useMemo<TreeActionsStateContextValue>(() => ({ expandedIds }), [expandedIds]);

  return (
    <TreeActionsActionsContext.Provider value={actionsValue}>
      <TreeActionsStateContext.Provider value={stateValue}>
        {children}
      </TreeActionsStateContext.Provider>
    </TreeActionsActionsContext.Provider>
  );
}

export function useTreeActionsState(): TreeActionsStateContextValue {
  const context = useContext(TreeActionsStateContext);
  if (!context) {
    throw internalError('useTreeActionsState must be used within a TreeActionsProvider');
  }

  return context;
}

export function useTreeActionsActions(): TreeActionsActionsContextValue {
  const context = useContext(TreeActionsActionsContext);
  if (!context) {
    throw internalError('useTreeActionsActions must be used within a TreeActionsProvider');
  }

  return context;
}

export function useTreeActions(): TreeActionsContextValue {
  const state = useTreeActionsState();
  const actions = useTreeActionsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
