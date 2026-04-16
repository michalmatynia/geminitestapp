'use client';

import { useCallback } from 'react';

import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import { pruneRuntimeInputsState } from '@/features/ai/ai-paths/logic/runtime-pruning';
import type { Edge } from '@/shared/contracts/ai-paths';

type AiPathsRuntimeManagement = {
  pruneRuntimeInputs: (removedEdges: Edge[], remainingEdges: Edge[]) => void;
  clearRuntimeInputsForEdges: (targetEdges: Edge[]) => void;
  clearRuntimeForNode: (nodeId: string) => void;
};

export function useAiPathsRuntimeManagement(): AiPathsRuntimeManagement {
  const { setRuntimeState } = useRuntimeActions();

  const pruneRuntimeInputs = useCallback(
    (removedEdges: Edge[], remainingEdges: Edge[]): void => {
      setRuntimeState((prev) => pruneRuntimeInputsState(prev, removedEdges, remainingEdges));
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
