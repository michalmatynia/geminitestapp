import type { RuntimeState, Edge } from '@/shared/lib/ai-paths';

export function pruneRuntimeInputsState(
  state: RuntimeState,
  removedEdges: Edge[],
  remainingEdges: Edge[]
): RuntimeState {
  if (removedEdges.length === 0) return state;

  const remainingTargets = new Set<string>();
  remainingEdges.forEach((edge) => {
    if (!edge.to || !edge.toPort) return;
    remainingTargets.add(`${edge.to}:${edge.toPort}`);
  });

  const existingInputs = state.inputs ?? {};
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

  if (!changed) return state;

  return { ...state, inputs: nextInputs };
}
