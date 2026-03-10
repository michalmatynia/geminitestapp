import 'server-only';

import { randomUUID } from 'crypto';

import type {
  CaseResolverOcrJobStatus,
  CaseResolverOcrJobDispatchMode,
  CaseResolverOcrErrorCategory,
  CaseResolverOcrJobRecord,
} from '@/shared/contracts/case-resolver';
import { getRedisConnection } from '@/shared/lib/queue';


export type { CaseResolverOcrErrorCategory, CaseResolverOcrJobRecord };

const OCR_RUNTIME_JOB_KEY_PREFIX = 'case-resolver:ocr:job:';
const OCR_RUNTIME_JOB_RECENT_IDS_KEY = 'case-resolver:ocr:job:recent';
const OCR_RUNTIME_JOB_TTL_SECONDS = 60 * 60 * 6;
const OCR_RUNTIME_JOB_TTL_MS = OCR_RUNTIME_JOB_TTL_SECONDS * 1000;
const OCR_RUNTIME_JOB_RECENT_LIMIT = 400;

const inMemoryJobs = new Map<string, { record: CaseResolverOcrJobRecord; expiresAt: number }>();
const inMemoryRecentJobIds: string[] = [];

const nowIso = (): string => new Date().toISOString();

const toRedisKey = (jobId: string): string => `${OCR_RUNTIME_JOB_KEY_PREFIX}${jobId}`;

const isCaseResolverOcrJobStatus = (value: unknown): value is CaseResolverOcrJobStatus => {
  return value === 'queued' || value === 'running' || value === 'completed' || value === 'failed';
};

const isCaseResolverOcrJobDispatchMode = (
  value: unknown
): value is CaseResolverOcrJobDispatchMode => {
  return value === 'queued' || value === 'inline';
};

const isCaseResolverOcrErrorCategory = (value: unknown): value is CaseResolverOcrErrorCategory => {
  return (
    value === 'timeout' ||
    value === 'rate_limit' ||
    value === 'network' ||
    value === 'provider' ||
    value === 'validation' ||
    value === 'unknown'
  );
};

const parseCaseResolverOcrJobRecord = (value: unknown): CaseResolverOcrJobRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  const filepath = typeof record['filepath'] === 'string' ? record['filepath'].trim() : '';
  const status = record['status'];
  if (!id || !filepath || !isCaseResolverOcrJobStatus(status)) return null;
  const model =
    typeof record['model'] === 'string' && record['model'].trim().length > 0
      ? record['model'].trim()
      : null;
  const prompt =
    typeof record['prompt'] === 'string' && record['prompt'].trim().length > 0
      ? record['prompt']
      : null;
  const retryOfJobId =
    typeof record['retryOfJobId'] === 'string' && record['retryOfJobId'].trim().length > 0
      ? record['retryOfJobId'].trim()
      : null;
  const correlationId =
    typeof record['correlationId'] === 'string' && record['correlationId'].trim().length > 0
      ? record['correlationId'].trim()
      : null;
  const attemptsMade =
    typeof record['attemptsMade'] === 'number' && Number.isFinite(record['attemptsMade'])
      ? Math.max(0, Math.floor(record['attemptsMade']))
      : 0;
  const maxAttemptsRaw =
    typeof record['maxAttempts'] === 'number' && Number.isFinite(record['maxAttempts'])
      ? Math.floor(record['maxAttempts'])
      : 1;
  const maxAttempts = Math.max(1, maxAttemptsRaw);

  const dispatchModeRaw = record['dispatchMode'];
  const dispatchMode = isCaseResolverOcrJobDispatchMode(dispatchModeRaw) ? dispatchModeRaw : null;
  const errorCategoryRaw = record['errorCategory'];
  const errorCategory = isCaseResolverOcrErrorCategory(errorCategoryRaw) ? errorCategoryRaw : null;
  const retryableErrorRaw = record['retryableError'];
  const retryableError = typeof retryableErrorRaw === 'boolean' ? retryableErrorRaw : null;
  const createdAt =
    typeof record['createdAt'] === 'string' && record['createdAt'].trim().length > 0
      ? record['createdAt']
      : nowIso();
  const updatedAt =
    typeof record['updatedAt'] === 'string' && record['updatedAt'].trim().length > 0
      ? record['updatedAt']
      : createdAt;

  return {
    id,
    status,
    filepath,
    model,
    prompt,
    retryOfJobId,
    correlationId,
    dispatchMode,
    attemptsMade,
    maxAttempts,
    createdAt,
    updatedAt,
    startedAt:
      typeof record['startedAt'] === 'string' && record['startedAt'].trim().length > 0
        ? record['startedAt']
        : null,
    finishedAt:
      typeof record['finishedAt'] === 'string' && record['finishedAt'].trim().length > 0
        ? record['finishedAt']
        : null,
    resultText: typeof record['resultText'] === 'string' ? record['resultText'] : null,
    errorMessage:
      typeof record['errorMessage'] === 'string' && record['errorMessage'].trim().length > 0
        ? record['errorMessage']
        : null,
    errorCategory,
    retryableError,
  };
};

const cleanupInMemoryJobs = (): void => {
  const now = Date.now();
  for (const [jobId, value] of inMemoryJobs.entries()) {
    if (value.expiresAt > now) continue;
    inMemoryJobs.delete(jobId);
  }
};

const writeInMemoryJob = (record: CaseResolverOcrJobRecord): void => {
  cleanupInMemoryJobs();
  inMemoryJobs.set(record.id, {
    record,
    expiresAt: Date.now() + OCR_RUNTIME_JOB_TTL_MS,
  });
};

const touchInMemoryRecentJobId = (jobId: string): void => {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) return;
  const existingIndex = inMemoryRecentJobIds.indexOf(normalizedJobId);
  if (existingIndex >= 0) {
    inMemoryRecentJobIds.splice(existingIndex, 1);
  }
  inMemoryRecentJobIds.unshift(normalizedJobId);
  if (inMemoryRecentJobIds.length > OCR_RUNTIME_JOB_RECENT_LIMIT) {
    inMemoryRecentJobIds.splice(OCR_RUNTIME_JOB_RECENT_LIMIT);
  }
};

const readInMemoryJob = (jobId: string): CaseResolverOcrJobRecord | null => {
  cleanupInMemoryJobs();
  return inMemoryJobs.get(jobId)?.record ?? null;
};

const readInMemoryRecentJobIds = (limit: number): string[] => {
  cleanupInMemoryJobs();
  return inMemoryRecentJobIds.slice(0, limit);
};

const writeRedisJob = async (record: CaseResolverOcrJobRecord): Promise<boolean> => {
  const redis = getRedisConnection();
  if (!redis) return false;
  try {
    await redis.set(
      toRedisKey(record.id),
      JSON.stringify(record),
      'EX',
      OCR_RUNTIME_JOB_TTL_SECONDS
    );
    return true;
  } catch {
    return false;
  }
};

const readRedisJob = async (jobId: string): Promise<CaseResolverOcrJobRecord | null> => {
  const redis = getRedisConnection();
  if (!redis) return null;
  try {
    const raw = await redis.get(toRedisKey(jobId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parseCaseResolverOcrJobRecord(parsed);
  } catch {
    return null;
  }
};

const persistRecentJobIdInRedis = async (jobId: string): Promise<boolean> => {
  const redis = getRedisConnection();
  if (!redis) return false;
  try {
    await redis
      .multi()
      .lrem(OCR_RUNTIME_JOB_RECENT_IDS_KEY, 0, jobId)
      .lpush(OCR_RUNTIME_JOB_RECENT_IDS_KEY, jobId)
      .ltrim(OCR_RUNTIME_JOB_RECENT_IDS_KEY, 0, OCR_RUNTIME_JOB_RECENT_LIMIT - 1)
      .expire(OCR_RUNTIME_JOB_RECENT_IDS_KEY, OCR_RUNTIME_JOB_TTL_SECONDS)
      .exec();
    return true;
  } catch {
    return false;
  }
};

const readRecentJobIdsFromRedis = async (limit: number): Promise<string[] | null> => {
  const redis = getRedisConnection();
  if (!redis) return null;
  try {
    const ids = await redis.lrange(OCR_RUNTIME_JOB_RECENT_IDS_KEY, 0, Math.max(0, limit - 1));
    const normalized = ids
      .map((entry): string => entry.trim())
      .filter((entry): entry is string => entry.length > 0);
    return normalized;
  } catch {
    return null;
  }
};

const persistCaseResolverOcrJob = async (
  record: CaseResolverOcrJobRecord
): Promise<CaseResolverOcrJobRecord> => {
  const wroteRedis = await writeRedisJob(record);
  if (!wroteRedis) {
    writeInMemoryJob(record);
  } else {
    inMemoryJobs.delete(record.id);
  }
  touchInMemoryRecentJobId(record.id);
  await persistRecentJobIdInRedis(record.id);
  return record;
};

const updateCaseResolverOcrJob = async (
  jobId: string,
  patch: Partial<Omit<CaseResolverOcrJobRecord, 'id' | 'createdAt'>>,
  options?: { filepath?: string; createIfMissing?: boolean }
): Promise<CaseResolverOcrJobRecord | null> => {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) return null;

  let current = await getCaseResolverOcrJobById(normalizedJobId);
  if (!current && options?.createIfMissing) {
    const createdAt = nowIso();
    current = {
      id: normalizedJobId,
      status: 'queued',
      filepath: options.filepath?.trim() || '',
      model: null,
      prompt: null,
      retryOfJobId: null,
      correlationId: null,
      dispatchMode: null,
      attemptsMade: 0,
      maxAttempts: 1,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      finishedAt: null,
      resultText: null,
      errorMessage: null,
      errorCategory: null,
      retryableError: null,
    };
  }
  if (!current) return null;

  const updatedAt = nowIso();
  const next: CaseResolverOcrJobRecord = {
    ...current,
    ...patch,
    updatedAt,
  };

  if (next.status === 'running' && !next.startedAt) {
    next.startedAt = updatedAt;
    next.finishedAt = null;
    next.errorMessage = null;
  }

  if (next.status === 'completed') {
    next.finishedAt = next.finishedAt ?? updatedAt;
    next.errorMessage = null;
  }

  if (next.status === 'failed') {
    next.finishedAt = next.finishedAt ?? updatedAt;
  }

  return persistCaseResolverOcrJob(next);
};

export const createCaseResolverOcrJob = async (input: {
  filepath: string;
  model?: string | null;
  prompt?: string | null;
  retryOfJobId?: string | null;
  correlationId?: string | null;
  maxAttempts?: number | null;
}): Promise<CaseResolverOcrJobRecord> => {
  const createdAt = nowIso();
  const normalizedModel = input.model?.trim() ?? null;
  const normalizedPrompt = input.prompt?.trim() || null;
  const normalizedRetryOfJobId = input.retryOfJobId?.trim() || null;
  const normalizedCorrelationId = input.correlationId?.trim() || null;
  const maxAttempts =
    typeof input.maxAttempts === 'number' && Number.isFinite(input.maxAttempts)
      ? Math.max(1, Math.floor(input.maxAttempts))
      : 1;
  const record: CaseResolverOcrJobRecord = {
    id: randomUUID(),
    status: 'queued',
    filepath: input.filepath.trim(),
    model: normalizedModel,
    prompt: normalizedPrompt,
    retryOfJobId: normalizedRetryOfJobId,
    correlationId: normalizedCorrelationId,
    dispatchMode: null,
    attemptsMade: 0,
    maxAttempts,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    resultText: null,
    errorMessage: null,
    errorCategory: null,
    retryableError: null,
  };
  return persistCaseResolverOcrJob(record);
};

export const getCaseResolverOcrJobById = async (
  jobId: string
): Promise<CaseResolverOcrJobRecord | null> => {
  const normalized = jobId.trim();
  if (!normalized) return null;
  const fromRedis = await readRedisJob(normalized);
  if (fromRedis) return fromRedis;
  return readInMemoryJob(normalized);
};

export const setCaseResolverOcrJobDispatchMode = async (
  jobId: string,
  dispatchMode: CaseResolverOcrJobDispatchMode
): Promise<CaseResolverOcrJobRecord | null> => {
  return updateCaseResolverOcrJob(jobId, { dispatchMode });
};

export const markCaseResolverOcrJobRunning = async (
  jobId: string,
  filepath: string,
  options?: { correlationId?: string | null }
): Promise<CaseResolverOcrJobRecord | null> => {
  const normalizedCorrelationId = options?.correlationId?.trim() || null;
  return updateCaseResolverOcrJob(
    jobId,
    {
      status: 'running',
      startedAt: nowIso(),
      finishedAt: null,
      errorMessage: null,
      errorCategory: null,
      retryableError: null,
      ...(normalizedCorrelationId ? { correlationId: normalizedCorrelationId } : {}),
    },
    { createIfMissing: true, filepath }
  );
};

export const markCaseResolverOcrJobCompleted = async (
  jobId: string,
  resultText: string
): Promise<CaseResolverOcrJobRecord | null> => {
  return updateCaseResolverOcrJob(jobId, {
    status: 'completed',
    resultText,
    errorMessage: null,
    errorCategory: null,
    retryableError: null,
    finishedAt: nowIso(),
  });
};

export const markCaseResolverOcrJobFailed = async (
  jobId: string,
  errorMessage: string,
  options?: {
    attemptsMade?: number;
    maxAttempts?: number;
    errorCategory?: CaseResolverOcrErrorCategory;
    retryableError?: boolean;
  }
): Promise<CaseResolverOcrJobRecord | null> => {
  const attemptsMade =
    typeof options?.attemptsMade === 'number' && Number.isFinite(options.attemptsMade)
      ? Math.max(0, Math.floor(options.attemptsMade))
      : undefined;
  const maxAttempts =
    typeof options?.maxAttempts === 'number' && Number.isFinite(options.maxAttempts)
      ? Math.max(1, Math.floor(options.maxAttempts))
      : undefined;
  const errorCategory = options?.errorCategory;
  const retryableError =
    typeof options?.retryableError === 'boolean' ? options.retryableError : undefined;
  return updateCaseResolverOcrJob(jobId, {
    status: 'failed',
    errorMessage: errorMessage.trim() || 'OCR runtime job failed.',
    ...(typeof attemptsMade === 'number' ? { attemptsMade } : {}),
    ...(typeof maxAttempts === 'number' ? { maxAttempts } : {}),
    ...(errorCategory ? { errorCategory } : {}),
    ...(typeof retryableError === 'boolean' ? { retryableError } : {}),
    finishedAt: nowIso(),
  });
};

export const markCaseResolverOcrJobQueuedForRetry = async (
  jobId: string,
  options?: {
    attemptsMade?: number;
    maxAttempts?: number;
    errorCategory?: CaseResolverOcrErrorCategory;
    retryableError?: boolean;
  }
): Promise<CaseResolverOcrJobRecord | null> => {
  const attemptsMade =
    typeof options?.attemptsMade === 'number' && Number.isFinite(options.attemptsMade)
      ? Math.max(0, Math.floor(options.attemptsMade))
      : undefined;
  const maxAttempts =
    typeof options?.maxAttempts === 'number' && Number.isFinite(options.maxAttempts)
      ? Math.max(1, Math.floor(options.maxAttempts))
      : undefined;
  const errorCategory = options?.errorCategory;
  const retryableError =
    typeof options?.retryableError === 'boolean' ? options.retryableError : undefined;
  return updateCaseResolverOcrJob(jobId, {
    status: 'queued',
    ...(typeof attemptsMade === 'number' ? { attemptsMade } : {}),
    ...(typeof maxAttempts === 'number' ? { maxAttempts } : {}),
    ...(errorCategory ? { errorCategory } : {}),
    ...(typeof retryableError === 'boolean' ? { retryableError } : {}),
    finishedAt: null,
  });
};

export const listCaseResolverRecentOcrJobs = async (
  limit = 120
): Promise<CaseResolverOcrJobRecord[]> => {
  const normalizedLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(400, Math.max(1, Math.floor(limit))) : 120;
  const redisIds = await readRecentJobIdsFromRedis(normalizedLimit);
  const fallbackIds = readInMemoryRecentJobIds(normalizedLimit);
  const candidateIds = (redisIds && redisIds.length > 0 ? redisIds : fallbackIds).slice(
    0,
    normalizedLimit
  );
  const uniqueIds = new Set<string>();
  const records: CaseResolverOcrJobRecord[] = [];
  for (const id of candidateIds) {
    if (uniqueIds.has(id)) continue;
    uniqueIds.add(id);
    const record = await getCaseResolverOcrJobById(id);
    if (!record) continue;
    records.push(record);
  }
  return records;
};
