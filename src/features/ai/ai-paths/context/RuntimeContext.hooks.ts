'use client';

import type { RuntimeHistoryEntry, RuntimePortValues } from '@/shared/lib/ai-paths';

import { useRuntimeActions, useRuntimeState } from './RuntimeContext.shared';

export { useRuntimeState, useRuntimeActions };

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
