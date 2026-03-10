import { type AiNode } from '@/shared/contracts/ai-paths';

import {
  FETCHER_INPUT_PORTS,
  FETCHER_OUTPUT_PORTS,
  SIMULATION_INPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
} from '../../constants';

export const normalizeFetcherNode = (node: AiNode): AiNode => {
  const fetcherConfig = node.config?.fetcher;
  const rawEntityId = fetcherConfig?.entityId ?? fetcherConfig?.productId ?? '';
  return {
    ...node,
    inputs: FETCHER_INPUT_PORTS,
    outputs: FETCHER_OUTPUT_PORTS,
    config: {
      ...node.config,
      fetcher: {
        sourceMode: fetcherConfig?.sourceMode ?? 'live_context',
        entityType: fetcherConfig?.entityType ?? 'product',
        entityId: rawEntityId,
        productId: rawEntityId,
      },
    },
  };
};

export const normalizeSimulationNode = (node: AiNode): AiNode => {
  const simulationConfig = node.config?.simulation;
  const rawEntityId = simulationConfig?.entityId ?? simulationConfig?.productId ?? '';
  return {
    ...node,
    inputs: SIMULATION_INPUT_PORTS,
    outputs: SIMULATION_OUTPUT_PORTS,
    config: {
      ...node.config,
      simulation: {
        productId: rawEntityId,
        entityType: simulationConfig?.entityType ?? 'product',
        entityId: rawEntityId,
        runBehavior: simulationConfig?.runBehavior ?? 'before_connected_trigger',
      },
    },
  };
};
