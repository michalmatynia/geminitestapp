'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useVersionGraphRuntime } from './useVersionGraphRuntime';

import type {
  VersionGraphActions,
  VersionGraphState,
} from './version-graph-context-types';

export type { VersionNode, VersionEdge, LayoutMode } from '@/features/ai/image-studio/utils/version-graph';
export type {
  VersionGraphState,
  VersionGraphActions,
} from './version-graph-context-types';

const { Context: VersionGraphStateContext, useStrictContext: useVersionGraphState } =
  createStrictContext<VersionGraphState>({
    hookName: 'useVersionGraphState',
    providerName: 'a VersionGraphProvider',
    displayName: 'VersionGraphStateContext',
    errorFactory: internalError,
  });
const { Context: VersionGraphActionsContext, useStrictContext: useVersionGraphActions } =
  createStrictContext<VersionGraphActions>({
    hookName: 'useVersionGraphActions',
    providerName: 'a VersionGraphProvider',
    displayName: 'VersionGraphActionsContext',
    errorFactory: internalError,
  });

export function VersionGraphProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { state, actions } = useVersionGraphRuntime();

  return (
    <VersionGraphActionsContext.Provider value={actions}>
      <VersionGraphStateContext.Provider value={state}>
        {children}
      </VersionGraphStateContext.Provider>
    </VersionGraphActionsContext.Provider>
  );
}

export { useVersionGraphState, useVersionGraphActions };
