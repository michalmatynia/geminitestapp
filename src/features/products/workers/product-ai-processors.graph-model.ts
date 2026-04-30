import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import {
  resolveAiPathsNodeExecutionConfig,
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import {
  prepareGraphModelExecutionInput,
} from '@/shared/lib/products/services/product-ai-graph-model-payload';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { buildImageParts } from './product-ai-processors.graph-images';
import {
  resolveGraphModelRetryConfig,
  resolveGraphModelRetryReason,
  type GraphModelRetryReason,
} from './product-ai-processors.graph-retry';
import type { Job } from './product-ai-processors.types';

const OPENAI_MAX_PROMPT_CHARS = 100_000;

type PreparedGraphModelExecutionInput = Awaited<
  ReturnType<typeof prepareGraphModelExecutionInput>
>;
type GraphModelPayload = PreparedGraphModelExecutionInput['payload'];
type AiPathsConfigErrorContext =
  PreparedGraphModelExecutionInput['aiPathsConfigErrorContext'];
type GraphModelBrainConfig = {
  brainApplied: Record<string, unknown> | undefined;
  maxTokens: number;
  modelId: string;
  systemMessage: string;
  temperature: number;
};
type GraphModelCompletionState = {
  completionRetryCount: number;
  maxTokens: number;
  retryReason: GraphModelRetryReason | null;
  resultText: string;
  temperature: number;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toOptionalString = (value: string | null): string | undefined => value ?? undefined;

const isVisionPayload = (payload: GraphModelPayload): boolean => payload['vision'] === true;

const resolveSystemMessage = (systemPrompt: string, contextRegistryPrompt: string): string =>
  [systemPrompt, contextRegistryPrompt].filter((value) => value.length > 0).join('\n\n');

const resolveFailingNodeLabel = (args: AiPathsConfigErrorContext): string | null => {
  const nodeTitle = asNonEmptyString(args.nodeTitle);
  const nodeId = asNonEmptyString(args.nodeId);
  if (nodeTitle !== null && nodeId !== null) {
    return `Failing AI Paths node "${nodeTitle}" <${nodeId}>`;
  }
  if (nodeTitle !== null) return `Failing AI Paths node "${nodeTitle}"`;
  if (nodeId !== null) return `Failing AI Paths node <${nodeId}>`;
  return null;
};

const enrichAiPathsConfigError = (
  error: unknown,
  args: AiPathsConfigErrorContext
): never => {
  if (!(error instanceof Error)) throw error;
  const detailParts = [
    resolveFailingNodeLabel(args),
    asNonEmptyString(args.runId) !== null ? `run ${args.runId}` : null,
    `requested node model: ${args.requestedModelId.length > 0 ? args.requestedModelId : 'none'}`,
  ].filter((value): value is string => value !== null && value.length > 0);
  if (detailParts.length === 0) throw error;
  throw new Error(`${error.message} ${detailParts.join(', ')}.`);
};

const resolveRequestedModelOptions = (
  payload: GraphModelPayload
): {
  requestedMaxTokens: number | undefined;
  requestedSystemPrompt: string;
  requestedTemperature: number | undefined;
} => ({
  requestedTemperature:
    typeof payload.temperature === 'number' ? payload.temperature : undefined,
  requestedMaxTokens: typeof payload.maxTokens === 'number' ? payload.maxTokens : undefined,
  requestedSystemPrompt: asNonEmptyString(payload['systemPrompt']) ?? '',
});

const resolveContextRegistryPrompt = (payload: GraphModelPayload): string => {
  const parsed = contextRegistryConsumerEnvelopeSchema.safeParse(payload['contextRegistry']);
  if (!parsed.success) return '';
  return buildAiPathsContextRegistrySystemPrompt(parsed.data.resolved ?? null);
};

const resolveAiPathsBrainConfig = async ({
  contextRegistryPrompt,
  errorContext,
  payload,
  requestedMaxTokens,
  requestedModelId,
  requestedSystemPrompt,
  requestedTemperature,
}: {
  contextRegistryPrompt: string;
  errorContext: AiPathsConfigErrorContext;
  payload: GraphModelPayload;
  requestedMaxTokens: number | undefined;
  requestedModelId: string;
  requestedSystemPrompt: string;
  requestedTemperature: number | undefined;
}): Promise<GraphModelBrainConfig> => {
  const brainConfig = await resolveAiPathsNodeExecutionConfig({
    requestedModelId: toOptionalString(asNonEmptyString(requestedModelId)),
    requestedTemperature,
    requestedMaxTokens,
    requestedSystemPrompt: toOptionalString(asNonEmptyString(requestedSystemPrompt)),
    defaultTemperature: 0.7,
    defaultMaxTokens: 800,
    defaultSystemPrompt: 'You are an AI assistant.',
    runtimeKind: isVisionPayload(payload) ? 'vision' : 'chat',
  }).catch((error: unknown) => enrichAiPathsConfigError(error, errorContext));
  return {
    brainApplied: brainConfig.brainApplied,
    maxTokens: brainConfig.maxTokens,
    modelId: brainConfig.modelId,
    systemMessage: resolveSystemMessage(brainConfig.systemPrompt, contextRegistryPrompt),
    temperature: brainConfig.temperature,
  };
};

const resolveDefaultBrainConfig = async ({
  contextRegistryPrompt,
  payload,
  requestedMaxTokens,
  requestedSystemPrompt,
  requestedTemperature,
}: {
  contextRegistryPrompt: string;
  payload: GraphModelPayload;
  requestedMaxTokens: number | undefined;
  requestedSystemPrompt: string;
  requestedTemperature: number | undefined;
}): Promise<GraphModelBrainConfig> => {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    isVisionPayload(payload) ? 'product.description.vision' : 'product.description.generation',
    {
      defaultTemperature: requestedTemperature ?? 0.7,
      defaultMaxTokens: requestedMaxTokens ?? 800,
      defaultSystemPrompt:
        requestedSystemPrompt.length > 0 ? requestedSystemPrompt : 'You are an AI assistant.',
      runtimeKind: isVisionPayload(payload) ? 'vision' : 'chat',
    }
  );
  return {
    brainApplied: brainConfig.brainApplied,
    maxTokens: brainConfig.maxTokens,
    modelId: brainConfig.modelId,
    systemMessage: resolveSystemMessage(brainConfig.systemPrompt, contextRegistryPrompt),
    temperature: brainConfig.temperature,
  };
};

const resolveGraphModelBrainConfig = async (
  input: PreparedGraphModelExecutionInput
): Promise<GraphModelBrainConfig> => {
  const requested = resolveRequestedModelOptions(input.payload);
  const contextRegistryPrompt = resolveContextRegistryPrompt(input.payload);
  if (input.source === 'ai_paths') {
    return resolveAiPathsBrainConfig({
      contextRegistryPrompt,
      errorContext: input.aiPathsConfigErrorContext,
      payload: input.payload,
      requestedModelId: input.requestedModelId,
      ...requested,
    });
  }
  return resolveDefaultBrainConfig({
    contextRegistryPrompt,
    payload: input.payload,
    ...requested,
  });
};

const getGraphModelImageUrls = (payload: GraphModelPayload): string[] =>
  Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter(
        (url: unknown): url is string => typeof url === 'string' && url.trim().length > 0
      )
    : [];

const resolveEffectivePrompt = (rawPrompt: string, modelId: string): string => {
  const isOpenAi = inferBrainModelVendor(modelId) === 'openai';
  if (!isOpenAi || rawPrompt.length <= OPENAI_MAX_PROMPT_CHARS) return rawPrompt;
  return rawPrompt.slice(0, OPENAI_MAX_PROMPT_CHARS);
};

const buildGraphModelContent = async ({
  effectivePrompt,
  imageUrls,
  modelId,
  payload,
}: {
  effectivePrompt: string;
  imageUrls: string[];
  modelId: string;
  payload: GraphModelPayload;
}): Promise<ChatCompletionContentPart[]> => {
  const content: ChatCompletionContentPart[] = [{ type: 'text', text: effectivePrompt }];
  if (isVisionPayload(payload) && imageUrls.length > 0) {
    content.push(...(await buildImageParts(imageUrls, inferBrainModelVendor(modelId) === 'openai')));
  }
  return content;
};

const runGraphCompletionWithRetry = async ({
  effectivePrompt,
  maxTokens,
  messages,
  modelId,
  temperature,
}: {
  effectivePrompt: string;
  maxTokens: number;
  messages: Parameters<typeof runBrainChatCompletion>[0]['messages'];
  modelId: string;
  temperature: number;
}): Promise<GraphModelCompletionState> => {
  let completion = await runBrainChatCompletion({ modelId, temperature, maxTokens, messages });
  let resultText = completion.text.trim();
  const retryReason = resolveGraphModelRetryReason({ prompt: effectivePrompt, resultText });
  if (retryReason === null) {
    return { completionRetryCount: 0, maxTokens, retryReason, resultText, temperature };
  }
  const retryConfig = resolveGraphModelRetryConfig({ temperature, maxTokens, reason: retryReason });
  completion = await runBrainChatCompletion({ modelId, ...retryConfig, messages });
  resultText = completion.text.trim();
  return {
    completionRetryCount: 1,
    maxTokens: retryConfig.maxTokens,
    retryReason,
    resultText,
    temperature: retryConfig.temperature,
  };
};

const buildGraphModelResult = ({
  brainConfig,
  completion,
  input,
  imageUrls,
}: {
  brainConfig: GraphModelBrainConfig;
  completion: GraphModelCompletionState;
  imageUrls: string[];
  input: PreparedGraphModelExecutionInput & { productId: string };
}): Record<string, unknown> => ({
  result: completion.resultText,
  modelId: brainConfig.modelId,
  prompt: input.rawPrompt,
  imageUrls,
  temperature: completion.temperature,
  maxTokens: completion.maxTokens,
  source: input.source,
  graph: input.payload.graph ?? undefined,
  productId: input.productId,
  ...(completion.completionRetryCount > 0
    ? {
        completionRetryCount: completion.completionRetryCount,
        completionRetryReason: completion.retryReason,
      }
    : {}),
  ...(brainConfig.brainApplied !== undefined ? { brainApplied: brainConfig.brainApplied } : {}),
});

export async function processGraphModel(job: Job): Promise<Record<string, unknown>> {
  const input = await prepareGraphModelExecutionInput({
    payload: job.payload,
    jobId: job.id,
    findRunById: async (runId) => {
      const repository = await getPathRunRepository();
      return repository.findRunById(runId);
    },
  });
  const brainConfig = await resolveGraphModelBrainConfig(input);
  const imageUrls = getGraphModelImageUrls(input.payload);
  const effectivePrompt = resolveEffectivePrompt(input.rawPrompt, brainConfig.modelId);
  const content = await buildGraphModelContent({
    effectivePrompt,
    imageUrls,
    modelId: brainConfig.modelId,
    payload: input.payload,
  });
  const completion = await runGraphCompletionWithRetry({
    effectivePrompt,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: brainConfig.systemMessage },
      { role: 'user', content },
    ],
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
  });
  return buildGraphModelResult({
    brainConfig,
    completion,
    imageUrls,
    input: { ...input, productId: job.productId },
  });
}
