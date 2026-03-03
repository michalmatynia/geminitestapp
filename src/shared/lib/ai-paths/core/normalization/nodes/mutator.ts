import { type AiNode } from '@/shared/contracts/ai-paths';
import { STRING_MUTATOR_INPUT_PORTS, STRING_MUTATOR_OUTPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils/graph.ports';

export const normalizeMutatorNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      mutator: {
        path: node.config?.mutator?.path ?? 'entity.title',
        valueTemplate: node.config?.mutator?.valueTemplate ?? '{{value}}',
      },
    },
  };
};

export const normalizeStringMutatorNode = (node: AiNode): AiNode => {
  const operations = node.config?.stringMutator?.operations;
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], STRING_MUTATOR_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], STRING_MUTATOR_OUTPUT_PORTS),
    config: {
      ...node.config,
      stringMutator: {
        operations: Array.isArray(operations) ? operations : [],
      },
    },
  };
};
