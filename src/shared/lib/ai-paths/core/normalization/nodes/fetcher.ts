import type {
  AiNode,
  FetcherConfig,
  SimulationConfig,
} from '@/shared/contracts/ai-paths';

import {
  FETCHER_INPUT_PORTS,
  FETCHER_OUTPUT_PORTS,
  SIMULATION_INPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
} from '../../constants';

type EntityIdConfig = {
  entityId?: string;
  productId?: string;
};

type FetcherConfigShape = EntityIdConfig & {
  entityType?: string;
  sourceMode?: FetcherConfig['sourceMode'];
};

type SimulationConfigShape = EntityIdConfig & {
  entityType?: string;
  runBehavior?: SimulationConfig['runBehavior'];
};

const resolveEntityId = (config?: EntityIdConfig): string =>
  config?.entityId ?? config?.productId ?? '';

const buildFetcherConfig = (
  fetcherConfig?: FetcherConfigShape,
): FetcherConfig => {
  const entityId = resolveEntityId(fetcherConfig);

  return {
    sourceMode: fetcherConfig?.sourceMode ?? 'live_context',
    entityType: fetcherConfig?.entityType ?? 'product',
    entityId,
    productId: entityId,
  };
};

const buildSimulationConfig = (
  simulationConfig?: SimulationConfigShape,
): SimulationConfig => {
  const entityId = resolveEntityId(simulationConfig);

  return {
    productId: entityId,
    entityType: simulationConfig?.entityType ?? 'product',
    entityId,
    runBehavior:
      simulationConfig?.runBehavior ?? 'before_connected_trigger',
  };
};

export const normalizeFetcherNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: FETCHER_INPUT_PORTS,
    outputs: FETCHER_OUTPUT_PORTS,
    config: {
      ...node.config,
      fetcher: buildFetcherConfig(node.config?.fetcher),
    },
  };
};

export const normalizeSimulationNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: SIMULATION_INPUT_PORTS,
    outputs: SIMULATION_OUTPUT_PORTS,
    config: {
      ...node.config,
      simulation: buildSimulationConfig(node.config?.simulation),
    },
  };
};
