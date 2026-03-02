import { useCallback } from 'react';
import type { RuntimeState, Edge } from '@/shared/lib/ai-paths';
import { pruneRuntimeInputsState } from '@/features/ai/ai-paths/logic/runtime-pruning';

export function useAiPathsRuntimeManagement(args: {
  setRuntimeState: (state: (prev: RuntimeState) => RuntimeState) => void;
}) {
  const { setRuntimeState } = args;

  const pruneRuntimeInputs = useCallback(
    (removedEdges: Edge[], remainingEdges: Edge[]): void => {
      setRuntimeState((prev) =>
        pruneRuntimeInputsState(prev, removedEdges, remainingEdges)
      );
    },
    [setRuntimeState]
  );

  const clearRuntimeInputsForEdges = useCallback(
    (targetEdges: Edge[]): void => {
      if (targetEdges.length === 0) return;
      pruneRuntimeInputs(targetEdges, []);
    },
    [pruneRuntimeInputs]
  );

  const clearRuntimeForNode = useCallback(
    (nodeId: string): void => {
      setRuntimeState((prev) => {
        const nextInputs = { ...prev.inputs };
        delete nextInputs[nodeId];
        const nextOutputs = { ...prev.outputs };
        delete nextOutputs[nodeId];
        return { ...prev, inputs: nextInputs, outputs: nextOutputs };
      });
    },
    [setRuntimeState]
  );

  return {
    pruneRuntimeInputs,
    clearRuntimeInputsForEdges,
    clearRuntimeForNode,
  };
}
