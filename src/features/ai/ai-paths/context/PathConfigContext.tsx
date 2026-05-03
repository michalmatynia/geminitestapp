'use client';

import { useCallback, useMemo, useReducer, useRef } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import {
  DEFAULT_PATH_CONFIG_STATE,
  type PathConfigActions,
  type PathConfigPatch,
  type PathConfigProviderProps,
  type PathConfigState,
} from './PathConfigContext.shared';

export type {
  PathConfigActions,
  PathConfigPatch,
  PathConfigState,
} from './PathConfigContext.shared';

type Action = { type: 'patch'; patch: PathConfigPatch } | { type: 'reset' };

function reducer(state: PathConfigState, action: Action): PathConfigState {
  switch (action.type) {
    case 'patch': {
      let changed = false;
      const next: PathConfigState = { ...state };
      for (const key of Object.keys(action.patch) as (keyof PathConfigState)[]) {
        const value = action.patch[key];
        if (value === undefined) continue;
        if (next[key] !== value) {
          changed = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (next as any)[key] = value;
        }
      }
      return changed ? next : state;
    }
    case 'reset':
      return DEFAULT_PATH_CONFIG_STATE;
  }
}

const createPathConfigStrictContext = <T,>(hookName: string) =>
  createStrictContext<T>({
    hookName,
    providerName: 'a PathConfigProvider',
    errorFactory: internalError,
  });

const {
  Context: PathConfigStateContext,
  useStrictContext: usePathConfigState,
} = createPathConfigStrictContext<PathConfigState>('usePathConfigState');

const {
  Context: PathConfigActionsContext,
  useStrictContext: usePathConfigActions,
} = createPathConfigStrictContext<PathConfigActions>('usePathConfigActions');

export { usePathConfigState, usePathConfigActions };

export function PathConfigProvider({ children }: PathConfigProviderProps): React.ReactNode {
  const [state, dispatch] = useReducer(reducer, DEFAULT_PATH_CONFIG_STATE);

  // Ref keeps toggle actions stable across state changes.
  const stateRef = useRef(state);
  stateRef.current = state;

  const patch = useCallback((p: PathConfigPatch): void => {
    dispatch({ type: 'patch', patch: p });
  }, []);

  const actions = useMemo<PathConfigActions>(
    () => ({
      setPathName: (name) => patch({ pathName: name }),
      setPathDescription: (description) => patch({ pathDescription: description }),
      setActiveTrigger: (trigger) => patch({ activeTrigger: trigger }),
      setExecutionMode: (mode) => patch({ executionMode: mode }),
      setFlowIntensity: (intensity) => patch({ flowIntensity: intensity }),
      setRunMode: (mode) => patch({ runMode: mode }),
      setStrictFlowMode: (enabled) => patch({ strictFlowMode: enabled }),
      setBlockedRunPolicy: (policy) => patch({ blockedRunPolicy: policy }),
      setAiPathsValidation: (config) => patch({ aiPathsValidation: config }),
      setHistoryRetentionPasses: (passes) => patch({ historyRetentionPasses: passes }),
      setHistoryRetentionOptionsMax: (max) => patch({ historyRetentionOptionsMax: max }),
      setIsPathLocked: (locked) => patch({ isPathLocked: locked }),
      togglePathLock: () => patch({ isPathLocked: !stateRef.current.isPathLocked }),
      setIsPathActive: (active) => patch({ isPathActive: active }),
      togglePathActive: () => patch({ isPathActive: !stateRef.current.isPathActive }),
      applyPathConfig: (p) => patch(p),
      resetPathConfig: () => dispatch({ type: 'reset' }),
    }),
    [patch]
  );

  return (
    <PathConfigActionsContext.Provider value={actions}>
      <PathConfigStateContext.Provider value={state}>{children}</PathConfigStateContext.Provider>
    </PathConfigActionsContext.Provider>
  );
}
