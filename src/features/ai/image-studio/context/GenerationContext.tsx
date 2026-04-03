'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: GenerationStateContext, useStrictContext: useGenerationState } =
  createStrictContext<GenerationState>({
    hookName: 'useGenerationState',
    providerName: 'a GenerationProvider',
    displayName: 'GenerationStateContext',
    errorFactory: internalError,
  });
const { Context: GenerationActionsContext, useStrictContext: useGenerationActions } =
  createStrictContext<GenerationActions>({
    hookName: 'useGenerationActions',
    providerName: 'a GenerationProvider',
    displayName: 'GenerationActionsContext',
    errorFactory: internalError,
  });

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

export { useGenerationState, useGenerationActions };
