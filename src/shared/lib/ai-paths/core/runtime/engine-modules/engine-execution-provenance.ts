import { AiNode } from '@/shared/contracts/ai-paths';
import {
  checkContextMatchesSimulation,
  hasValuableSimulationContext,
  isSimulationCapableFetcher,
} from './engine-utils';
import { EngineStateManager } from './engine-state-manager';

export type TriggerProvenanceContext = {
  scopedNodeIds: Set<string>;
  nodeById: Map<string, AiNode>;
  state: EngineStateManager;
  triggerContext: Record<string, unknown> | null;
  triggerSource: AiNode | null;
};

export const checkTriggerProvenance = (ctx: TriggerProvenanceContext): boolean => {
  const { scopedNodeIds, nodeById, state, triggerContext, triggerSource } = ctx;
  const simulationNodesInScope = Array.from(scopedNodeIds)
    .map((id) => nodeById.get(id))
    .filter((n): n is AiNode => !!n && (n.type === 'simulation' || isSimulationCapableFetcher(n)));
  const finishedSimulationNodes = simulationNodesInScope.filter((n) =>
    state.finishedNodes.has(n.id)
  );
  const simulationOutputs = finishedSimulationNodes.map((n) => state.outputs[n.id]).filter(Boolean);

  const hasLiveProvenance = triggerContext && checkContextMatchesSimulation(triggerContext);
  const hasSimNodeProvenance = simulationOutputs.some(
    (out) => out && hasValuableSimulationContext((out['context'] as Record<string, unknown>) ?? {})
  );

  if (triggerSource?.type === 'simulation' || hasLiveProvenance || hasSimNodeProvenance) {
    return true;
  }

  const hasPotentialSimNode = simulationNodesInScope.some((n) => !state.finishedNodes.has(n.id));
  return hasPotentialSimNode;
};

export const validateTriggerProvenanceFeasibility = (ctx: TriggerProvenanceContext): void => {
  const { triggerSource, triggerContext, scopedNodeIds, nodeById } = ctx;
  if (
    triggerSource?.config?.trigger?.contextMode === 'simulation_required' &&
    !(
      triggerSource?.type === 'simulation' ||
      (triggerContext && checkContextMatchesSimulation(triggerContext)) ||
      Array.from(scopedNodeIds).some((id) => {
        const n = nodeById.get(id);
        return n && (n.type === 'simulation' || isSimulationCapableFetcher(n));
      })
    )
  ) {
    // Note: Caller should handle GraphExecutionError as it needs RuntimeState snapshot
    throw new Error(
      `Trigger "${triggerSource.title || triggerSource.id}" requires simulation context but none was provided or resolved.`
    );
  }
};
