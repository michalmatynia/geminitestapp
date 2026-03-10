'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useGenerationRuntime } from './useGenerationRuntime';

import type {
  GenerationActions,
  GenerationState,
} from './GenerationContext.types';

export type {
  GenerationRecord,
  GenerationLandingSlot,
  GenerationState,
  GenerationActions,
} from './GenerationContext.types';

const GenerationStateContext = createContext<GenerationState | null>(null);
const GenerationActionsContext = createContext<GenerationActions | null>(null);

export function GenerationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { state, actions } = useGenerationRuntime();

  return (
    <GenerationActionsContext.Provider value={actions}>
      <GenerationStateContext.Provider value={state}>{children}</GenerationStateContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

export function useGenerationState(): GenerationState {
  const context = useContext(GenerationStateContext);
  if (!context) {
    throw internalError('useGenerationState must be used within a GenerationProvider');
  }
  return context;
}

export function useGenerationActions(): GenerationActions {
  const context = useContext(GenerationActionsContext);
  if (!context) {
    throw internalError('useGenerationActions must be used within a GenerationProvider');
  }
  return context;
}
