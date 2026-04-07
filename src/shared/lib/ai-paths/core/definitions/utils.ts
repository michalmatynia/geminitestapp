import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import { derivePaletteNodeTypeId } from '../utils/node-identity';

export const buildOptionalInputContracts = (inputs: string[]): Record<string, { required: boolean }> =>
  Object.fromEntries(
    inputs.map((port: string): [string, { required: boolean }] => [port, { required: false }])
  );

export const buildRequiredInputContracts = (
  inputs: string[],
  requiredPorts: string[]
): Record<string, { required: boolean }> => {
  const required = new Set(requiredPorts);
  return Object.fromEntries(
    inputs.map((port: string): [string, { required: boolean }] => [
      port,
      { required: required.has(port) },
    ])
  );
};

export const ensurePaletteNodeTypeIds = (definitions: NodeDefinition[]): NodeDefinition[] => {
  const usedNodeTypeIds = new Set<string>();
  return definitions.map((definition: NodeDefinition, index: number): NodeDefinition => {
    let collisionSalt = 0;
    let candidate = derivePaletteNodeTypeId(definition, index, collisionSalt);
    while (usedNodeTypeIds.has(candidate)) {
      collisionSalt += 1;
      candidate = derivePaletteNodeTypeId(definition, index, collisionSalt);
    }
    usedNodeTypeIds.add(candidate);
    if (definition.nodeTypeId === candidate) {
      return definition;
    }
    return {
      ...definition,
      nodeTypeId: candidate,
    };
  });
};
