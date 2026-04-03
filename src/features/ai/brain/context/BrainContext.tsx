'use client';

import { useMemo, type JSX, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useBrainRuntime } from './useBrainRuntime';

import type {
  BrainActionsContextType,
  BrainContextType,
  BrainStateContextType,
} from './BrainContext.types';

export type {
  BrainActionsContextType,
  BrainContextType,
  BrainStateContextType,
  BrainTab,
} from './BrainContext.types';
export type {
  BrainModelsResponse,
  BrainOperationsOverviewResponse,
  InsightsSnapshot,
} from './useBrainRuntime';

const {
  Context: BrainStateContext,
  useStrictContext: useBrainStateContext,
} = createStrictContext<BrainStateContextType>({
  hookName: 'useBrainState',
  providerName: 'a BrainProvider',
  errorFactory: internalError,
});

const {
  Context: BrainActionsContext,
  useStrictContext: useBrainActionsContext,
} = createStrictContext<BrainActionsContextType>({
  hookName: 'useBrainActions',
  providerName: 'a BrainProvider',
  errorFactory: internalError,
});

export const useBrainState = useBrainStateContext;
export const useBrainActions = useBrainActionsContext;

export function useBrain(): BrainContextType {
  const state = useBrainState();
  const actions = useBrainActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function BrainProvider({ children }: { children: ReactNode }): JSX.Element {
  const { actionsValue, stateValue } = useBrainRuntime();

  return (
    <BrainStateContext.Provider value={stateValue}>
      <BrainActionsContext.Provider value={actionsValue}>{children}</BrainActionsContext.Provider>
    </BrainStateContext.Provider>
  );
}
