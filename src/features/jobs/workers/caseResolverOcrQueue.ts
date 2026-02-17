import 'server-only';

import fs from 'fs/promises';

import { resolveCaseResolverImageDiskPath } from '@/features/case-resolver/server/ocr-runtime';
import {
  markCaseResolverOcrJobCompleted,
  markCaseResolverOcrJobFailed,
  markCaseResolverOcrJobRunning,
} from '@/features/case-resolver/server/ocr-runtime-job-store';
import { DEFAULT_CASE_RESOLVER_OCR_PROMPT } from '@/features/case-resolver/settings';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';

const LOG_SOURCE = 'case-resolver-ocr-queue';
const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL']?.trim() || '';

type CaseResolverOcrQueueJobData = {
  jobId: string;
  filepath: string;
  model: string;
  prompt: string;
};

type OllamaChatPayload = {
  message?: { content?: unknown };
  response?: unknown;
};

export type CaseResolverOcrDispatchMode = 'queued' | 'inline';

const resolveOcrModel = (model: string): string => {
  const runtimeModel = model.trim();
  if (runtimeModel) return runtimeModel;
  if (OLLAMA_MODEL) return OLLAMA_MODEL;
  throw new Error('OCR model is not configured.');
};

const resolveOcrPrompt = (prompt: string): string => {
  const runtimePrompt = prompt.trim();
  if (runtimePrompt) return runtimePrompt;
  return DEFAULT_CASE_RESOLVER_OCR_PROMPT;
};

const runCaseResolverOcr = async (input: {
  filepath: string;
  model: string;
  prompt: string;
}): Promise<string> => {
  const diskPath = resolveCaseResolverImageDiskPath(input.filepath);
  const model = resolveOcrModel(input.model);
  const prompt = resolveOcrPrompt(input.prompt);
  const buffer = await fs.readFile(diskPath);
  const base64Image = buffer.toString('base64');

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [base64Image],
        },
      ],
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const fallback = `OCR runtime request failed (${response.status})`;
    throw new Error(responseBody.trim() || fallback);
  }

  const payload = (await response.json()) as OllamaChatPayload;
  const message =
    typeof payload.message?.content === 'string'
      ? payload.message.content
      : typeof payload.response === 'string'
        ? payload.response
        : '';
  return message.trim();
};

const queue = createManagedQueue<CaseResolverOcrQueueJobData>({
  name: 'case-resolver-ocr',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    await markCaseResolverOcrJobRunning(data.jobId, data.filepath);
    try {
      const extractedText = await runCaseResolverOcr({
        filepath: data.filepath,
        model: data.model,
        prompt: data.prompt,
      });
      await markCaseResolverOcrJobCompleted(data.jobId, extractedText);
      return { ok: true, jobId: data.jobId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'OCR runtime job failed.';
      await markCaseResolverOcrJobFailed(data.jobId, errorMessage);
      throw error;
    }
  },
  onCompleted: async (jobId, _result, data) => {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `OCR job ${data.jobId} completed`,
      context: { queueJobId: jobId, runtimeJobId: data.jobId },
    });
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      action: 'onFailed',
      queueJobId: jobId,
      runtimeJobId: data.jobId,
    });
  },
});

export const startCaseResolverOcrQueue = (): void => {
  queue.startWorker();
};

export const enqueueCaseResolverOcrJob = async (
  data: CaseResolverOcrQueueJobData
): Promise<CaseResolverOcrDispatchMode> => {
  if (!isRedisAvailable()) {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Redis unavailable for OCR job ${data.jobId}; processing inline`,
      context: { runtimeJobId: data.jobId },
    });
    await queue.processInline(data);
    return 'inline';
  }

  try {
    await queue.enqueue(data, { jobId: data.jobId });
    return 'queued';
  } catch (enqueueError) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for OCR job ${data.jobId}; falling back to inline processing`,
      context: {
        runtimeJobId: data.jobId,
        error:
          enqueueError instanceof Error
            ? enqueueError.message
            : String(enqueueError),
      },
    });

    try {
      await queue.processInline(data);
      return 'inline';
    } catch (inlineError) {
      await ErrorSystem.captureException(inlineError, {
        service: LOG_SOURCE,
        action: 'inline-fallback-failed',
        runtimeJobId: data.jobId,
      });
      throw inlineError;
    }
  }
};
