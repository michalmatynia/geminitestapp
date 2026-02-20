import 'server-only';

import type { AiNode } from '@/shared/contracts/ai-paths';

export type DisabledNodePolicyViolation = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
};

const toNodeTypeSet = (value: string | undefined): Set<string> => {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(',')
      .map((item: string): string => item.trim().toLowerCase())
      .filter((item: string): boolean => item.length > 0)
  );
};

export const resolveDisabledNodeTypesPolicy = (): Set<string> =>
  toNodeTypeSet(process.env['AI_PATHS_DISABLED_NODE_TYPES']);

export const evaluateDisabledNodeTypesPolicy = (nodes: AiNode[]): {
  disabledNodeTypes: string[];
  violations: DisabledNodePolicyViolation[];
} => {
  const disabledTypes = resolveDisabledNodeTypesPolicy();
  if (disabledTypes.size === 0) {
    return { disabledNodeTypes: [], violations: [] };
  }
  const violations: DisabledNodePolicyViolation[] = nodes
    .filter((node: AiNode): boolean => disabledTypes.has(node.type.toLowerCase()))
    .map((node: AiNode): DisabledNodePolicyViolation => ({
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? node.id,
    }));

  return {
    disabledNodeTypes: Array.from(disabledTypes),
    violations,
  };
};

export const formatDisabledNodeTypesPolicyMessage = (
  violations: DisabledNodePolicyViolation[]
): string => {
  const uniqueTypes = Array.from(new Set(violations.map((entry) => entry.nodeType)));
  return `Path blocked by node policy: disabled node types detected (${uniqueTypes.join(', ')}).`;
};
