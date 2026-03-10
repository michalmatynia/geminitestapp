import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type {
  GraphModelJobEnqueuePayload,
  GraphModelJobPayload,
  ProductAiJobEnqueueRequest,
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
  const requestedModelId = toTrimmedNonEmptyString(input.modelId);
  const systemPrompt = toTrimmedNonEmptyString(input.systemPrompt);

  return {
    prompt: input.prompt,
    ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
    ...(requestedModelId ? { modelId: requestedModelId } : {}),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
    ...(typeof input.maxTokens === 'number' ? { maxTokens: input.maxTokens } : {}),
    ...(typeof input.vision === 'boolean' ? { vision: input.vision } : {}),
    ...(systemPrompt ? { systemPrompt } : {}),
    source: 'ai_paths',
    graph: {
      pathId: input.activePathId ?? undefined,
      nodeId: input.nodeId,
      nodeTitle: input.nodeTitle ?? undefined,
      ...(requestedModelId ? { requestedModelId } : {}),
      runId: input.runId,
    },
    ...(input.contextRegistry ? { contextRegistry: input.contextRegistry } : {}),
    ...(input.extraPayload ?? {}),
  };
};

export const buildGraphModelJobEnqueueRequest = (input: {
  productId: string;
  payload: GraphModelJobEnqueuePayload;
}): ProductAiJobEnqueueRequest => ({
  productId: input.productId,
  type: 'graph_model',
  payload: input.payload,
});

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
}): GraphModelJobEnqueuePayload => ({
  ...input.payload,
  ...buildGraphModelJobCacheMetadata(input),
});

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
