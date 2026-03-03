import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { UnrecoverableError } from 'bullmq';

import {
  getBrainAssignmentForFeature,
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { resolveCaseResolverOcrDiskPath } from '@/features/case-resolver/server/ocr-runtime';
import {
  markCaseResolverOcrJobCompleted,
  markCaseResolverOcrJobFailed,
  markCaseResolverOcrJobQueuedForRetry,
  markCaseResolverOcrJobRunning,
} from '@/features/case-resolver/server/ocr-runtime-job-store';
import { DEFAULT_CASE_RESOLVER_OCR_PROMPT } from '@/features/case-resolver/settings';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';

import { LOG_SOURCE } from './case-resolver-ocr/config';
import { 
  type CaseResolverOcrQueueJobData, 
  type CaseResolverResolvedOcrModel,
  type PreparedCaseResolverOcrInput
} from './case-resolver-ocr/types';
import { 
  inferCaseResolverOcrProviderFromModel,
  resolveCaseResolverOcrModel,
  resolveCaseResolverOcrModelCandidates,
} from './case-resolver-ocr/model-resolution';
import { 
  runOpenAiOcrRequest 
} from './case-resolver-ocr/processors/openai';
import { 
  runAnthropicOcrRequest 
} from './case-resolver-ocr/processors/anthropic';
import { 
  runGeminiOcrRequest 
} from './case-resolver-ocr/processors/gemini';
import { 
  runOllamaOcrRequest 
} from './case-resolver-ocr/processors/ollama';
import { 
  extractPdfTextForOcr 
} from './case-resolver-ocr/pdf-utils';
import { 
  classifyCaseResolverOcrError,
  isRetryableCaseResolverOcrError 
} from './case-resolver-ocr/error-classification';

const resolveImageMimeType = (filepath: string): string => {
  const extension = path.extname(filepath).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.avif':
      return 'image/avif';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
};

const resolveOcrPrompt = (prompt: string): string => {
  const runtimePrompt = prompt.trim();
  if (runtimePrompt) return runtimePrompt;
  return DEFAULT_CASE_RESOLVER_OCR_PROMPT;
};

const prepareCaseResolverOcrInput = async (
  resolvedPath: ReturnType<typeof resolveCaseResolverOcrDiskPath>
): Promise<PreparedCaseResolverOcrInput> => {
  if (resolvedPath.kind === 'image') {
    const buffer = await fs.readFile(resolvedPath.diskPath);
    return {
      kind: 'image',
      filepath: resolvedPath.filepath,
      base64Image: buffer.toString('base64'),
      mimeType: resolveImageMimeType(resolvedPath.filepath),
    };
  }

  return {
    kind: 'pdf',
    filepath: resolvedPath.filepath,
    extractedDocumentText: await extractPdfTextForOcr(resolvedPath.diskPath),
  };
};

const runPreparedCaseResolverOcrRequest = async (input: {
  prepared: PreparedCaseResolverOcrInput;
  model: CaseResolverResolvedOcrModel;
  prompt: string;
}): Promise<string> => {
  if (input.prepared.kind === 'image') {
    if (input.model.provider === 'openai') {
      return runOpenAiOcrRequest({
        model: input.model.model,
        prompt: input.prompt,
        filepath: input.prepared.filepath,
        base64Image: input.prepared.base64Image,
        mimeType: input.prepared.mimeType,
      });
    }
    if (input.model.provider === 'anthropic') {
      return runAnthropicOcrRequest({
        model: input.model.model,
        prompt: input.prompt,
        filepath: input.prepared.filepath,
        base64Image: input.prepared.base64Image,
        mimeType: input.prepared.mimeType,
      });
    }
    if (input.model.provider === 'gemini') {
      return runGeminiOcrRequest({
        model: input.model.model,
        prompt: input.prompt,
        filepath: input.prepared.filepath,
        base64Image: input.prepared.base64Image,
        mimeType: input.prepared.mimeType,
      });
    }
    return runOllamaOcrRequest({
      model: input.model.model,
      prompt: input.prompt,
      filepath: input.prepared.filepath,
      images: [input.prepared.base64Image],
    });
  }

  if (input.model.provider === 'openai') {
    return runOpenAiOcrRequest({
      model: input.model.model,
      prompt: input.prompt,
      filepath: input.prepared.filepath,
      extractedDocumentText: input.prepared.extractedDocumentText,
    });
  }
  if (input.model.provider === 'anthropic') {
    return runAnthropicOcrRequest({
      model: input.model.model,
      prompt: input.prompt,
      filepath: input.prepared.filepath,
      extractedDocumentText: input.prepared.extractedDocumentText,
    });
  }
  if (input.model.provider === 'gemini') {
    return runGeminiOcrRequest({
      model: input.model.model,
      prompt: input.prompt,
      filepath: input.prepared.filepath,
      extractedDocumentText: input.prepared.extractedDocumentText,
    });
  }
  return runOllamaOcrRequest({
    model: input.model.model,
    prompt: input.prompt,
    filepath: input.prepared.filepath,
    extractedDocumentText: input.prepared.extractedDocumentText,
  });
};

const processOcrJob = async (data: CaseResolverOcrQueueJobData): Promise<void> => {
  const startedAt = Date.now();
  const correlationId = data.correlationId || data.jobId;

  try {
    await markCaseResolverOcrJobRunning(data.jobId, data.filepath, { correlationId });

    const resolvedPath = resolveCaseResolverOcrDiskPath(data.filepath);
    const preparedInput = await prepareCaseResolverOcrInput(resolvedPath);
    const prompt = resolveOcrPrompt(data.prompt);
    const modelCandidates = resolveCaseResolverOcrModelCandidates(data.model);

    let lastError: unknown = null;
    let resultText = '';

    for (const model of modelCandidates) {
      try {
        resultText = await runPreparedCaseResolverOcrRequest({
          prepared: preparedInput,
          model,
          prompt,
        });
        if (resultText) break;
      } catch (error) {
        lastError = error;
        void logSystemEvent({
          level: 'warn',
          source: LOG_SOURCE,
          message: `OCR attempt failed for model ${model.provider}:${model.model}`,
          error,
          context: { jobId: data.jobId, correlationId, model },
        });
      }
    }

    if (!resultText) {
      throw lastError || new Error('All OCR model candidates failed to return text.');
    }

    await markCaseResolverOcrJobCompleted(data.jobId, resultText);

    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'OCR job completed successfully',
      context: {
        jobId: data.jobId,
        correlationId,
        durationMs: Date.now() - startedAt,
        resultLength: resultText.length,
      },
    });
  } catch (error) {
    const isRetryable = isRetryableCaseResolverOcrError(error);
    if (isRetryable) {
      await markCaseResolverOcrJobQueuedForRetry(data.jobId, {
        retryableError: true,
      });
      throw error; // Let BullMQ handle the retry
    }

    await markCaseResolverOcrJobFailed(data.jobId, String(error));
    void logSystemEvent({
      level: 'error',
      source: LOG_SOURCE,
      message: 'OCR job failed permanently',
      error,
      context: { jobId: data.jobId, correlationId, durationMs: Date.now() - startedAt },
    });
    throw new UnrecoverableError(String(error));
  }
};

const ocrQueue = createManagedQueue<CaseResolverOcrQueueJobData>({
  name: 'case-resolver-ocr',
  concurrency: 2,
  processor: async (data: CaseResolverOcrQueueJobData) => {
    await processOcrJob(data);
  },
});

export const enqueueCaseResolverOcrJob = async (
  data: CaseResolverOcrQueueJobData
): Promise<'queued' | 'inline'> => {
  const brain = await getBrainAssignmentForFeature('case_resolver');
  if (!brain.enabled) {
    throw new Error('Case Resolver is disabled in Brain settings.');
  }

  await resolveBrainExecutionConfigForCapability('case_resolver.ocr');

  const isRedis = isRedisAvailable();
  if (!isRedis) {
    void (async () => {
      try {
        await processOcrJob(data);
      } catch (error) {
        console.error('[CaseResolverOcr] Inline processing failed:', error);
      }
    })();
    return 'inline';
  }

  await ocrQueue.enqueue(data, {
    jobId: data.jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });

  return 'queued';
};

export const startCaseResolverOcrWorker = (): void => {
  ocrQueue.startWorker();
};

export const startCaseResolverOcrQueue = startCaseResolverOcrWorker;

// Shared OCR helpers exported for queue tests and runtime modules.
export {
  inferCaseResolverOcrProviderFromModel,
  resolveCaseResolverOcrModel,
  resolveCaseResolverOcrModelCandidates,
  classifyCaseResolverOcrError,
  isRetryableCaseResolverOcrError,
};
