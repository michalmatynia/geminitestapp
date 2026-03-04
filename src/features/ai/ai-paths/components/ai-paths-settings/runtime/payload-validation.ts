import type { AiNode } from '@/shared/lib/ai-paths';

export type RunNodePayloadIssue = {
  nodeId: string;
  missingFields: string[];
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry: unknown): boolean => typeof entry === 'string');

export const collectInvalidRunNodePayloadIssues = (nodes: AiNode[]): RunNodePayloadIssue[] => {
  return nodes.reduce<RunNodePayloadIssue[]>((issues, node: AiNode) => {
    const missingFields: string[] = [];
    if (!isNonEmptyString(node.id)) missingFields.push('id');
    if (!isNonEmptyString(node.type)) missingFields.push('type');
    if (!isStringArray(node.inputs)) missingFields.push('inputs');
    if (!isStringArray(node.outputs)) missingFields.push('outputs');
    if (!isNonEmptyString(node.createdAt)) missingFields.push('createdAt');
    if (!isNullableString(node.updatedAt)) missingFields.push('updatedAt');
    if (missingFields.length === 0) return issues;
    issues.push({
      nodeId: isNonEmptyString(node.id) ? node.id : '(unknown-node)',
      missingFields,
    });
    return issues;
  }, []);
};

