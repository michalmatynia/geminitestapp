import 'server-only';

import { randomUUID } from 'crypto';

import { getRedisConnection } from '@/shared/lib/queue';

export type CaseResolverOcrJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type CaseResolverOcrJobDispatchMode = 'queued' | 'inline';

export type CaseResolverOcrJobRecord = {
  id: string;
  status: CaseResolverOcrJobStatus;
  filepath: string;
  dispatchMode: CaseResolverOcrJobDispatchMode | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultText: string | null;
  errorMessage: string | null;
};

const OCR_RUNTIME_JOB_KEY_PREFIX = 'case-resolver:ocr:job:';
const OCR_RUNTIME_JOB_TTL_SECONDS = 60 * 60 * 6;
const OCR_RUNTIME_JOB_TTL_MS = OCR_RUNTIME_JOB_TTL_SECONDS * 1000;

const inMemoryJobs = new Map<string, { record: CaseResolverOcrJobRecord; expiresAt: number }>();

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

const parseCaseResolverOcrJobRecord = (value: unknown): CaseResolverOcrJobRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  const filepath = typeof record['filepath'] === 'string' ? record['filepath'].trim() : '';
  const status = record['status'];
  if (!id || !filepath || !isCaseResolverOcrJobStatus(status)) return null;

  const dispatchModeRaw = record['dispatchMode'];
  const dispatchMode = isCaseResolverOcrJobDispatchMode(dispatchModeRaw)
    ? dispatchModeRaw
    : null;
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
    dispatchMode,
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
    resultText:
      typeof record['resultText'] === 'string'
        ? record['resultText']
        : null,
    errorMessage:
      typeof record['errorMessage'] === 'string' && record['errorMessage'].trim().length > 0
        ? record['errorMessage']
        : null,
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

const readInMemoryJob = (jobId: string): CaseResolverOcrJobRecord | null => {
  cleanupInMemoryJobs();
  return inMemoryJobs.get(jobId)?.record ?? null;
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

const persistCaseResolverOcrJob = async (
  record: CaseResolverOcrJobRecord
): Promise<CaseResolverOcrJobRecord> => {
  const wroteRedis = await writeRedisJob(record);
  if (!wroteRedis) {
    writeInMemoryJob(record);
    return record;
  }
  inMemoryJobs.delete(record.id);
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
      dispatchMode: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      finishedAt: null,
      resultText: null,
      errorMessage: null,
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
}): Promise<CaseResolverOcrJobRecord> => {
  const createdAt = nowIso();
  const record: CaseResolverOcrJobRecord = {
    id: randomUUID(),
    status: 'queued',
    filepath: input.filepath.trim(),
    dispatchMode: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    resultText: null,
    errorMessage: null,
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
  filepath: string
): Promise<CaseResolverOcrJobRecord | null> => {
  return updateCaseResolverOcrJob(
    jobId,
    {
      status: 'running',
      startedAt: nowIso(),
      finishedAt: null,
      errorMessage: null,
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
    finishedAt: nowIso(),
  });
};

export const markCaseResolverOcrJobFailed = async (
  jobId: string,
  errorMessage: string
): Promise<CaseResolverOcrJobRecord | null> => {
  return updateCaseResolverOcrJob(jobId, {
    status: 'failed',
    errorMessage: errorMessage.trim() || 'OCR runtime job failed.',
    finishedAt: nowIso(),
  });
};

