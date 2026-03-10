import type { GraphModelJobPayload } from '@/shared/contracts/jobs';

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
