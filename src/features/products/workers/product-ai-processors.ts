import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import {
  resolveAiPathsNodeExecutionConfig,
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { createMongoBackup, createPostgresBackup } from '@/shared/lib/db/services/database-backup';
import { runDatabaseSync } from '@/shared/lib/db/services/database-sync';
import { type DatabaseSyncDirection } from '@/shared/contracts';
import {
  markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded,
} from '@/shared/lib/db/services/database-backup-scheduler';
import type { ImageFileRecord } from '@/shared/lib/files/services/image-file-service';
import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import {
  listBaseListingsForSync,
  syncBaseImagesForListing,
} from '@/features/integrations/services/base-image-sync';
import { getProductRepository } from '@/features/products/server';
import { buildImageBase64Slots } from '@/shared/lib/products/services/image-base64';
import type { ProductAiJobRecord } from '@/shared/contracts/jobs';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

export type JobPayload = {
  isTest?: boolean;
  imageUrls?: string[];
  prompt?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  vision?: boolean;
  source?: string;
  graph?: Record<string, unknown>;
  direction?: DatabaseSyncDirection;
  skipAuthCollections?: boolean;
  [key: string]: unknown;
};

export type Job = ProductAiJobRecord & {
  payload: JobPayload;
};

const buildImageParts = async (imageUrls: string[]): Promise<ChatCompletionContentPart[]> => {
  if (!imageUrls.length) return [] as ChatCompletionContentPart[];
  const imageFileRepository = await getImageFileRepository();
  const imageFiles = await imageFileRepository.listImageFiles();
  const imageFileMap = new Map<string, ImageFileRecord>(
    imageFiles.map((file: ImageFileRecord) => [file.filepath, file])
  );

  const imagePromises = imageUrls.map(
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
          const normalized = item.startsWith('/') ? item.slice(1) : item;
          const imagePath = path.join(process.cwd(), 'public', normalized);
          const buffer = await fs.readFile(imagePath);
          base64Image = buffer.toString('base64');
          const record = imageFileMap.get(item);
          if (record) mimetype = record.mimetype;
        }
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${mimetype};base64,${base64Image}` },
        };
      } catch {
        return null;
      }
    }
  );

  return (await Promise.all(imagePromises)).filter(
    (
      img: ChatCompletionContentPart | null
    ): img is Extract<ChatCompletionContentPart, { type: 'image_url' }> => Boolean(img)
  );
};

export async function processGraphModel(job: Job): Promise<Record<string, unknown>> {
  const { payload, productId } = job;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    throw badRequestError('Graph model job missing prompt', { jobId: job.id });
  }
  const source =
    typeof payload.source === 'string' && payload.source.trim()
      ? payload.source.trim()
      : 'ai_paths';
  const requestedModelId = typeof payload.modelId === 'string' ? payload.modelId.trim() : '';
  const requestedTemperature =
    typeof payload.temperature === 'number' ? payload.temperature : undefined;
  const requestedMaxTokens = typeof payload.maxTokens === 'number' ? payload.maxTokens : undefined;
  const requestedSystemPrompt =
    typeof payload['systemPrompt'] === 'string' && payload['systemPrompt'].trim()
      ? payload['systemPrompt'].trim()
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
    });
    modelId = brainConfig.modelId;
    temperature = brainConfig.temperature;
    maxTokens = brainConfig.maxTokens;
    systemMessage = brainConfig.systemPrompt;
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
    systemMessage = brainConfig.systemPrompt;
    brainApplied = brainConfig.brainApplied;
  }
  const content: ChatCompletionContentPart[] = [{ type: 'text', text: prompt }];
  if (attachImages) {
    const imageParts = await buildImageParts(imageUrls);
    content.push(...imageParts);
  }

  const completion = await runBrainChatCompletion({
    modelId,
    temperature,
    maxTokens,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content },
    ],
  });
  const resultText = completion.text.trim() || '';
  return {
    result: resultText,
    modelId,
    prompt,
    imageUrls,
    temperature,
    maxTokens,
    source,
    graph: payload.graph ?? undefined,
    productId,
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
