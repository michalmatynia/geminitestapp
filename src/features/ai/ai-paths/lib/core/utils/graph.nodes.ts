import type { AiNode } from '@/shared/contracts/ai-paths';

export const getNodeInputPortCardinality = (
  _node: AiNode,
  portName: string
): 'one' | 'many' => {
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
  const configured = node.config?.runtime?.inputContracts?.[portName];
  if (configured) {
    return { required: configured.required !== false };
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
