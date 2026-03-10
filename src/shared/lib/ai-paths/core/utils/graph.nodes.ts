import type { AiNode, NodePortContract, NodePortValueKind } from '@/shared/contracts/ai-paths';

import { palette } from '../definitions';
import { normalizePortName } from './graph.ports';

type PortContract = NodePortContract;

type InputCardinality = 'one' | 'many';
type NodePortCardinality = 'single' | 'many';
type ResolvedNodePortContractSource = 'runtime' | 'node' | 'definition' | 'legacy';
type ResolvedNodePortCardinalitySource =
  | 'runtime_contract'
  | 'runtime_cardinality'
  | 'node'
  | 'definition'
  | 'legacy';

const definitionInputContractsByType = new Map<string, Record<string, PortContract>>();
const definitionOutputContractsByType = new Map<string, Record<string, PortContract>>();

palette.forEach((definition): void => {
  if (!definition?.type) return;
  if (definition.inputContracts) {
    const existing = definitionInputContractsByType.get(definition.type) ?? {};
    definitionInputContractsByType.set(definition.type, {
      ...existing,
      ...definition.inputContracts,
    });
  }
  if (definition.outputContracts) {
    const existingOutputs = definitionOutputContractsByType.get(definition.type) ?? {};
    definitionOutputContractsByType.set(definition.type, {
      ...existingOutputs,
      ...definition.outputContracts,
    });
  }
});

const resolvePortContract = (
  contracts: Record<string, PortContract> | undefined,
  portName: string
): PortContract | null => {
  if (!contracts) return null;
  if (contracts[portName]) {
    return contracts[portName] ?? null;
  }
  const normalizedPortKey = normalizePortName(portName).trim().toLowerCase();
  for (const [rawKey, contract] of Object.entries(contracts)) {
    if (!contract) continue;
    const normalizedContractKey = normalizePortName(rawKey).trim().toLowerCase();
    if (normalizedContractKey === normalizedPortKey) {
      return contract;
    }
  }
  return null;
};

const normalizeNodePortCardinality = (value: unknown): NodePortCardinality | null =>
  value === 'many' ? 'many' : value === 'single' ? 'single' : null;

const normalizePortValueKind = (value: unknown): NodePortValueKind => {
  switch (value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'json':
    case 'image_url':
    case 'bundle':
    case 'job_envelope':
      return value;
    default:
      return 'unknown';
  }
};

export type ResolvedNodePortContract = {
  required: boolean;
  cardinality: NodePortCardinality;
  cardinalitySource: ResolvedNodePortCardinalitySource;
  kind: NodePortValueKind;
  schema?: Record<string, unknown> | undefined;
  schemaRef?: string | undefined;
  source: ResolvedNodePortContractSource;
  declared: boolean;
};

const buildResolvedNodePortContract = (args: {
  contract: PortContract | null;
  source: ResolvedNodePortContractSource;
  cardinalityFallback: NodePortCardinality;
  cardinalitySource: ResolvedNodePortCardinalitySource;
}): ResolvedNodePortContract => ({
  required: args.contract ? args.contract.required !== false : false,
  cardinality: normalizeNodePortCardinality(args.contract?.cardinality) ?? args.cardinalityFallback,
  cardinalitySource:
    normalizeNodePortCardinality(args.contract?.cardinality) !== null
      ? args.source === 'runtime'
        ? 'runtime_contract'
        : args.source === 'node'
          ? 'node'
          : args.source === 'definition'
            ? 'definition'
            : args.cardinalitySource
      : args.cardinalitySource,
  kind: normalizePortValueKind(args.contract?.kind),
  schema: args.contract?.schema,
  schemaRef: args.contract?.schemaRef,
  source: args.source,
  declared: args.source !== 'legacy',
});

const getLegacyInputCardinality = (node: AiNode, portName: string): InputCardinality => {
  const runtimeInputCardinality = (
    node.config?.runtime as { inputCardinality?: Record<string, InputCardinality> } | undefined
  )?.inputCardinality;
  if (runtimeInputCardinality?.[portName]) {
    return runtimeInputCardinality[portName];
  }
  const normalizedPortName = normalizePortName(portName).trim().toLowerCase();
  if (runtimeInputCardinality) {
    for (const [rawKey, value] of Object.entries(runtimeInputCardinality)) {
      if (normalizePortName(rawKey).trim().toLowerCase() === normalizedPortName) {
        return value;
      }
    }
  }
  const name = portName.toLowerCase();
  if (
    name === 'bundle' ||
    name === 'result' ||
    name === 'context' ||
    name === 'images' ||
    name === 'imageurls'
  ) {
    return 'many';
  }
  return 'one';
};

export const getNodeInputPortCardinality = (node: AiNode, portName: string): InputCardinality => {
  const resolved = getResolvedNodeInputPortContract(node, portName);
  return resolved.cardinality === 'many' ? 'many' : 'one';
};

export const getResolvedNodeInputPortContract = (
  node: AiNode,
  portName: string
): ResolvedNodePortContract => {
  const runtimeInputCardinality = (
    node.config?.runtime as { inputCardinality?: Record<string, InputCardinality> } | undefined
  )?.inputCardinality;
  const legacyCardinality = getLegacyInputCardinality(node, portName);
  const cardinalityFallback = legacyCardinality === 'many' ? 'many' : 'single';
  const normalizedPortName = normalizePortName(portName).trim().toLowerCase();
  let cardinalitySource: ResolvedNodePortCardinalitySource = 'legacy';
  if (runtimeInputCardinality?.[portName]) {
    cardinalitySource = 'runtime_cardinality';
  } else if (runtimeInputCardinality) {
    for (const [rawKey] of Object.entries(runtimeInputCardinality)) {
      if (normalizePortName(rawKey).trim().toLowerCase() === normalizedPortName) {
        cardinalitySource = 'runtime_cardinality';
        break;
      }
    }
  }

  const runtimeContract = resolvePortContract(node.config?.runtime?.inputContracts, portName);
  if (runtimeContract) {
    return buildResolvedNodePortContract({
      contract: runtimeContract,
      source: 'runtime',
      cardinalityFallback,
      cardinalitySource,
    });
  }
  const nodeContract = resolvePortContract(node.inputContracts, portName);
  if (nodeContract) {
    return buildResolvedNodePortContract({
      contract: nodeContract,
      source: 'node',
      cardinalityFallback,
      cardinalitySource,
    });
  }
  const definitionContract = resolvePortContract(
    definitionInputContractsByType.get(node.type),
    portName
  );
  if (definitionContract) {
    return buildResolvedNodePortContract({
      contract: definitionContract,
      source: 'definition',
      cardinalityFallback,
      cardinalitySource,
    });
  }
  const name = portName.toLowerCase();
  return {
    required: name === 'trigger' || name === 'prompt' || name === 'value',
    cardinality: cardinalityFallback,
    cardinalitySource,
    kind: 'unknown',
    source: 'legacy',
    declared: false,
  };
};

export const getNodeInputPortContract = (node: AiNode, portName: string): { required: boolean } => {
  return { required: getResolvedNodeInputPortContract(node, portName).required };
};

export const getResolvedNodeOutputPortContract = (
  node: AiNode,
  portName: string
): ResolvedNodePortContract => {
  const nodeContract = resolvePortContract(node.outputContracts, portName);
  if (nodeContract) {
    return buildResolvedNodePortContract({
      contract: nodeContract,
      source: 'node',
      cardinalityFallback: 'single',
      cardinalitySource: 'legacy',
    });
  }
  const definitionContract = resolvePortContract(
    definitionOutputContractsByType.get(node.type),
    portName
  );
  if (definitionContract) {
    return buildResolvedNodePortContract({
      contract: definitionContract,
      source: 'definition',
      cardinalityFallback: 'single',
      cardinalitySource: 'legacy',
    });
  }
  return {
    required: false,
    cardinality: 'single',
    cardinalitySource: 'legacy',
    kind: 'unknown',
    source: 'legacy',
    declared: false,
  };
};

export const createParserMappings = (outputs: string[]): Record<string, string> =>
  outputs.reduce<Record<string, string>>((acc, port) => {
    if (port !== 'bundle') {
      acc[port] = port;
    }
    return acc;
  }, {});

export const createViewerOutputs = (inputs: string[]): Record<string, string> =>
  inputs.reduce<Record<string, string>>((acc, port) => {
    if (port !== 'trigger') {
      acc[port] = port;
    }
    return acc;
  }, {});
