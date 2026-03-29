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

const normalizeEntityNode = <TConfigKey extends 'fetcher' | 'simulation'>(args: {
  node: AiNode;
  configKey: TConfigKey;
  configValue: NonNullable<AiNode['config']>[TConfigKey];
  inputs: AiNode['inputs'];
  outputs: AiNode['outputs'];
}): AiNode => ({
  ...args.node,
  inputs: args.inputs,
  outputs: args.outputs,
  config: {
    ...args.node.config,
    [args.configKey]: args.configValue,
  },
});

export const normalizeFetcherNode = (node: AiNode): AiNode =>
  normalizeEntityNode({
    node,
    configKey: 'fetcher',
    configValue: buildFetcherConfig(node.config?.fetcher),
    inputs: FETCHER_INPUT_PORTS,
    outputs: FETCHER_OUTPUT_PORTS,
  });

export const normalizeSimulationNode = (node: AiNode): AiNode =>
  normalizeEntityNode({
    node,
    configKey: 'simulation',
    configValue: buildSimulationConfig(node.config?.simulation),
    inputs: SIMULATION_INPUT_PORTS,
    outputs: SIMULATION_OUTPUT_PORTS,
  });
