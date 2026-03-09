import { AiNode } from '@/shared/contracts/ai-paths';

import { EngineStateManager } from './engine-state-manager';
import {
  checkContextMatchesSimulation,
  hasValuableSimulationContext,
  isSimulationCapableFetcher,
} from './engine-utils';

export type TriggerProvenanceContext = {
  scopedNodeIds: Set<string>;
  nodeById: Map<string, AiNode>;
  state: EngineStateManager;
  triggerContext: Record<string, unknown> | null;
  triggerSource: AiNode | null;
};

export const checkTriggerProvenance = (ctx: TriggerProvenanceContext): boolean => {
  const { scopedNodeIds, nodeById, state, triggerContext } = ctx;
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

  if (hasLiveProvenance || hasSimNodeProvenance) {
    return true;
  }

  const hasPotentialSimNode = simulationNodesInScope.some((n) => !state.finishedNodes.has(n.id));
  return hasPotentialSimNode;
};

export const validateTriggerProvenanceFeasibility = (ctx: TriggerProvenanceContext): void => {
  void ctx;
};
