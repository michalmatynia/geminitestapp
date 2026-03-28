'use client';

import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

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

const BrainStateContext = createContext<BrainStateContextType | undefined>(undefined);
const BrainActionsContext = createContext<BrainActionsContextType | undefined>(undefined);

export function useBrainState(): BrainStateContextType {
  const context = useContext(BrainStateContext);
  if (!context) {
    throw internalError('useBrainState must be used within a BrainProvider');
  }
  return context;
}

export function useBrainActions(): BrainActionsContextType {
  const context = useContext(BrainActionsContext);
  if (!context) {
    throw internalError('useBrainActions must be used within a BrainProvider');
  }
  return context;
}

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
