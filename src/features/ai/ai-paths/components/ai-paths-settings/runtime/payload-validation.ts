import { z } from 'zod';

import { aiNodeSchema, edgeSchema } from '@/shared/contracts/ai-paths';
import type { AiNode, Edge } from '@/shared/lib/ai-paths';

export type RunNodePayloadIssue = {
  nodeId: string;
  missingFields: string[];
};

export type RunEnqueuePayloadInput = {
  pathId: string;
  pathName?: string;
  nodes: AiNode[];
  edges: Edge[];
  triggerEvent?: string;
  triggerNodeId?: string;
  triggerContext?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  meta?: Record<string, unknown> | null;
};

export type RunEnqueuePayloadIssue = {
  path: string;
  message: string;
};

const runEnqueuePayloadSchema = z.object({
  pathId: z.string().trim().min(1),
  pathName: z.string().trim().optional(),
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  triggerEvent: z.string().trim().optional(),
  triggerNodeId: z.string().trim().optional(),
  triggerContext: z.record(z.string(), z.unknown()).nullable().optional(),
  entityId: z.string().trim().nullable().optional(),
  entityType: z.string().trim().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
});

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

const formatIssuePath = (segments: ReadonlyArray<PropertyKey>): string => {
  if (segments.length === 0) return '(root)';
  return segments
    .map((segment) => {
      if (typeof segment === 'symbol') {
        return segment.description ?? '(symbol)';
      }
      return String(segment);
    })
    .join('.');
};

export const collectInvalidRunEnqueuePayloadIssues = (
  payload: RunEnqueuePayloadInput
): RunEnqueuePayloadIssue[] => {
  const parsed = runEnqueuePayloadSchema.safeParse(payload);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
};

export const collectInvalidRunEnqueueSerializationIssues = (
  payload: RunEnqueuePayloadInput
): RunEnqueuePayloadIssue[] => {
  let serialized = '';
  try {
    serialized = JSON.stringify(payload);
  } catch (error) {
    return [
      {
        path: '(root)',
        message:
          error instanceof Error && error.message
            ? error.message
            : 'Enqueue payload is not JSON-serializable.',
      },
    ];
  }
  if (!serialized) {
    return [{ path: '(root)', message: 'Enqueue payload serialized to an empty body.' }];
  }
  let reparsed: unknown;
  try {
    reparsed = JSON.parse(serialized);
  } catch {
    return [{ path: '(root)', message: 'Serialized enqueue payload is invalid JSON.' }];
  }

  const parsed = runEnqueuePayloadSchema.safeParse(reparsed);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
};
