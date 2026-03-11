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

const resolveGraphModelExecutionPayloadFromMetadata = (
  metadata: ReturnType<typeof readGraphModelPayloadMetadata>
): {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
} => {
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

const resolveGraphModelReuseIdentityFromMetadata = (
  metadata: ReturnType<typeof readGraphModelPayloadMetadata>
): {
  cacheKey: string | null;
  payloadHash: string | null;
  requestedModelId: string | null;
} => ({
  cacheKey: metadata.cacheKey,
  payloadHash: metadata.payloadHash,
  requestedModelId: metadata.requestedModelId,
});

const readSummarizableGraphModelPayloadFromMetadata = (
  metadata: ReturnType<typeof readGraphModelPayloadMetadata>
): GraphModelQueuedPayload | GraphModelJobPayload | Record<string, unknown> | null => {
  const classification = metadata.classification;
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

const summarizeGraphModelPayloadFromMetadata = (
  metadata: ReturnType<typeof readGraphModelPayloadMetadata>
): Record<string, unknown> | undefined => {
  const record = readSummarizableGraphModelPayloadFromMetadata(metadata);
  if (!record) return undefined;
  const prompt = toTrimmedString(record['prompt']);
  const imageCount = Array.isArray(record['imageUrls'])
    ? record['imageUrls'].filter((value): value is string => typeof value === 'string').length
    : 0;

  return {
    source: metadata.classification.source,
    modelId: toTrimmedString(record['modelId']),
    requestedModelId: metadata.requestedModelId,
    vision: typeof record['vision'] === 'boolean' ? record['vision'] : null,
    promptLength: prompt?.length ?? null,
    imageCount,
    cacheKey: metadata.cacheKey?.slice(0, 12) ?? null,
    payloadHash: metadata.payloadHash?.slice(0, 12) ?? null,
  };
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
} => resolveGraphModelReuseIdentityFromMetadata(readGraphModelPayloadMetadata(payload));

export const matchesGraphModelReuseIdentity = (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  identity: {
    cacheKey: string;
    payloadHash: string;
    requestedModelId: string | null;
  };
}): boolean => {
  const existingIdentity = resolveGraphModelReuseIdentity(args.payload);
  return (
    existingIdentity.cacheKey === args.identity.cacheKey &&
    existingIdentity.payloadHash === args.identity.payloadHash &&
    existingIdentity.requestedModelId === args.identity.requestedModelId
  );
};

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
  return resolveGraphModelExecutionPayloadFromMetadata(readGraphModelPayloadMetadata(payload));
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
  const execution = resolveGraphModelExecutionPayloadFromMetadata(metadata);

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

type GraphModelExecutionContext = ReturnType<typeof resolveGraphModelExecutionContext>;

export const resolveAiPathsGraphModelNodeSnapshotFromExecutionContext = async (args: {
  executionContext: GraphModelExecutionContext;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<{ requestedModelId: string; nodeTitle: string | null }> => {
  const executionContext = args.executionContext;
  if (executionContext.source !== 'ai_paths') {
    return {
      requestedModelId: executionContext.requestedModelId ?? '',
      nodeTitle: executionContext.nodeTitle,
    };
  }
  if (executionContext.requestedModelId) {
    return {
      requestedModelId: executionContext.requestedModelId,
      nodeTitle: executionContext.nodeTitle,
    };
  }
  if (!executionContext.runId || !executionContext.nodeId) {
    return {
      requestedModelId: '',
      nodeTitle: executionContext.nodeTitle,
    };
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
    const recoveredNodeTitle = toTrimmedString(nodeRecord?.['title']);
    return {
      requestedModelId: typeof recoveredModelId === 'string' ? recoveredModelId.trim() : '',
      nodeTitle: executionContext.nodeTitle ?? recoveredNodeTitle ?? null,
    };
  } catch {
    return {
      requestedModelId: '',
      nodeTitle: executionContext.nodeTitle,
    };
  }
};

export const resolveAiPathsGraphModelRequestedModelIdFromExecutionContext = async (args: {
  executionContext: GraphModelExecutionContext;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<string> =>
  (
    await resolveAiPathsGraphModelNodeSnapshotFromExecutionContext({
      executionContext: args.executionContext,
      findRunById: args.findRunById,
    })
  ).requestedModelId;

export const resolveAiPathsGraphModelRequestedModelId = async (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<string> =>
  resolveAiPathsGraphModelRequestedModelIdFromExecutionContext({
    executionContext: resolveGraphModelExecutionContext(args.payload),
    findRunById: args.findRunById,
  });

export const summarizeGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): Record<string, unknown> | undefined =>
  summarizeGraphModelPayloadFromMetadata(readGraphModelPayloadMetadata(payload));

export const prepareGraphModelEnqueuePayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
):
  | {
    success: true;
    payload: GraphModelQueuedPayload;
    reuseIdentity: {
      cacheKey: string | null;
      payloadHash: string | null;
      requestedModelId: string | null;
    };
    summary: Record<string, unknown> | undefined;
  }
  | {
    success: false;
    error: NonNullable<ReturnType<typeof safeParseGraphModelJobEnqueuePayload>['error']>;
  } => {
  const parsed = safeParseGraphModelJobEnqueuePayload(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const queuedPayload = normalizeGraphModelPayloadForDispatch(parsed.data);
  const metadata = readGraphModelPayloadMetadata(queuedPayload);

  return {
    success: true,
    payload: queuedPayload,
    reuseIdentity: resolveGraphModelReuseIdentityFromMetadata(metadata),
    summary: summarizeGraphModelPayloadFromMetadata(metadata),
  };
};
