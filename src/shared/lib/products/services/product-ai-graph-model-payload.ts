import {
  graphModelJobEnqueuePayloadSchema,
  type GraphModelJobPayload,
  graphModelQueuedPayloadSchema,
  type GraphModelQueuedPayload,
} from '@/shared/contracts/jobs';
import { badRequestError } from '@/shared/errors/app-error';
import { buildGraphModelJobCacheMetadata } from '@/shared/lib/ai-paths/core/runtime/graph-model-job';

type GraphModelStringField = 'modelId' | 'nodeId' | 'nodeTitle' | 'requestedModelId' | 'runId';
type GraphModelPayloadClassification = {
  record: Record<string, unknown> | null;
  queuedPayload: GraphModelQueuedPayload | null;
  enqueuePayload: GraphModelJobPayload | null;
  source: string | null;
  hasLegacyAiPathsNodeContext: boolean;
};
type GraphModelPayloadMetadata = {
  classification: GraphModelPayloadClassification;
  requestedModelId: string | null;
  cacheKey: string | null;
  payloadHash: string | null;
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
};
type GraphModelReadablePayload = {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
};
type GraphModelPayloadInspection = {
  source: string | null;
  requestedModelId: string | null;
  cacheKey: string | null;
  payloadHash: string | null;
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  hasAiPathsNodeContext: boolean;
  isAiPathsGraphModelPayload: boolean;
  reuseIdentity: GraphModelReuseIdentityShape;
};
type GraphModelDispatchInspection =
  | {
      normalizedPayload: GraphModelQueuedPayload;
      error: null;
    }
  | {
      normalizedPayload: null;
      error: unknown;
    };
type GraphModelExecutionPayload = {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
};
type GraphModelExecutionContext = GraphModelExecutionPayload & {
  requestedModelId: string | null;
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  hasAiPathsNodeContext: boolean;
};
type GraphModelExecutionInspection = {
  executionPayload: GraphModelExecutionPayload;
  executionContext: GraphModelExecutionContext;
};
type GraphModelExecutionRecoveryContext = Pick<
  GraphModelExecutionContext,
  'source' | 'requestedModelId' | 'runId' | 'nodeId' | 'nodeTitle'
>;
type GraphModelAiPathsRunContext = {
  runId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
};
type GraphModelAiPathsNodeSnapshot = {
  requestedModelId: string;
  nodeTitle: string | null;
};
type GraphModelAiPathsConfigErrorContext = GraphModelAiPathsRunContext & {
  requestedModelId: string;
};
type GraphModelSummaryInspection = {
  summary: Record<string, unknown> | undefined;
};
type GraphModelEnqueueInspection =
  | {
      parsedPayload: GraphModelJobPayload;
      preparedPayload: PreparedGraphModelEnqueuePayload;
      error: null;
    }
  | {
      parsedPayload: null;
      preparedPayload: null;
      error: NonNullable<ReturnType<typeof safeParseGraphModelJobEnqueuePayload>['error']>;
    };
type GraphModelReuseIdentityShape = {
  cacheKey: string | null;
  payloadHash: string | null;
  requestedModelId: string | null;
};
type GraphModelPreparedExecutionInput = {
  executionContext: GraphModelExecutionContext;
  source: string;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown>;
  rawPrompt: string;
  aiPathsNodeSnapshot: GraphModelAiPathsNodeSnapshot | null;
  requestedModelId: string;
  aiPathsConfigErrorContext: GraphModelAiPathsConfigErrorContext;
};

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
): GraphModelPayloadClassification => {
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
): GraphModelPayloadMetadata => {
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
  metadata: GraphModelPayloadMetadata
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
    imageUrls: Array.isArray(record['imageUrls'])
      ? record['imageUrls'].filter((value): value is string => typeof value === 'string')
      : record['imageUrls'],
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

const isAiPathsGraphModelClassification = (
  classification: GraphModelPayloadClassification
): boolean =>
  Boolean(
    classification.queuedPayload ||
      classification.enqueuePayload ||
      classification.hasLegacyAiPathsNodeContext
  );

const resolveGraphModelReadablePayloadFromMetadataAndInspection = (
  metadata: GraphModelPayloadMetadata,
  inspection: GraphModelPayloadInspection
): GraphModelReadablePayload => {
  const classification = metadata.classification;
  if (!classification.record) {
    return {
      source: inspection.source,
      payload: null,
    };
  }

  return {
    source: inspection.source,
    payload: inspection.isAiPathsGraphModelPayload
      ? normalizeGraphModelDispatchPayloadFromMetadata(metadata)
      : classification.record,
  };
};

const resolveGraphModelExecutionContextFromMetadata = (
  metadata: GraphModelPayloadMetadata
): GraphModelExecutionContext => {
  const inspection = resolveGraphModelPayloadInspectionFromMetadata(metadata);
  const readablePayload = resolveGraphModelReadablePayloadFromMetadataAndInspection(
    metadata,
    inspection
  );

  return {
    source: inspection.source,
    payload: readablePayload.payload,
    requestedModelId: inspection.requestedModelId,
    runId: inspection.runId,
    nodeId: inspection.nodeId,
    nodeTitle: inspection.nodeTitle,
    hasAiPathsNodeContext: inspection.hasAiPathsNodeContext,
  };
};

const resolveGraphModelReuseIdentityFromMetadata = (
  metadata: GraphModelPayloadMetadata
): GraphModelReuseIdentityShape => ({
  cacheKey: metadata.cacheKey,
  payloadHash: metadata.payloadHash,
  requestedModelId: metadata.requestedModelId,
});

const resolveGraphModelPayloadInspectionFromMetadata = (
  metadata: GraphModelPayloadMetadata
): GraphModelPayloadInspection => {
  const reuseIdentity = resolveGraphModelReuseIdentityFromMetadata(metadata);
  return {
    source: metadata.classification.source,
    requestedModelId: metadata.requestedModelId,
    cacheKey: metadata.cacheKey,
    payloadHash: metadata.payloadHash,
    runId: metadata.runId,
    nodeId: metadata.nodeId,
    nodeTitle: metadata.nodeTitle,
    hasAiPathsNodeContext: Boolean(metadata.runId && metadata.nodeId),
    isAiPathsGraphModelPayload: isAiPathsGraphModelClassification(metadata.classification),
    reuseIdentity,
  };
};

const resolveGraphModelExecutionRecoveryContextFromInspection = (
  inspection: ReturnType<typeof resolveGraphModelPayloadInspectionFromMetadata>
): GraphModelExecutionRecoveryContext => ({
  source: inspection.source,
  requestedModelId: inspection.requestedModelId,
  runId: inspection.runId,
  nodeId: inspection.nodeId,
  nodeTitle: inspection.nodeTitle,
});

const resolveGraphModelAiPathsRunContextFromInspection = (
  inspection: ReturnType<typeof resolveGraphModelPayloadInspectionFromMetadata>
): GraphModelAiPathsRunContext => ({
  runId: inspection.runId,
  nodeId: inspection.nodeId,
  nodeTitle: inspection.nodeTitle,
});

const resolveGraphModelAiPathsRunContextFromExecutionContext = (
  executionContext: Pick<GraphModelExecutionContext, 'runId' | 'nodeId' | 'nodeTitle'>
): GraphModelAiPathsRunContext => ({
  runId: executionContext.runId,
  nodeId: executionContext.nodeId,
  nodeTitle: executionContext.nodeTitle,
});

const resolveAiPathsConfigErrorContext = (args: {
  executionContext: Pick<GraphModelExecutionContext, 'runId' | 'nodeId' | 'nodeTitle'>;
  requestedModelId: string;
  resolvedNodeTitle: string | null;
}): GraphModelAiPathsConfigErrorContext => ({
  requestedModelId: args.requestedModelId,
  ...resolveGraphModelAiPathsRunContextFromExecutionContext(args.executionContext),
  nodeTitle: args.resolvedNodeTitle,
});

const readSummarizableGraphModelPayloadFromMetadata = (
  metadata: GraphModelPayloadMetadata
): GraphModelQueuedPayload | GraphModelJobPayload | Record<string, unknown> | null => {
  const inspection = resolveGraphModelPayloadInspectionFromMetadata(metadata);
  const classification = metadata.classification;
  if (classification.queuedPayload) return classification.queuedPayload;
  if (classification.enqueuePayload) return classification.enqueuePayload;
  if (!inspection.isAiPathsGraphModelPayload) {
    return null;
  }
  return resolveGraphModelReadablePayloadFromMetadataAndInspection(
    metadata,
    inspection
  ).payload;
};

const summarizeGraphModelPayloadFromMetadata = (
  metadata: GraphModelPayloadMetadata
): Record<string, unknown> | undefined => {
  const record = readSummarizableGraphModelPayloadFromMetadata(metadata);
  if (!record) return undefined;
  const prompt = toTrimmedString(record['prompt']);
  const cacheKey = toTrimmedString(record['cacheKey']) ?? metadata.cacheKey;
  const payloadHash = toTrimmedString(record['payloadHash']) ?? metadata.payloadHash;
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
    cacheKey: cacheKey?.slice(0, 12) ?? null,
    payloadHash: payloadHash?.slice(0, 12) ?? null,
  };
};

const resolveGraphModelSummaryInspectionFromMetadata = (
  metadata: GraphModelPayloadMetadata
): GraphModelSummaryInspection => ({
  summary: summarizeGraphModelPayloadFromMetadata(metadata),
});

const prepareGraphModelEnqueuePayloadFromParsed = (
  payload: GraphModelJobPayload
): PreparedGraphModelEnqueuePayload => {
  const queuedPayload = normalizeGraphModelDispatchPayloadFromMetadata(
    readGraphModelPayloadMetadata(payload)
  );
  const metadata = readGraphModelPayloadMetadata(queuedPayload);
  const payloadInspection = resolveGraphModelPayloadInspectionFromMetadata(metadata);
  const summaryInspection = resolveGraphModelSummaryInspectionFromMetadata(metadata);
  const reuseIdentity = payloadInspection.reuseIdentity;
  if (!reuseIdentity.cacheKey || !reuseIdentity.payloadHash) {
    throw new Error('Prepared graph_model payload missing queue metadata');
  }

  return {
    success: true,
    payload: queuedPayload,
    reuseIdentity: {
      cacheKey: reuseIdentity.cacheKey,
      payloadHash: reuseIdentity.payloadHash,
      requestedModelId: reuseIdentity.requestedModelId,
    },
    summary: summaryInspection.summary,
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
): string | null => resolveGraphModelPayloadInspection(payload).requestedModelId;

export const resolveGraphModelCacheKey = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => resolveGraphModelPayloadInspection(payload).cacheKey;

export const resolveGraphModelPayloadHash = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => resolveGraphModelPayloadInspection(payload).payloadHash;

export const resolveGraphModelReuseIdentity = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelReuseIdentityShape => resolveGraphModelPayloadInspection(payload).reuseIdentity;

export type GraphModelReuseIdentity = ReturnType<typeof resolveGraphModelReuseIdentity>;
export type PreparedGraphModelReuseIdentity = GraphModelReuseIdentity & {
  cacheKey: string;
  payloadHash: string;
};
export type PreparedGraphModelEnqueuePayload = {
  success: true;
  payload: GraphModelQueuedPayload;
  reuseIdentity: PreparedGraphModelReuseIdentity;
  summary: Record<string, unknown> | undefined;
};

export const matchesGraphModelReuseIdentity = (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  identity: GraphModelReuseIdentity & {
    cacheKey: string;
    payloadHash: string;
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
): GraphModelAiPathsRunContext =>
  resolveGraphModelAiPathsRunContextFromInspection(resolveGraphModelPayloadInspection(payload));

export const hasAiPathsGraphModelNodeContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => resolveGraphModelPayloadInspection(payload).hasAiPathsNodeContext;

export const resolveGraphModelPayloadSource = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): string | null => resolveGraphModelPayloadInspection(payload).source;

export const isAiPathsGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): boolean => resolveGraphModelPayloadInspection(payload).isAiPathsGraphModelPayload;

export const resolveGraphModelPayloadInspection = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelPayloadInspection =>
  resolveGraphModelPayloadInspectionFromMetadata(readGraphModelPayloadMetadata(payload));

export const resolveGraphModelDispatchInspection = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelDispatchInspection => {
  try {
    return {
      normalizedPayload: normalizeGraphModelDispatchPayloadFromMetadata(
        readGraphModelPayloadMetadata(payload)
      ),
      error: null,
    };
  } catch (error) {
    return {
      normalizedPayload: null,
      error,
    };
  }
};

const unwrapGraphModelDispatchInspection = (
  inspection: ReturnType<typeof resolveGraphModelDispatchInspection>
): GraphModelQueuedPayload => {
  if (inspection.error || !inspection.normalizedPayload) {
    throw inspection.error ?? new Error('Graph model dispatch normalization failed');
  }
  return inspection.normalizedPayload;
};

export const normalizeGraphModelPayloadForDispatch = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelQueuedPayload => {
  return unwrapGraphModelDispatchInspection(resolveGraphModelDispatchInspection(payload));
};

export const prepareGraphModelDispatchJob = <
  T extends {
    payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  },
>(
  job: T
): Omit<T, 'payload'> & { payload: GraphModelQueuedPayload } => {
  return {
    ...job,
    payload: normalizeGraphModelPayloadForDispatch(job.payload),
  };
};

export const safeParseGraphModelJobEnqueuePayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
) => graphModelJobEnqueuePayloadSchema.safeParse(payload);

export const safeParseGraphModelQueuedPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
) => graphModelQueuedPayloadSchema.safeParse(payload);

export const resolveGraphModelEnqueueInspection = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelEnqueueInspection => {
  const parsed = safeParseGraphModelJobEnqueuePayload(payload);
  if (!parsed.success) {
    return {
      parsedPayload: null,
      preparedPayload: null,
      error: parsed.error,
    };
  }

  return {
    parsedPayload: parsed.data,
    preparedPayload: prepareGraphModelEnqueuePayloadFromParsed(parsed.data),
    error: null,
  };
};

const unwrapGraphModelEnqueueInspection = (
  inspection: ReturnType<typeof resolveGraphModelEnqueueInspection>
): PreparedGraphModelEnqueuePayload => {
  if (inspection.error || !inspection.preparedPayload) {
    throw inspection.error ?? new Error('Graph model enqueue preparation failed');
  }
  return inspection.preparedPayload;
};

export const resolveGraphModelExecutionPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelExecutionPayload => {
  const executionContext = resolveGraphModelExecutionContext(payload);
  return resolveGraphModelExecutionPayloadFromContext(executionContext);
};

export const resolveGraphModelExecutionContext = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelExecutionContext =>
  resolveGraphModelExecutionContextFromMetadata(readGraphModelPayloadMetadata(payload));

const resolveGraphModelExecutionPayloadFromContext = (
  executionContext: ReturnType<typeof resolveGraphModelExecutionContext>
): {
  source: string | null;
  payload: GraphModelJobPayload | GraphModelQueuedPayload | Record<string, unknown> | null;
} => ({
  source: executionContext.source,
  payload: executionContext.payload,
});

export const resolveGraphModelExecutionInspection = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelExecutionInspection => {
  const executionContext = resolveGraphModelExecutionContext(payload);
  return {
    executionPayload: resolveGraphModelExecutionPayloadFromContext(executionContext),
    executionContext,
  };
};

const resolveGraphModelExecutionRecoveryContextFromExecutionContext = (
  executionContext: GraphModelExecutionContext
): GraphModelExecutionRecoveryContext => ({
  source: executionContext.source,
  requestedModelId: executionContext.requestedModelId,
  runId: executionContext.runId,
  nodeId: executionContext.nodeId,
  nodeTitle: executionContext.nodeTitle,
});

export const resolveAiPathsGraphModelNodeSnapshotFromExecutionContext = async (args: {
  executionContext: GraphModelExecutionRecoveryContext;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<GraphModelAiPathsNodeSnapshot> => {
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

const resolveAiPathsExecutionResolutionFromSnapshot = (args: {
  executionContext: GraphModelExecutionRecoveryContext;
  aiPathsNodeSnapshot: GraphModelAiPathsNodeSnapshot | null;
}): { requestedModelId: string; resolvedNodeTitle: string | null } => ({
  requestedModelId:
    args.aiPathsNodeSnapshot?.requestedModelId ?? args.executionContext.requestedModelId ?? '',
  resolvedNodeTitle: args.aiPathsNodeSnapshot?.nodeTitle ?? args.executionContext.nodeTitle,
});

export const prepareGraphModelExecutionInput = async (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  jobId?: string;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<GraphModelPreparedExecutionInput> => {
  const executionContext = resolveGraphModelExecutionContext(args.payload);
  const executionPayload = resolveGraphModelExecutionPayloadFromContext(executionContext);
  const { source, payload } = executionPayload;
  const recoveryContext =
    resolveGraphModelExecutionRecoveryContextFromExecutionContext(executionContext);
  const aiPathsNodeSnapshot =
    source === 'ai_paths'
      ? await resolveAiPathsGraphModelNodeSnapshotFromExecutionContext({
          executionContext: recoveryContext,
          findRunById: args.findRunById,
        })
      : null;
  if (!source) {
    throw badRequestError('Graph model job missing source', {
      ...(args.jobId ? { jobId: args.jobId } : {}),
    });
  }
  if (!payload) {
    throw badRequestError('Graph model job missing payload', {
      ...(args.jobId ? { jobId: args.jobId } : {}),
    });
  }

  const { requestedModelId, resolvedNodeTitle } =
    resolveAiPathsExecutionResolutionFromSnapshot({
      executionContext: recoveryContext,
      aiPathsNodeSnapshot,
    });
  if (source === 'ai_paths' && !executionContext.hasAiPathsNodeContext && !requestedModelId) {
    throw badRequestError(
      'AI Paths graph_model payload requires graph.runId and graph.nodeId when no requested model is provided.',
      {
        ...(args.jobId ? { jobId: args.jobId } : {}),
      }
    );
  }
  const rawPrompt = typeof payload?.prompt === 'string' ? payload.prompt.trim() : '';
  if (!rawPrompt) {
    throw badRequestError('Graph model job missing prompt', {
      ...(args.jobId ? { jobId: args.jobId } : {}),
    });
  }

  return {
    executionContext,
    source,
    payload,
    rawPrompt,
    aiPathsNodeSnapshot,
    requestedModelId,
    aiPathsConfigErrorContext: resolveAiPathsConfigErrorContext({
      executionContext,
      requestedModelId,
      resolvedNodeTitle,
    }),
  };
};

export const resolveAiPathsGraphModelRequestedModelIdFromExecutionContext = async (args: {
  executionContext: GraphModelExecutionRecoveryContext;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<string> => {
  const aiPathsNodeSnapshot = await resolveAiPathsGraphModelNodeSnapshotFromExecutionContext({
    executionContext: args.executionContext,
    findRunById: args.findRunById,
  });
  return resolveAiPathsExecutionResolutionFromSnapshot({
    executionContext: args.executionContext,
    aiPathsNodeSnapshot,
  }).requestedModelId;
};

export const resolveAiPathsGraphModelRequestedModelId = async (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  findRunById: (runId: string) => Promise<Record<string, unknown> | null | undefined>;
}): Promise<string> => {
  const inspection = resolveGraphModelPayloadInspection(args.payload);

  return resolveAiPathsGraphModelRequestedModelIdFromExecutionContext({
    executionContext: resolveGraphModelExecutionRecoveryContextFromInspection(inspection),
    findRunById: args.findRunById,
  });
};

export const resolveGraphModelSummaryInspection = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): GraphModelSummaryInspection =>
  resolveGraphModelSummaryInspectionFromMetadata(readGraphModelPayloadMetadata(payload));

export const summarizeGraphModelPayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
): Record<string, unknown> | undefined =>
  resolveGraphModelSummaryInspection(payload).summary;

export const prepareGraphModelEnqueuePayload = (
  payload: GraphModelJobPayload | Record<string, unknown> | unknown
):
  | PreparedGraphModelEnqueuePayload
  | {
    success: false;
    error: NonNullable<ReturnType<typeof safeParseGraphModelJobEnqueuePayload>['error']>;
  } => {
  const inspection = resolveGraphModelEnqueueInspection(payload);
  if (inspection.error) {
    return {
      success: false,
      error: inspection.error,
    };
  }

  return unwrapGraphModelEnqueueInspection(inspection);
};

export const prepareGraphModelEnqueuePayloadOrThrow = (args: {
  payload: GraphModelJobPayload | Record<string, unknown> | unknown;
  productId?: string;
}): PreparedGraphModelEnqueuePayload => {
  const prepared = prepareGraphModelEnqueuePayload(args.payload);
  if (prepared.success) return prepared;

  throw badRequestError('Invalid graph_model payload', {
    ...(args.productId ? { productId: args.productId } : {}),
    issues: prepared.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
};
