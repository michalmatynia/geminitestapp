'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type {
  VersionGraphActions,
  VersionGraphState,
} from './version-graph-context-types';
import { useVersionGraphRuntime } from './useVersionGraphRuntime';

export type { VersionNode, VersionEdge, LayoutMode } from '@/features/ai/image-studio/utils/version-graph';
export type {
  VersionGraphState,
  VersionGraphActions,
} from './version-graph-context-types';

const VersionGraphStateContext = createContext<VersionGraphState | null>(null);
const VersionGraphActionsContext = createContext<VersionGraphActions | null>(null);

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

export function useVersionGraphState(): VersionGraphState {
  const context = useContext(VersionGraphStateContext);
  if (!context) {
    throw internalError('useVersionGraphState must be used within a VersionGraphProvider');
  }
  return context;
}

export function useVersionGraphActions(): VersionGraphActions {
  const context = useContext(VersionGraphActionsContext);
  if (!context) {
    throw internalError('useVersionGraphActions must be used within a VersionGraphProvider');
  }
  return context;
}
