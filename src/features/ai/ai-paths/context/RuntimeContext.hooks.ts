'use client';

import { useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { RuntimeHistoryEntry, RuntimePortValues } from '@/shared/lib/ai-paths';

import {
  RuntimeActionsContext,
  RuntimeStateContext,
  type RuntimeActions,
  type RuntimeStateData,
} from './RuntimeContext.shared';

export function useRuntimeState(): RuntimeStateData {
  const context = useContext(RuntimeStateContext);
  if (!context) {
    throw internalError('useRuntimeState must be used within a RuntimeProvider');
  }
  return context;
}

export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw internalError('useRuntimeActions must be used within a RuntimeProvider');
  }
  return context;
}

export function useNodeRuntime(nodeId: string): {
  inputs: RuntimePortValues | undefined;
  outputs: RuntimePortValues | undefined;
  history: RuntimeHistoryEntry[] | undefined;
} {
  const { runtimeState } = useRuntimeState();
  return {
    inputs: runtimeState.inputs?.[nodeId],
    outputs: runtimeState.outputs?.[nodeId],
    history: runtimeState.history?.[nodeId],
  };
}
