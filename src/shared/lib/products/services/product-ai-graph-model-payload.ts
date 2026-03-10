import {
  graphModelJobEnqueuePayloadSchema,
  type GraphModelJobPayload,
  graphModelQueuedPayloadSchema,
  type GraphModelQueuedPayload,
} from '@/shared/contracts/jobs';
import { hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils/runtime';

type GraphModelStringField = 'modelId' | 'nodeId' | 'nodeTitle' | 'requestedModelId' | 'runId';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readGraphModelPayloadGraphString = (
  payload: unknown,
  key: GraphModelStringField
): string => {
  const record = asRecord(payload);
  const graph = asRecord(record?.['graph']);
  return toTrimmedString(graph?.[key]) ?? '';
};

export const resolveGraphModelRequestedModelId = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => {
  const record = asRecord(payload);
  if (!record) return null;

  const candidates = [
    readGraphModelPayloadGraphString(record, 'requestedModelId'),
    toTrimmedString(record['modelId']),
    readGraphModelPayloadGraphString(record, 'modelId'),
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return null;
};

export const resolveGraphModelCacheKey = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => {
  const record = asRecord(payload);
  if (!record) return null;
  return toTrimmedString(record['cacheKey']);
};

export const resolveGraphModelPayloadHash = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => {
  const record = asRecord(payload);
  if (!record) return null;
  return toTrimmedString(record['payloadHash']);
};

export const readGraphModelAiPathsRunContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
} => ({
  runId: readGraphModelPayloadGraphString(payload, 'runId') || null,
  nodeId: readGraphModelPayloadGraphString(payload, 'nodeId') || null,
  nodeTitle: readGraphModelPayloadGraphString(payload, 'nodeTitle') || null,
});

export const hasAiPathsGraphModelNodeContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => {
  const context = readGraphModelAiPathsRunContext(payload);
  return Boolean(context.runId && context.nodeId);
};

export const resolveGraphModelPayloadSource = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => {
  const record = asRecord(payload);
  if (!record) return null;

  const explicitSource = toTrimmedString(record['source']);
  if (explicitSource) return explicitSource;

  const aiPathsGraphMarkers = [
    readGraphModelPayloadGraphString(record, 'runId'),
    readGraphModelPayloadGraphString(record, 'nodeId'),
    readGraphModelPayloadGraphString(record, 'nodeTitle'),
    readGraphModelPayloadGraphString(record, 'requestedModelId'),
    readGraphModelPayloadGraphString(record, 'modelId'),
  ];

  return aiPathsGraphMarkers.some(Boolean) ? 'ai_paths' : null;
};

export const isAiPathsGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => {
  const record = asRecord(payload);
  if (!record) return false;
  return resolveGraphModelPayloadSource(record) === 'ai_paths' && Boolean(asRecord(record['graph']));
};

export const normalizeGraphModelPayloadForDispatch = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelQueuedPayload => {
  const record = asRecord(payload);
  if (!record) {
    throw new Error('Graph model payload must be an object.');
  }

  const resolvedSource = resolveGraphModelPayloadSource(record);

  const normalized = {
    ...record,
    ...(resolvedSource ? { source: resolvedSource } : {}),
  };

  const enqueuePayload = graphModelJobEnqueuePayloadSchema.parse(normalized);
  const cacheKey = resolveGraphModelCacheKey(enqueuePayload) ?? hashRuntimeValue(enqueuePayload);
  const payloadHash =
    resolveGraphModelPayloadHash(enqueuePayload) ??
    hashRuntimeValue({
      payload: enqueuePayload,
      runId: readGraphModelPayloadGraphString(enqueuePayload, 'runId'),
    });

  return graphModelQueuedPayloadSchema.parse({
    ...enqueuePayload,
    cacheKey,
    payloadHash,
  });
};

export const safeParseGraphModelJobEnqueuePayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
) => graphModelJobEnqueuePayloadSchema.safeParse(payload);

export const summarizeGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): Record<string, unknown> | undefined => {
  const record = asRecord(payload);
  if (!record) return undefined;
  const prompt = record['prompt'];
  const imageUrls = Array.isArray(record['imageUrls']) ? record['imageUrls'] : [];

  return {
    source: resolveGraphModelPayloadSource(record),
    modelId: record['modelId'],
    requestedModelId: resolveGraphModelRequestedModelId(record),
    vision: record['vision'],
    promptLength: typeof prompt === 'string' ? prompt.length : null,
    imageCount: imageUrls.length,
    cacheKey:
      typeof record['cacheKey'] === 'string' ? record['cacheKey'].slice(0, 12) : null,
    payloadHash:
      typeof record['payloadHash'] === 'string' ? record['payloadHash'].slice(0, 12) : null,
  };
};
