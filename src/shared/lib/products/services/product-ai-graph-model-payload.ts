import {
  graphModelJobEnqueuePayloadSchema,
  type GraphModelJobPayload,
  graphModelQueuedPayloadSchema,
  type GraphModelQueuedPayload,
} from '@/shared/contracts/jobs';
import { buildGraphModelJobCacheMetadata } from '@/shared/lib/ai-paths/core/runtime/graph-model-job';

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

const readGraphModelPayloadClassification = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  record: Record<string, unknown> | null;
  queuedPayload: GraphModelQueuedPayload | null;
  enqueuePayload: GraphModelJobPayload | null;
  source: string | null;
  hasLegacyAiPathsNodeContext: boolean;
} => {
  const record = asRecord(payload);
  if (!record) {
    return {
      record: null,
      queuedPayload: null,
      enqueuePayload: null,
      source: null,
      hasLegacyAiPathsNodeContext: false,
    };
  }

  const queuedPayload = graphModelQueuedPayloadSchema.safeParse(record);
  if (queuedPayload.success) {
    return {
      record,
      queuedPayload: queuedPayload.data,
      enqueuePayload: queuedPayload.data,
      source: 'ai_paths',
      hasLegacyAiPathsNodeContext: true,
    };
  }

  const enqueuePayload = graphModelJobEnqueuePayloadSchema.safeParse(record);
  if (enqueuePayload.success) {
    return {
      record,
      queuedPayload: null,
      enqueuePayload: enqueuePayload.data,
      source: 'ai_paths',
      hasLegacyAiPathsNodeContext: true,
    };
  }

  const explicitSource = toTrimmedString(record['source']);
  const source = explicitSource ?? ([
    readGraphModelPayloadGraphString(record, 'runId'),
    readGraphModelPayloadGraphString(record, 'nodeId'),
    readGraphModelPayloadGraphString(record, 'nodeTitle'),
    readGraphModelPayloadGraphString(record, 'requestedModelId'),
    readGraphModelPayloadGraphString(record, 'modelId'),
  ].some(Boolean)
    ? 'ai_paths'
    : null);
  const runContext = {
    runId: readGraphModelPayloadGraphString(record, 'runId') || null,
    nodeId: readGraphModelPayloadGraphString(record, 'nodeId') || null,
  };

  return {
    record,
    queuedPayload: null,
    enqueuePayload: null,
    source,
    hasLegacyAiPathsNodeContext: source === 'ai_paths' && Boolean(runContext.runId && runContext.nodeId),
  };
};

const readGraphModelPayloadMetadata = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  classification: ReturnType<typeof readGraphModelPayloadClassification>;
  requestedModelId: string | null;
  cacheKey: string | null;
  payloadHash: string | null;
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
} => {
  const classification = readGraphModelPayloadClassification(payload);
  const record = classification.record;

  return {
    classification,
    requestedModelId: record
      ? [
          readGraphModelPayloadGraphString(record, 'requestedModelId'),
          toTrimmedString(record['modelId']),
          readGraphModelPayloadGraphString(record, 'modelId'),
        ].find(Boolean) ?? null
      : null,
    cacheKey: record ? toTrimmedString(record['cacheKey']) : null,
    payloadHash: record ? toTrimmedString(record['payloadHash']) : null,
    runId: record ? readGraphModelPayloadGraphString(record, 'runId') || null : null,
    nodeId: record ? readGraphModelPayloadGraphString(record, 'nodeId') || null : null,
    nodeTitle: record ? readGraphModelPayloadGraphString(record, 'nodeTitle') || null : null,
  };
};

const normalizeGraphModelDispatchPayloadFromMetadata = (
  metadata: ReturnType<typeof readGraphModelPayloadMetadata>
): GraphModelQueuedPayload => {
  const classification = metadata.classification;
  const record = classification.record;
  if (!record) {
    throw new Error('Graph model payload must be an object.');
  }

  if (classification.queuedPayload) {
    return classification.queuedPayload;
  }

  const normalized = {
    ...record,
    ...(classification.source ? { source: classification.source } : {}),
  };

  const enqueuePayload = graphModelJobEnqueuePayloadSchema.parse(normalized);
  const queueMetadata = buildGraphModelJobCacheMetadata({
    payload: enqueuePayload,
    runId: metadata.runId ?? readGraphModelPayloadGraphString(enqueuePayload, 'runId'),
  });
  const cacheKey = metadata.cacheKey ?? queueMetadata.cacheKey;
  const payloadHash = metadata.payloadHash ?? queueMetadata.payloadHash;

  return graphModelQueuedPayloadSchema.parse({
    ...enqueuePayload,
    cacheKey,
    payloadHash,
  });
};

const readSummarizableGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelQueuedPayload | GraphModelJobPayload | Record<string, unknown> | null => {
  const classification = readGraphModelPayloadClassification(payload);
  if (classification.queuedPayload) return classification.queuedPayload;
  if (classification.enqueuePayload) return classification.enqueuePayload;
  if (classification.hasLegacyAiPathsNodeContext && classification.record) {
    return {
      ...classification.record,
      source: 'ai_paths',
      prompt:
        toTrimmedString(classification.record['prompt']) ?? classification.record['prompt'],
      modelId:
        toTrimmedString(classification.record['modelId']) ?? classification.record['modelId'],
      cacheKey:
        toTrimmedString(classification.record['cacheKey']) ?? classification.record['cacheKey'],
      payloadHash:
        toTrimmedString(classification.record['payloadHash']) ??
        classification.record['payloadHash'],
      imageUrls: Array.isArray(classification.record['imageUrls'])
        ? classification.record['imageUrls'].filter(
            (value): value is string => typeof value === 'string'
          )
        : classification.record['imageUrls'],
    };
  }
  return null;
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
): string | null => readGraphModelPayloadMetadata(payload).requestedModelId;

export const resolveGraphModelCacheKey = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => readGraphModelPayloadMetadata(payload).cacheKey;

export const resolveGraphModelPayloadHash = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => readGraphModelPayloadMetadata(payload).payloadHash;

export const resolveGraphModelReuseIdentity = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  cacheKey: string | null;
  payloadHash: string | null;
  requestedModelId: string | null;
} => ({
  cacheKey: resolveGraphModelCacheKey(payload),
  payloadHash: resolveGraphModelPayloadHash(payload),
  requestedModelId: resolveGraphModelRequestedModelId(payload),
});

export const readGraphModelAiPathsRunContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
} => {
  const metadata = readGraphModelPayloadMetadata(payload);
  return {
    runId: metadata.runId,
    nodeId: metadata.nodeId,
    nodeTitle: metadata.nodeTitle,
  };
};

export const hasAiPathsGraphModelNodeContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => {
  const metadata = readGraphModelPayloadMetadata(payload);
  return Boolean(metadata.runId && metadata.nodeId);
};

export const resolveGraphModelPayloadSource = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => readGraphModelPayloadMetadata(payload).classification.source;

export const isAiPathsGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => {
  const classification = readGraphModelPayloadMetadata(payload).classification;
  return Boolean(
    classification.queuedPayload ||
      classification.enqueuePayload ||
      classification.hasLegacyAiPathsNodeContext
  );
};

export const normalizeGraphModelPayloadForDispatch = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelQueuedPayload => {
  const metadata = readGraphModelPayloadMetadata(payload);
  return normalizeGraphModelDispatchPayloadFromMetadata(metadata);
};

export const safeParseGraphModelJobEnqueuePayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
) => graphModelJobEnqueuePayloadSchema.safeParse(payload);

export const safeParseGraphModelQueuedPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
) => graphModelQueuedPayloadSchema.safeParse(payload);

export const resolveGraphModelExecutionPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
} => {
  const metadata = readGraphModelPayloadMetadata(payload);
  const classification = metadata.classification;
  if (!classification.record) {
    return {
      source: null,
      payload: null,
    };
  }

  if (
    classification.source === 'ai_paths' &&
    (classification.queuedPayload ||
      classification.enqueuePayload ||
      classification.hasLegacyAiPathsNodeContext)
  ) {
    return {
      source: classification.source,
      payload: normalizeGraphModelDispatchPayloadFromMetadata(metadata),
    };
  }

  return {
    source: classification.source,
    payload: classification.record,
  };
};

export const resolveGraphModelExecutionContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
  requestedModelId: string | null;
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  hasAiPathsNodeContext: boolean;
} => {
  const metadata = readGraphModelPayloadMetadata(payload);
  const execution = resolveGraphModelExecutionPayload(payload);

  return {
    source: execution.source,
    payload: execution.payload,
    requestedModelId: metadata.requestedModelId,
    runId: metadata.runId,
    nodeId: metadata.nodeId,
    nodeTitle: metadata.nodeTitle,
    hasAiPathsNodeContext: Boolean(metadata.runId && metadata.nodeId),
  };
};

export const resolveAiPathsGraphModelRequestedModelId = async (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<string> => {
  const executionContext = resolveGraphModelExecutionContext(args.payload);
  if (executionContext.source !== 'ai_paths') {
    return executionContext.requestedModelId ?? '';
  }
  if (executionContext.requestedModelId) {
    return executionContext.requestedModelId;
  }
  if (!executionContext.runId || !executionContext.nodeId) {
    return '';
  }

  try {
    const run = await args.findRunById(executionContext.runId);
    const runRecord = asRecord(run);
    const graph = asRecord(runRecord?.['graph']);
    const nodes: unknown[] = Array.isArray(graph?.['nodes']) ? graph['nodes'] : [];
    const node = nodes.find((entry): boolean => {
      const record = asRecord(entry);
      return record?.['id'] === executionContext.nodeId;
    });
    const nodeRecord = asRecord(node);
    const modelConfig =
      nodeRecord?.['config'] && typeof nodeRecord['config'] === 'object' && !Array.isArray(nodeRecord['config'])
        ? ((nodeRecord['config'] as Record<string, unknown>)['model'] as Record<string, unknown> | undefined)
        : undefined;
    const recoveredModelId = modelConfig?.['modelId'];
    return typeof recoveredModelId === 'string' ? recoveredModelId.trim() : '';
  } catch {
    return '';
  }
};

export const summarizeGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): Record<string, unknown> | undefined => {
  const record = readSummarizableGraphModelPayload(payload);
  if (!record) return undefined;
  const prompt = toTrimmedString(record['prompt']);
  const imageCount = Array.isArray(record['imageUrls'])
    ? record['imageUrls'].filter((value): value is string => typeof value === 'string').length
    : 0;

  return {
    source: resolveGraphModelPayloadSource(record),
    modelId: toTrimmedString(record['modelId']),
    requestedModelId: resolveGraphModelRequestedModelId(record),
    vision: typeof record['vision'] === 'boolean' ? record['vision'] : null,
    promptLength: prompt?.length ?? null,
    imageCount,
    cacheKey: resolveGraphModelCacheKey(record)?.slice(0, 12) ?? null,
    payloadHash: resolveGraphModelPayloadHash(record)?.slice(0, 12) ?? null,
  };
};
