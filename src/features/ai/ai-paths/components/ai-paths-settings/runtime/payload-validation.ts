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

const MAX_CONTEXT_ARRAY_ITEMS = 32;
const MAX_CONTEXT_OBJECT_KEYS = 64;
const MAX_CONTEXT_DEPTH = 8;
const MAX_CONTEXT_STRING_LENGTH = 1_500;
const COMPACT_CONTEXT_MAX_JSON_BYTES = 12_000;

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

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const truncateText = (value: string): string =>
  value.length > MAX_CONTEXT_STRING_LENGTH ? value.slice(0, MAX_CONTEXT_STRING_LENGTH) : value;

const sanitizeContextValue = (value: unknown, depth: number, seen: WeakSet<object>): unknown => {
  if (depth > MAX_CONTEXT_DEPTH) return undefined;
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'string') return truncateText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (let index = 0; index < Math.min(MAX_CONTEXT_ARRAY_ITEMS, value.length); index += 1) {
      const sanitized = sanitizeContextValue(value[index], depth + 1, seen);
      if (sanitized !== undefined) {
        next.push(sanitized);
      }
    }
    return next;
  }

  if (!isObjectRecord(value)) {
    return undefined;
  }

  if (seen.has(value)) return undefined;
  seen.add(value);

  const entries = Object.entries(value).slice(0, MAX_CONTEXT_OBJECT_KEYS);
  const next: Record<string, unknown> = {};
  entries.forEach(([key, item]) => {
    const sanitized = sanitizeContextValue(item, depth + 1, seen);
    if (sanitized !== undefined) {
      next[key] = sanitized;
    }
  });
  return next;
};

const pickCompactContextValue = (
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  keys.forEach((key) => {
    const value = source[key];
    if (value !== undefined) {
      next[key] = value;
    }
  });
  return next;
};

export const isInvalidEnqueuePayloadError = (errorMessage: string | null | undefined): boolean => {
  if (typeof errorMessage !== 'string') return false;
  return /^invalid payload\b/i.test(errorMessage.trim());
};

export const sanitizeTriggerContextForEnqueue = (
  triggerContext: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized = sanitizeContextValue(triggerContext, 0, new WeakSet());
  if (!isObjectRecord(sanitized)) return {};
  return sanitized;
};

export const compactTriggerContextForEnqueue = (
  triggerContext: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized = sanitizeTriggerContextForEnqueue(triggerContext);
  const serialized = JSON.stringify(sanitized);
  if (!serialized || serialized.length <= COMPACT_CONTEXT_MAX_JSON_BYTES) {
    return sanitized;
  }

  const compact: Record<string, unknown> = pickCompactContextValue(sanitized, [
    'timestamp',
    'entityId',
    'productId',
    'entityType',
    'contextSource',
    'source',
    'simulationNodeId',
    'simulationNodeTitle',
  ]);

  if (isObjectRecord(sanitized['source'])) {
    const sourceCompact = pickCompactContextValue(sanitized['source'], [
      'pathId',
      'pathName',
      'tab',
    ]);
    if (Object.keys(sourceCompact).length > 0) compact['source'] = sourceCompact;
  }

  if (isObjectRecord(sanitized['event'])) {
    const event = sanitized['event'];
    const eventCompact = pickCompactContextValue(event, ['id', 'nodeId', 'nodeTitle', 'type']);
    if (isObjectRecord(event['pointer'])) {
      const pointerCompact = pickCompactContextValue(event['pointer'], [
        'button',
        'buttons',
        'clientX',
        'clientY',
        'altKey',
        'ctrlKey',
        'shiftKey',
        'metaKey',
      ]);
      if (Object.keys(pointerCompact).length > 0) {
        eventCompact['pointer'] = pointerCompact;
      }
    }
    if (Object.keys(eventCompact).length > 0) {
      compact['event'] = eventCompact;
    }
  }

  if (isObjectRecord(sanitized['extras'])) {
    const extrasCompact = pickCompactContextValue(sanitized['extras'], ['triggerLabel']);
    if (Object.keys(extrasCompact).length > 0) compact['extras'] = extrasCompact;
  }

  if (isObjectRecord(sanitized['user'])) {
    const userCompact = pickCompactContextValue(sanitized['user'], ['id', 'email', 'name']);
    if (Object.keys(userCompact).length > 0) compact['user'] = userCompact;
  }

  return compact;
};

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
