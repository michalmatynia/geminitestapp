'use client';

import type { RuntimeHistoryEntry, RuntimePortValues } from '@/shared/lib/ai-paths';

import {
  useRuntimeActions,
  useRuntimeDataState,
  useRuntimeState,
  useRuntimeStatusState,
  useRuntimeUiState,
} from './RuntimeContext.shared';

export {
  useRuntimeState,
  useRuntimeActions,
  useRuntimeStatusState,
  useRuntimeDataState,
  useRuntimeUiState,
};

export function useNodeRuntime(nodeId: string): {
  inputs: RuntimePortValues | undefined;
  outputs: RuntimePortValues | undefined;
  history: RuntimeHistoryEntry[] | undefined;
} {
  const { runtimeState } = useRuntimeDataState();
  return {
    inputs: runtimeState.inputs?.[nodeId],
    outputs: runtimeState.outputs?.[nodeId],
    history: runtimeState.history?.[nodeId],
  };
}
