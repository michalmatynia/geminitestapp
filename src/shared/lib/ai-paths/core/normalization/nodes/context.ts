import { type AiNode } from '@/shared/contracts/ai-paths';

import { CONTEXT_INPUT_PORTS, CONTEXT_OUTPUT_PORTS, DEFAULT_CONTEXT_ROLE } from '../../constants';
import { ensureUniquePorts, normalizePortName } from '../../utils/graph.ports';

export const normalizeContextNode = (node: AiNode): AiNode => {
  const contextConfig = node.config?.context;
  const cleanedOutputs = (node.outputs ?? []).filter(
    (port: string): boolean => normalizePortName(port) !== 'role'
  );
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], CONTEXT_INPUT_PORTS),
    outputs: ensureUniquePorts(cleanedOutputs, CONTEXT_OUTPUT_PORTS),
    config: {
      ...node.config,
      context: {
        role: contextConfig?.role ?? DEFAULT_CONTEXT_ROLE,
        entityType: contextConfig?.entityType ?? 'auto',
        entityIdSource: contextConfig?.entityIdSource ?? 'simulation',
        entityId: contextConfig?.entityId ?? '',
        scopeMode: contextConfig?.scopeMode ?? 'full',
        scopeTarget: contextConfig?.scopeTarget ?? 'entity',
        includePaths: contextConfig?.includePaths ?? [],
        excludePaths: contextConfig?.excludePaths ?? [],
      },
    },
  };
};
