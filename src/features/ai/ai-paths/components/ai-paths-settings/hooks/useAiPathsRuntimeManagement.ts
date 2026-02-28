import { useCallback } from 'react';
import type { RuntimeState, Edge } from '@/shared/lib/ai-paths';

export function useAiPathsRuntimeManagement(args: {
  setRuntimeState: (state: (prev: RuntimeState) => RuntimeState) => void;
}) {
  const { setRuntimeState } = args;

  const pruneRuntimeInputs = useCallback(
    (removedEdges: Edge[], remainingEdges: Edge[]): void => {
      if (removedEdges.length === 0) return;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge) => {
        if (!edge.to || !edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      setRuntimeState((prev) => {
        const existingInputs = prev.inputs ?? {};
        let nextInputs = existingInputs;
        let changed = false;

        removedEdges.forEach((edge) => {
          if (!edge.to || !edge.toPort) return;
          const targetKey = `${edge.to}:${edge.toPort}`;
          if (remainingTargets.has(targetKey)) return;
          const nodeInputs = nextInputs?.[edge.to] ?? {};
          if (!(edge.toPort in nodeInputs)) return;
          if (!changed) {
            nextInputs = { ...existingInputs };
            changed = true;
          }
          const nextNodeInputs = { ...nodeInputs };
          delete nextNodeInputs[edge.toPort];
          if (Object.keys(nextNodeInputs).length === 0) {
            delete nextInputs[edge.to];
          } else {
            nextInputs[edge.to] = nextNodeInputs;
          }
        });

        if (!changed) return prev;
        return { ...prev, inputs: nextInputs };
      });
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
