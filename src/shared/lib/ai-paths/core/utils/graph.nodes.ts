import type { AiNode } from '@/shared/contracts/ai-paths';
import { palette } from '../definitions';
import { normalizePortName } from './graph.ports';

type PortContract = {
  required?: boolean;
};

type InputCardinality = 'one' | 'many';

const definitionInputContractsByType = new Map<string, Record<string, PortContract>>();

palette.forEach((definition): void => {
  if (!definition?.type || !definition?.inputContracts) return;
  const existing = definitionInputContractsByType.get(definition.type) ?? {};
  definitionInputContractsByType.set(definition.type, {
    ...existing,
    ...(definition.inputContracts as Record<string, PortContract>),
  });
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

export const getNodeInputPortCardinality = (
  node: AiNode,
  portName: string
): InputCardinality => {
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
  if (name === 'bundle' || name === 'result' || name === 'context' || name === 'images' || name === 'imageurls') {
    return 'many';
  }
  return 'one';
};

export const getNodeInputPortContract = (
  node: AiNode,
  portName: string
): { required: boolean } => {
  const runtimeContract = resolvePortContract(
    node.config?.runtime?.inputContracts as Record<string, PortContract> | undefined,
    portName
  );
  if (runtimeContract) {
    return { required: runtimeContract.required !== false };
  }
  const nodeContract = resolvePortContract(
    node.inputContracts as Record<string, PortContract> | undefined,
    portName
  );
  if (nodeContract) {
    return { required: nodeContract.required !== false };
  }
  const definitionContract = resolvePortContract(
    definitionInputContractsByType.get(node.type),
    portName
  );
  if (definitionContract) {
    return { required: definitionContract.required !== false };
  }
  const name = portName.toLowerCase();
  if (name === 'trigger' || name === 'prompt' || name === 'value') {
    return { required: true };
  }
  return { required: false };
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
