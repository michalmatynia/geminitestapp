import type {
  AiNode,
  NodeDefinition,
  PathConfig,
  NodePortContract,
} from '@/shared/contracts/ai-paths';
import { palette as PALETTE_DEFINITIONS } from '../definitions';

export type PortContractRecord = Record<string, NodePortContract>;

export const resolveDefinitionForNode = (node: AiNode): NodeDefinition | null => {
  const sameType = PALETTE_DEFINITIONS.filter(
    (definition: NodeDefinition): boolean => definition.type === node.type
  );
  if (sameType.length === 0) return null;
  const byTitle = sameType.find(
    (definition: NodeDefinition): boolean => definition.title === node.title
  );
  return byTitle ?? sameType[0] ?? null;
};

export const mergeNodePortContracts = (
  defaults?: PortContractRecord,
  existing?: PortContractRecord
): PortContractRecord | undefined => {
  const keys = Array.from(
    new Set<string>([...Object.keys(defaults ?? {}), ...Object.keys(existing ?? {})])
  ).sort();
  if (keys.length === 0) return undefined;

  const merged: PortContractRecord = {};
  keys.forEach((port: string): void => {
    const defaultContract = defaults?.[port];
    const existingContract = existing?.[port];
    const required =
      existingContract?.required !== undefined
        ? existingContract.required
        : defaultContract?.required;
    const cardinality =
      existingContract?.cardinality !== undefined
        ? existingContract.cardinality
        : defaultContract?.cardinality;
    if (required === undefined && cardinality === undefined) {
      if (existingContract) {
        merged[port] = existingContract;
      }
      return;
    }
    merged[port] = {
      ...(required !== undefined ? { required } : {}),
      ...(cardinality !== undefined ? { cardinality } : {}),
    };
  });
  return Object.keys(merged).length > 0 ? merged : undefined;
};

export const isSameContractRecord = (
  left?: PortContractRecord,
  right?: PortContractRecord
): boolean => {
  const normalize = (value?: PortContractRecord): string => {
    if (!value) return '';
    const normalized = Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key: string): [string, NodePortContract] => {
          const contract = value[key] ?? {};
          return [
            key,
            {
              ...(contract.required !== undefined ? { required: contract.required } : {}),
              ...(contract.cardinality !== undefined ? { cardinality: contract.cardinality } : {}),
            },
          ];
        })
    );
    return JSON.stringify(normalized);
  };
  return normalize(left) === normalize(right);
};

export const applyDefinitionContractsToNode = (
  node: AiNode
): { node: AiNode; changed: boolean } => {
  const definition = resolveDefinitionForNode(node);
  if (!definition) return { node, changed: false };

  const mergedInputContracts = mergeNodePortContracts(
    definition.inputContracts as PortContractRecord | undefined,
    node.inputContracts as PortContractRecord | undefined
  );
  const mergedOutputContracts = mergeNodePortContracts(
    definition.outputContracts as PortContractRecord | undefined,
    node.outputContracts as PortContractRecord | undefined
  );

  const inputChanged = !isSameContractRecord(
    node.inputContracts as PortContractRecord | undefined,
    mergedInputContracts
  );
  const outputChanged = !isSameContractRecord(
    node.outputContracts as PortContractRecord | undefined,
    mergedOutputContracts
  );
  if (!inputChanged && !outputChanged) {
    return { node, changed: false };
  }

  return {
    node: {
      ...node,
      ...(mergedInputContracts ? { inputContracts: mergedInputContracts } : {}),
      ...(mergedOutputContracts ? { outputContracts: mergedOutputContracts } : {}),
    },
    changed: true,
  };
};

export const backfillNodePortContracts = (
  items: AiNode[]
): { nodes: AiNode[]; changed: boolean; changedNodeIds: string[] } => {
  const changedNodeIds: string[] = [];
  const nodes = items.map((node: AiNode): AiNode => {
    const applied = applyDefinitionContractsToNode(node);
    if (applied.changed) changedNodeIds.push(node.id);
    return applied.node;
  });
  return {
    nodes,
    changed: changedNodeIds.length > 0,
    changedNodeIds,
  };
};

export const backfillPathConfigNodeContracts = (
  config: PathConfig
): { config: PathConfig; changed: boolean; changedNodeIds: string[] } => {
  const result = backfillNodePortContracts(config.nodes ?? []);
  if (!result.changed) {
    return {
      config,
      changed: false,
      changedNodeIds: [],
    };
  }
  return {
    config: {
      ...config,
      nodes: result.nodes,
    },
    changed: true,
    changedNodeIds: result.changedNodeIds,
  };
};

export const normalizeTemplateText = (value: string | undefined | null): string => {
  if (typeof value !== 'string') return '';
  if (!value.includes('\\n') || value.includes('\n')) return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  return value.replace(/\\n/g, '\n');
};
