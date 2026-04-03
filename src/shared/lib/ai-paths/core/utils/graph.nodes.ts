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
const LEGACY_MANY_INPUT_PORT_NAMES = new Set(['bundle', 'result', 'context', 'images', 'imageurls']);

const canonicalizePortLookupKey = (portName: string): string =>
  normalizePortName(portName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

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
  const normalizedPortKey = canonicalizePortLookupKey(portName);
  for (const [rawKey, contract] of Object.entries(contracts)) {
    if (!contract) continue;
    const normalizedContractKey = canonicalizePortLookupKey(rawKey);
    if (normalizedContractKey === normalizedPortKey) {
      return contract;
    }
  }
  return null;
};

const normalizeNodePortCardinality = (value: unknown): NodePortCardinality | null =>
  value === 'many' ? 'many' : value === 'single' ? 'single' : null;

const readRuntimeInputCardinality = (
  node: AiNode
): Record<string, InputCardinality> | undefined =>
  (node.config?.runtime as { inputCardinality?: Record<string, InputCardinality> } | undefined)
    ?.inputCardinality;

const resolveLegacyRuntimeInputCardinality = (
  inputCardinality: Record<string, InputCardinality> | undefined,
  portName: string
): InputCardinality | null => {
  if (inputCardinality?.[portName]) {
    return inputCardinality[portName];
  }
  if (!inputCardinality) {
    return null;
  }

  const normalizedPortName = canonicalizePortLookupKey(portName);
  const matchingEntry = Object.entries(inputCardinality).find(
    ([rawKey]) => canonicalizePortLookupKey(rawKey) === normalizedPortName
  );
  return matchingEntry?.[1] ?? null;
};

const hasMatchingPortLookupKey = (
  values: Record<string, unknown> | undefined,
  portName: string
): boolean => {
  if (!values) return false;
  const lookupKey = canonicalizePortLookupKey(portName);
  return Object.keys(values).some((rawKey) => canonicalizePortLookupKey(rawKey) === lookupKey);
};

const resolveLegacyInputCardinalityFallback = (portName: string): InputCardinality =>
  LEGACY_MANY_INPUT_PORT_NAMES.has(canonicalizePortLookupKey(portName)) ? 'many' : 'one';

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
  const runtimeCardinality = resolveLegacyRuntimeInputCardinality(
    readRuntimeInputCardinality(node),
    portName
  );
  return runtimeCardinality ?? resolveLegacyInputCardinalityFallback(portName);
};

const resolveInputPortCardinalityFallback = (node: AiNode, portName: string) => {
  const runtimeInputCardinality = readRuntimeInputCardinality(node);
  const legacyCardinality = getLegacyInputCardinality(node, portName);
  return {
    cardinalityFallback: legacyCardinality === 'many' ? ('many' as const) : ('single' as const),
    cardinalitySource: hasMatchingPortLookupKey(runtimeInputCardinality, portName)
      ? ('runtime_cardinality' as const)
      : ('legacy' as const),
  };
};

const resolveInputPortContractCandidate = (
  node: AiNode,
  portName: string
): { contract: PortContract; source: ResolvedNodePortContractSource } | null => {
  const runtimeContract = resolvePortContract(node.config?.runtime?.inputContracts, portName);
  if (runtimeContract) {
    return { contract: runtimeContract, source: 'runtime' };
  }

  const nodeContract = resolvePortContract(node.inputContracts, portName);
  if (nodeContract) {
    return { contract: nodeContract, source: 'node' };
  }

  const definitionContract = resolvePortContract(
    definitionInputContractsByType.get(node.type),
    portName
  );
  if (definitionContract) {
    return { contract: definitionContract, source: 'definition' };
  }

  return null;
};

const buildLegacyResolvedNodeInputPortContract = (
  portName: string,
  cardinalityFallback: NodePortCardinality,
  cardinalitySource: ResolvedNodePortCardinalitySource
): ResolvedNodePortContract => {
  const normalizedPortName = portName.toLowerCase();
  return {
    required:
      normalizedPortName === 'trigger' ||
      normalizedPortName === 'prompt' ||
      normalizedPortName === 'value',
    cardinality: cardinalityFallback,
    cardinalitySource,
    kind: 'unknown',
    source: 'legacy',
    declared: false,
  };
};

export const getNodeInputPortCardinality = (node: AiNode, portName: string): InputCardinality => {
  const resolved = getResolvedNodeInputPortContract(node, portName);
  return resolved.cardinality === 'many' ? 'many' : 'one';
};

export const getResolvedNodeInputPortContract = (
  node: AiNode,
  portName: string
): ResolvedNodePortContract => {
  const { cardinalityFallback, cardinalitySource } = resolveInputPortCardinalityFallback(
    node,
    portName
  );
  const contractCandidate = resolveInputPortContractCandidate(node, portName);
  if (contractCandidate) {
    return buildResolvedNodePortContract({
      contract: contractCandidate.contract,
      source: contractCandidate.source,
      cardinalityFallback,
      cardinalitySource,
    });
  }

  return buildLegacyResolvedNodeInputPortContract(portName, cardinalityFallback, cardinalitySource);
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
