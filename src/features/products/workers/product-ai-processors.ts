import 'server-only';

import fs from 'fs/promises';

import { getProductRepository } from '@/features/products/server';
import { type DatabaseSyncDirection } from '@/shared/contracts';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { GraphModelJobPayload, ProductAiJobRecord } from '@/shared/contracts/jobs';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import {
  resolveAiPathsNodeExecutionConfig,
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { createMongoBackup, createPostgresBackup } from '@/shared/lib/db/services/database-backup';
import {
  markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded,
} from '@/shared/lib/db/services/database-backup-scheduler';
import { runDatabaseSync } from '@/shared/lib/db/services/database-sync';
import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import {
  getDiskPathFromPublicPath,
  type ImageFileRecord,
} from '@/shared/lib/files/services/image-file-service';
import {
  listBaseListingsForSync,
  syncBaseImagesForListing,
} from '@/shared/lib/product-integrations-server';
import { buildImageBase64Slots } from '@/shared/lib/products/services/image-base64';
import {
  resolveAiPathsGraphModelNodeSnapshotFromExecutionContext,
  resolveGraphModelExecutionContext,
} from '@/shared/lib/products/services/product-ai-graph-model-payload';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

// OpenAI-specific request body limits (~20 MB hard cap from the API).
// These constants are only applied when the resolved model vendor is 'openai'.
const OPENAI_MAX_IMAGES = 10;
// 4 MB base64 string ≈ 3 MB raw image — enough for any reasonable product photo.
const OPENAI_MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
// Total base64 budget for all images in one request (≈ 15 MB).
const OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES = 15 * 1024 * 1024;
// Prompt character cap — ~100 k chars ≈ 25 k tokens, generous for any product prompt.
const OPENAI_MAX_PROMPT_CHARS = 100_000;
const GRAPH_MODEL_RETRY_MAX_TOKENS = 4_000;

const extractJsonCandidate = (value: string): string => {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fencedMatch?.[1]?.trim() ?? trimmed;
};

const looksLikeJsonCandidate = (value: string): boolean => {
  const candidate = extractJsonCandidate(value);
  return candidate.startsWith('{') || candidate.startsWith('[');
};

const canParseJsonCandidate = (value: string): boolean => {
  const candidate = extractJsonCandidate(value);
  if (!looksLikeJsonCandidate(candidate)) return false;
  try {
    JSON.parse(candidate);
    return true;
  } catch {
    return false;
  }
};

const resolveGraphModelRetryReason = (args: {
  prompt: string;
  resultText: string;
}): 'empty_result' | 'invalid_json' | null => {
  if (!args.resultText) return 'empty_result';
  if (!/\bjson\b/i.test(args.prompt)) return null;
  if (!looksLikeJsonCandidate(args.resultText)) return null;
  return canParseJsonCandidate(args.resultText) ? null : 'invalid_json';
};

const resolveGraphModelRetryConfig = (args: {
  temperature: number;
  maxTokens: number;
  reason: 'empty_result' | 'invalid_json';
}): {
  temperature: number;
  maxTokens: number;
} => ({
  temperature: args.reason === 'empty_result' ? Math.min(args.temperature, 0.2) : args.temperature,
  maxTokens: Math.min(
    GRAPH_MODEL_RETRY_MAX_TOKENS,
    Math.max(args.maxTokens + 400, Math.ceil(args.maxTokens * 1.5))
  ),
});

export type JobPayload = GraphModelJobPayload & {
  direction?: DatabaseSyncDirection;
  skipAuthCollections?: boolean;
};

export type Job = ProductAiJobRecord & {
  payload: JobPayload;
};

const enrichAiPathsConfigError = (
  error: unknown,
  args: {
    requestedModelId: string;
    runId: string | null;
    nodeId: string | null;
    nodeTitle: string | null;
  }
): never => {
  if (!(error instanceof Error)) throw error;
  const { requestedModelId, runId, nodeId, nodeTitle } = args;

  const failingNodeLabel = nodeTitle
    ? nodeId
      ? `Failing AI Paths node "${nodeTitle}" <${nodeId}>`
      : `Failing AI Paths node "${nodeTitle}"`
    : nodeId
      ? `Failing AI Paths node <${nodeId}>`
      : '';
  const detailParts = [
    failingNodeLabel,
    runId ? `run ${runId}` : '',
    `requested node model: ${requestedModelId || 'none'}`,
  ].filter(Boolean);
  if (detailParts.length > 0) {
    error.message = `${error.message} ${detailParts.join(', ')}.`;
  }
  throw error;
};

const buildImageParts = async (
  imageUrls: string[],
  openAiGuards: boolean
): Promise<ChatCompletionContentPart[]> => {
  if (!imageUrls.length) return [] as ChatCompletionContentPart[];

  // Apply OpenAI image-count cap only for OpenAI models.
  const urlsToProcess = openAiGuards ? imageUrls.slice(0, OPENAI_MAX_IMAGES) : imageUrls;

  const imageFileRepository = await getImageFileRepository();
  const imageFiles = await imageFileRepository.listImageFiles();
  const imageFileMap = new Map<string, ImageFileRecord>(
    imageFiles.map((file: ImageFileRecord) => [file.filepath, file])
  );

  const imagePromises = urlsToProcess.map(
    async (item: string): Promise<ChatCompletionContentPart | null> => {
      try {
        let base64Image: string;
        let mimetype = 'image/jpeg';
        if (item.startsWith('http')) {
          const res = await fetch(item);
          if (!res.ok) return null;
          const buffer = Buffer.from(await res.arrayBuffer());
          base64Image = buffer.toString('base64');
          mimetype = res.headers.get('content-type') || 'image/jpeg';
        } else {
          const imagePath = getDiskPathFromPublicPath(item);
          const buffer = await fs.readFile(imagePath);
          base64Image = buffer.toString('base64');
          const record = imageFileMap.get(item);
          if (record) mimetype = record.mimetype;
        }
        // OpenAI only: drop images that individually exceed the per-image size budget.
        if (openAiGuards && base64Image.length > OPENAI_MAX_IMAGE_BASE64_BYTES) return null;
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${mimetype};base64,${base64Image}` },
        };
      } catch {
        return null;
      }
    }
  );

  const parts = (await Promise.all(imagePromises)).filter(
    (
      img: ChatCompletionContentPart | null
    ): img is Extract<ChatCompletionContentPart, { type: 'image_url' }> => Boolean(img)
  );

  if (!openAiGuards) return parts;

  // OpenAI only: apply the total-size budget; drop trailing images once we'd exceed the cap.
  let totalBytes = 0;
  const budgeted: typeof parts = [];
  for (const part of parts) {
    const url = (part as { image_url: { url: string } }).image_url.url;
    totalBytes += url.length;
    if (totalBytes > OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES) break;
    budgeted.push(part);
  }
  return budgeted;
};

export async function processGraphModel(job: Job): Promise<Record<string, unknown>> {
  const { payload: rawPayload, productId } = job;
  const executionContext = resolveGraphModelExecutionContext(rawPayload);
  const source = executionContext.source;
  const payload = (executionContext.payload ?? rawPayload) as JobPayload;
  const rawPrompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!rawPrompt) {
    throw badRequestError('Graph model job missing prompt', { jobId: job.id });
  }
  if (!source) {
    throw badRequestError('Graph model job missing source', { jobId: job.id });
  }
  if (
    source === 'ai_paths' &&
    !executionContext.hasAiPathsNodeContext &&
    !executionContext.requestedModelId
  ) {
    throw badRequestError(
      'AI Paths graph_model payload requires graph.runId and graph.nodeId when no requested model is provided.',
      { jobId: job.id }
    );
  }
  const aiPathsNodeSnapshot =
    source === 'ai_paths'
      ? await resolveAiPathsGraphModelNodeSnapshotFromExecutionContext({
        executionContext,
        findRunById: async (runId) => {
          const repository = await getPathRunRepository();
          return repository.findRunById(runId);
        },
      })
      : null;
  const requestedModelId =
    aiPathsNodeSnapshot?.requestedModelId ??
    (typeof payload.modelId === 'string' ? payload.modelId.trim() : '');
  const resolvedNodeTitle = aiPathsNodeSnapshot?.nodeTitle ?? executionContext.nodeTitle;
  const requestedTemperature =
    typeof payload.temperature === 'number' ? payload.temperature : undefined;
  const requestedMaxTokens = typeof payload.maxTokens === 'number' ? payload.maxTokens : undefined;
  const requestedSystemPrompt =
    typeof payload['systemPrompt'] === 'string' && payload['systemPrompt'].trim()
      ? payload['systemPrompt'].trim()
      : '';
  const contextRegistryParsed = contextRegistryConsumerEnvelopeSchema.safeParse(
    payload['contextRegistry']
  );
  const contextRegistryPrompt = contextRegistryParsed.success
    ? buildAiPathsContextRegistrySystemPrompt(contextRegistryParsed.data.resolved ?? null)
    : '';
  let modelId: string;
  let temperature: number;
  let maxTokens: number;
  let systemMessage: string;
  let brainApplied: Record<string, unknown> | undefined;
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter(
      (url: unknown): url is string => typeof url === 'string' && url.trim() !== ''
    )
    : [];
  const attachImages = Boolean(payload.vision) && imageUrls.length > 0;
  if (source === 'ai_paths') {
    const brainConfig = await resolveAiPathsNodeExecutionConfig({
      requestedModelId: requestedModelId || undefined,
      requestedTemperature,
      requestedMaxTokens,
      requestedSystemPrompt: requestedSystemPrompt || undefined,
      defaultTemperature: 0.7,
      defaultMaxTokens: 800,
      defaultSystemPrompt: 'You are an AI assistant.',
      runtimeKind: payload.vision ? 'vision' : 'chat',
    }).catch((error: unknown) =>
      enrichAiPathsConfigError(error, {
        requestedModelId,
        runId: executionContext.runId,
        nodeId: executionContext.nodeId,
        nodeTitle: resolvedNodeTitle,
      })
    );
    modelId = brainConfig.modelId;
    temperature = brainConfig.temperature;
    maxTokens = brainConfig.maxTokens;
    systemMessage = [brainConfig.systemPrompt, contextRegistryPrompt].filter(Boolean).join('\n\n');
    brainApplied = brainConfig.brainApplied;
  } else {
    const capability = payload.vision
      ? 'product.description.vision'
      : 'product.description.generation';
    const brainConfig = await resolveBrainExecutionConfigForCapability(capability, {
      defaultTemperature: requestedTemperature ?? 0.7,
      defaultMaxTokens: requestedMaxTokens ?? 800,
      defaultSystemPrompt: requestedSystemPrompt || 'You are an AI assistant.',
      runtimeKind: payload.vision ? 'vision' : 'chat',
    });
    modelId = brainConfig.modelId;
    temperature = brainConfig.temperature;
    maxTokens = brainConfig.maxTokens;
    systemMessage = [brainConfig.systemPrompt, contextRegistryPrompt].filter(Boolean).join('\n\n');
    brainApplied = brainConfig.brainApplied;
  }

  // Apply OpenAI-specific payload guards only when the resolved model is from OpenAI.
  const isOpenAi = inferBrainModelVendor(modelId) === 'openai';
  const effectivePrompt =
    isOpenAi && rawPrompt.length > OPENAI_MAX_PROMPT_CHARS
      ? rawPrompt.slice(0, OPENAI_MAX_PROMPT_CHARS)
      : rawPrompt;

  const content: ChatCompletionContentPart[] = [{ type: 'text', text: effectivePrompt }];
  if (attachImages) {
    const imageParts = await buildImageParts(imageUrls, isOpenAi);
    content.push(...imageParts);
  }

  const messages = [
    { role: 'system' as const, content: systemMessage },
    { role: 'user' as const, content },
  ];
  const runCompletion = async (input: {
    temperature: number;
    maxTokens: number;
  }): Promise<Awaited<ReturnType<typeof runBrainChatCompletion>>> =>
    runBrainChatCompletion({
      modelId,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      messages,
    });

  let effectiveTemperature = temperature;
  let effectiveMaxTokens = maxTokens;
  let completion = await runCompletion({
    temperature: effectiveTemperature,
    maxTokens: effectiveMaxTokens,
  });
  let resultText = completion.text.trim() || '';
  const retryReason = resolveGraphModelRetryReason({
    prompt: effectivePrompt,
    resultText,
  });
  let completionRetryCount = 0;

  if (retryReason) {
    const retryConfig = resolveGraphModelRetryConfig({
      temperature: effectiveTemperature,
      maxTokens: effectiveMaxTokens,
      reason: retryReason,
    });
    effectiveTemperature = retryConfig.temperature;
    effectiveMaxTokens = retryConfig.maxTokens;
    completion = await runCompletion(retryConfig);
    resultText = completion.text.trim() || '';
    completionRetryCount = 1;
  }

  return {
    result: resultText,
    modelId,
    prompt: rawPrompt,
    imageUrls,
    temperature: effectiveTemperature,
    maxTokens: effectiveMaxTokens,
    source,
    graph: payload.graph ?? undefined,
    productId,
    ...(completionRetryCount > 0
      ? {
        completionRetryCount,
        completionRetryReason: retryReason,
      }
      : {}),
    ...(brainApplied ? { brainApplied } : {}),
  };
}

export async function processDatabaseSync(job: Job): Promise<Record<string, unknown>> {
  const direction = job.payload.direction ?? 'mongo_to_prisma';
  return runDatabaseSync(direction, {
    skipAuthCollections: Boolean(job.payload.skipAuthCollections),
  });
}

export async function processDatabaseBackup(job: Job): Promise<Record<string, unknown>> {
  const dbType = job.payload['dbType'];
  if (dbType !== 'mongodb' && dbType !== 'postgresql') {
    throw badRequestError('Database backup job missing valid dbType', {
      jobId: job.id,
      dbType,
    });
  }

  try {
    await markDatabaseBackupJobRunning(dbType, job.id);
  } catch {
    // Backup execution should continue even if scheduler metadata persistence fails.
  }

  try {
    if (dbType === 'mongodb') {
      const result = await createMongoBackup();
      try {
        await markDatabaseBackupJobSucceeded(dbType, job.id);
      } catch {
        // Keep backup result successful if status persistence fails.
      }
      return { ...result, dbType };
    }

    const result = await createPostgresBackup();
    try {
      await markDatabaseBackupJobSucceeded(dbType, job.id);
    } catch {
      // Keep backup result successful if status persistence fails.
    }
    return { ...result, dbType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await markDatabaseBackupJobFailed(dbType, job.id, message);
    } catch {
      // Keep original backup failure as the primary error path.
    }
    throw error;
  }
}

export async function processBase64ConvertAll(job: Job): Promise<Record<string, unknown>> {
  const productRepo = await getProductRepository();
  const pageSize = typeof job.payload['pageSize'] === 'number' ? job.payload['pageSize'] : 100;
  let page = 1;
  let requested = 0;
  let succeeded = 0;
  let failed = 0;

  for (;;) {
    const products = await productRepo.getProducts({
      page: page,
      pageSize: pageSize,
    });
    if (!products.length) break;
    requested += products.length;

    for (const product of products) {
      try {
        const { imageBase64s, imageLinks } = await buildImageBase64Slots(product);
        await productRepo.updateProduct(product.id, { imageBase64s, imageLinks });
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }

    if (products.length < pageSize) break;
    page += 1;
  }

  return {
    collections: [
      {
        name: 'products',
        requested,
        succeeded,
        failed,
      },
    ],
    requested,
    succeeded,
    failed,
    pageSize,
    source: job.payload.source ?? 'base64_all',
  };
}

export async function processBaseImageSyncAll(job: Job): Promise<Record<string, unknown>> {
  const listings = await listBaseListingsForSync();
  const requested = listings.length;
  let succeeded = 0;
  let failed = 0;

  for (const listing of listings) {
    try {
      await syncBaseImagesForListing(listing.id, listing.productId, listing.inventoryId ?? null);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    collections: [
      {
        name: 'base_image_sync',
        requested,
        succeeded,
        failed,
      },
    ],
    requested,
    succeeded,
    failed,
    source: job.payload.source ?? 'base_image_sync_all',
  };
}

export async function dispatchProductAiJob(job: Job): Promise<unknown> {
  switch (job.type) {
    case 'graph_model':
      return processGraphModel(job);
    case 'db_sync':
      return processDatabaseSync(job);
    case 'db_backup':
      return processDatabaseBackup(job);
    case 'base64_all':
      return processBase64ConvertAll(job);
    case 'base_images_sync_all':
      return processBaseImageSyncAll(job);
    default:
      throw operationFailedError(`Unknown job type: ${job.type}`, undefined, {
        jobId: job.id,
        type: job.type,
      });
  }
}
