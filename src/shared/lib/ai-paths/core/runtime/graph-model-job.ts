import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import {
  graphModelJobEnqueuePayloadSchema,
  type GraphModelJobEnqueuePayload,
  type GraphModelJobPayload,
  graphModelQueuedPayloadSchema,
  type GraphModelQueuedPayload,
  productAiJobEnqueueRequestSchema,
  type ProductAiJobEnqueueRequest,
} from '@/shared/contracts/jobs';

import { hashRuntimeValue } from '../utils';

const toTrimmedNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildGraphModelJobPayload = (input: {
  prompt: string;
  imageUrls?: string[];
  modelId?: string | null;
  temperature?: number;
  maxTokens?: number;
  vision?: boolean;
  systemPrompt?: string | null;
  activePathId?: string | null;
  nodeId: string;
  nodeTitle?: string | null;
  runId: string;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  extraPayload?: Record<string, unknown>;
}): GraphModelJobEnqueuePayload => {
  const prompt = toTrimmedNonEmptyString(input.prompt);
  const nodeId = toTrimmedNonEmptyString(input.nodeId);
  const runId = toTrimmedNonEmptyString(input.runId);
  const requestedModelId = toTrimmedNonEmptyString(input.modelId);
  const systemPrompt = toTrimmedNonEmptyString(input.systemPrompt);
  const activePathId = toTrimmedNonEmptyString(input.activePathId);
  const nodeTitle = toTrimmedNonEmptyString(input.nodeTitle);

  if (!prompt) {
    throw new Error('Graph model payload requires a non-empty prompt.');
  }
  if (!nodeId) {
    throw new Error('Graph model payload requires a non-empty node id.');
  }
  if (!runId) {
    throw new Error('Graph model payload requires a non-empty run id.');
  }

  return graphModelJobEnqueuePayloadSchema.parse({
    prompt,
    ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
    ...(requestedModelId ? { modelId: requestedModelId } : {}),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
    ...(typeof input.maxTokens === 'number' ? { maxTokens: input.maxTokens } : {}),
    ...(typeof input.vision === 'boolean' ? { vision: input.vision } : {}),
    ...(systemPrompt ? { systemPrompt } : {}),
    source: 'ai_paths',
    graph: {
      pathId: activePathId ?? undefined,
      nodeId,
      nodeTitle: nodeTitle ?? undefined,
      ...(requestedModelId ? { requestedModelId } : {}),
      runId,
    },
    ...(input.contextRegistry ? { contextRegistry: input.contextRegistry } : {}),
    ...(input.extraPayload ?? {}),
  });
};

export const buildGraphModelJobEnqueueRequest = (input: {
  productId: string;
  payload: GraphModelJobEnqueuePayload;
}): ProductAiJobEnqueueRequest => {
  const productId = toTrimmedNonEmptyString(input.productId);
  if (!productId) {
    throw new Error('Graph model enqueue request requires a non-empty product id.');
  }

  return productAiJobEnqueueRequestSchema.parse({
    productId,
    type: 'graph_model',
    payload: input.payload,
  });
};

export const buildGraphModelJobCacheMetadata = (input: {
  payload: GraphModelJobPayload;
  runId: string;
  runStartedAt?: string | number | Date | null;
}): {
  cacheKey: string;
  payloadHash: string;
} => {
  const cacheKey = hashRuntimeValue(input.payload);
  const payloadHash = hashRuntimeValue(
    input.runStartedAt === undefined || input.runStartedAt === null
      ? { payload: input.payload, runId: input.runId }
      : { payload: input.payload, runId: input.runId, runStartedAt: input.runStartedAt }
  );

  return {
    cacheKey,
    payloadHash,
  };
};

export const buildGraphModelQueuedPayload = (input: {
  payload: GraphModelJobEnqueuePayload;
  runId: string;
  runStartedAt?: string | number | Date | null;
}): GraphModelQueuedPayload =>
  graphModelQueuedPayloadSchema.parse({
    ...input.payload,
    ...buildGraphModelJobCacheMetadata(input),
  });

export const buildQueuedGraphModelJobEnqueueRequest = (input: {
  productId: string;
  payload: GraphModelJobEnqueuePayload;
  runId: string;
  runStartedAt?: string | number | Date | null;
}): {
  payload: GraphModelQueuedPayload;
  request: ProductAiJobEnqueueRequest;
} => {
  const payload = buildGraphModelQueuedPayload({
    payload: input.payload,
    runId: input.runId,
    runStartedAt: input.runStartedAt,
  });

  return {
    payload,
    request: buildGraphModelJobEnqueueRequest({
      productId: input.productId,
      payload,
    }),
  };
};

export const readEnqueuedGraphModelJobId = (value: {
  data?: {
    jobId?: unknown;
  };
}): string => {
  const jobId = toTrimmedNonEmptyString(value.data?.jobId);
  if (!jobId) {
    throw new Error('AI job enqueue response did not include a valid job id.');
  }
  return jobId;
};
