import { classifyError } from '@/shared/errors/error-classifier';
import { z } from 'zod';
import type {
  TanstackCriticality,
  TanstackEntityKind,
  TanstackFactoryMeta,
  TanstackFactoryMetaResolved,
  TanstackLifecycleStage,
  TanstackTelemetryBatch,
  TanstackTelemetryEvent,
} from '@/shared/lib/tanstack-factory-v2.types';
import { getTraceId } from '@/shared/utils/observability/trace';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  isSensitiveKey,
  REDACTED_VALUE,
  redactSensitiveText,
  truncateString,
} from '@/shared/utils/observability/client-redaction';

import type { QueryKey } from '@tanstack/react-query';

const TELEMETRY_ENDPOINT = '/api/query-telemetry';
const DEDUPE_WINDOW_MS = 1_000;
const DEDUPE_BUCKET_LIMIT = 500;
const DEFAULT_SAMPLING_RATE = 0.2;
const MAX_CONTEXT_SIZE = 6_000;
const MAX_CONTEXT_VALUE_LENGTH = 2_000;
const MAX_META_SOURCE_LENGTH = 240;
const MAX_META_RESOURCE_LENGTH = 240;
const MAX_META_TAGS = 16;
const MAX_META_TAG_LENGTH = 120;
const MAX_EVENT_QUEUE = 20;
const FLUSH_DELAY_MS = 250;
const META_KEY = 'tanstackFactoryV2Meta';
const ENABLE_QUERY_TELEMETRY_IN_DEV =
  process.env['NEXT_PUBLIC_ENABLE_QUERY_TELEMETRY_IN_DEV'] === 'true';
const ENABLE_QUERY_TELEMETRY =
  process.env['NEXT_PUBLIC_ENABLE_QUERY_TELEMETRY'] === 'true' ||
  (process.env['NEXT_PUBLIC_ENABLE_QUERY_TELEMETRY'] !== 'false' &&
    (process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'test' ||
      ENABLE_QUERY_TELEMETRY_IN_DEV));

type EmitTanstackTelemetryInput = {
  entity: TanstackEntityKind;
  stage: TanstackLifecycleStage;
  meta: TanstackFactoryMeta;
  key?: QueryKey | undefined;
  attempt?: number | undefined;
  durationMs?: number | undefined;
  statusCode?: number | undefined;
  error?: unknown;
  context?: Record<string, unknown> | undefined;
  tags?: string[] | undefined;
};

type ApiErrorLike = {
  status: number;
  errorId?: string | null | undefined;
  payload?: unknown;
};

type SerializableRecord = Record<string, unknown>;

const dedupeBucket = new Map<string, number>();
const queuedEvents: TanstackTelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sanitizedContextCache = new WeakMap<
  Record<string, unknown>,
  Record<string, unknown> | undefined
>();

const isSerializableRecord = (value: unknown): value is SerializableRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toRecord = (value: unknown): SerializableRecord | null =>
  isSerializableRecord(value) ? value : null;

const createEventId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

const hashKey = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const clampSamplingRate = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SAMPLING_RATE;
  return Math.max(0, Math.min(1, value));
};

const clampMetaText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const sanitizeTag = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_META_TAG_LENGTH ? trimmed.slice(0, MAX_META_TAG_LENGTH) : trimmed;
};

const sanitizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  const next: string[] = [];
  for (const tag of tags) {
    const normalized = sanitizeTag(tag);
    if (!normalized) continue;
    next.push(normalized);
    if (next.length >= MAX_META_TAGS) break;
  }
  return next;
};

const toStableKey = (queryKey: QueryKey | undefined): string => {
  if (!queryKey) return '[]';
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
};

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('aborted') || message.includes('abort');
};

const extractStatusCode = (error: unknown): number | undefined => {
  const record = toRecord(error);
  if (!record) return undefined;
  const status = record['status'];
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  const statusCode = record['statusCode'];
  if (typeof statusCode === 'number' && Number.isFinite(statusCode)) return statusCode;
  const response = toRecord(record['response']);
  const responseStatus = response?.['status'];
  if (typeof responseStatus === 'number' && Number.isFinite(responseStatus)) return responseStatus;
  return undefined;
};

const isApiErrorLike = (error: unknown): error is ApiErrorLike =>
  Boolean(error) &&
  typeof error === 'object' &&
  typeof (error as { status?: unknown }).status === 'number';

const sanitizeContext = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!context) return undefined;
  if (sanitizedContextCache.has(context)) {
    return sanitizedContextCache.get(context);
  }

  let sanitized: Record<string, unknown> | undefined;
  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(context, (_key, value: unknown): unknown => {
      if (_key && isSensitiveKey(_key)) return REDACTED_VALUE;
      if (value && typeof value === 'object') {
        const objectValue = value;
        if (seen.has(objectValue)) return '[Circular]';
        seen.add(objectValue);
      }
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'string') {
        return truncateString(redactSensitiveText(value), MAX_CONTEXT_VALUE_LENGTH);
      }
      return value;
    });
    if (!serialized) {
      sanitized = undefined;
    } else if (serialized.length > MAX_CONTEXT_SIZE) {
      sanitized = {
        truncated: true,
        preview: serialized.slice(0, MAX_CONTEXT_SIZE),
      };
    } else {
      const parsed = JSON.parse(serialized) as unknown;
      sanitized = toRecord(parsed) ?? { value: parsed };
    }
  } catch {
    sanitized = { error: 'Failed to serialize telemetry context.' };
  }

  sanitizedContextCache.set(context, sanitized);
  return sanitized;
};

const requiredMetaFields: Array<
  keyof Pick<TanstackFactoryMeta, 'source' | 'operation' | 'resource'>
> = ['source', 'operation', 'resource'];

const toFallbackMeta = (meta: TanstackFactoryMeta | null | undefined): TanstackFactoryMeta => ({
  source:
    typeof meta?.source === 'string' && meta.source.trim().length > 0
      ? meta.source
      : 'tanstack.unknown',
  operation: meta?.operation ?? 'action',
  resource:
    typeof meta?.resource === 'string' && meta.resource.trim().length > 0
      ? meta.resource
      : 'unknown-resource',
  queryKey: meta?.queryKey,
  mutationKey: meta?.mutationKey,
  criticality: meta?.criticality,
  samplingRate: meta?.samplingRate,
  domain: meta?.domain ?? 'global',
  tags: meta?.tags,
});

const assertFactoryMeta = (meta: TanstackFactoryMeta | null | undefined): void => {
  if (process.env['NODE_ENV'] === 'production') return;

  if (!meta || typeof meta !== 'object') {
    throw new Error('[tanstack-factory-v2] Missing meta object.');
  }
  const missing = requiredMetaFields.filter((field) => {
    const value = meta[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`[tanstack-factory-v2] Missing required meta fields: ${missing.join(', ')}`);
  }
};

export const resolveTanstackFactoryMeta = (
  meta: TanstackFactoryMeta | null | undefined,
  options?: { key?: QueryKey | undefined }
): TanstackFactoryMetaResolved => {
  assertFactoryMeta(meta);
  const safeMeta = toFallbackMeta(meta);
  const key = safeMeta.queryKey ?? safeMeta.mutationKey ?? options?.key;
  return {
    source: clampMetaText(safeMeta.source, 'tanstack.unknown', MAX_META_SOURCE_LENGTH),
    operation: safeMeta.operation,
    resource: clampMetaText(safeMeta.resource, 'unknown-resource', MAX_META_RESOURCE_LENGTH),
    key,
    criticality: safeMeta.criticality ?? 'normal',
    samplingRate: clampSamplingRate(safeMeta.samplingRate),
    logError: safeMeta.logError !== false,
    domain: safeMeta.domain ?? 'global',
    tags: sanitizeTags(safeMeta.tags),
  };
};

export const getTanstackFactoryMetaFromBag = (
  metaBag: unknown
): TanstackFactoryMetaResolved | null => {
  const metaRecord = toRecord(metaBag);
  if (!metaRecord) return null;
  const storedMeta = toRecord(metaRecord[META_KEY]);
  if (!storedMeta) return null;
  const source = storedMeta['source'];
  const operation = storedMeta['operation'];
  const resource = storedMeta['resource'];
  if (typeof source !== 'string' || typeof operation !== 'string' || typeof resource !== 'string') {
    return null;
  }
  try {
    return resolveTanstackFactoryMeta({
      source,
      operation: operation as TanstackFactoryMeta['operation'],
      resource,
      queryKey: Array.isArray(storedMeta['key']) ? (storedMeta['key'] as QueryKey) : undefined,
      criticality: (storedMeta['criticality'] as TanstackCriticality | undefined) ?? 'normal',
      samplingRate:
        typeof storedMeta['samplingRate'] === 'number' ? storedMeta['samplingRate'] : undefined,
      logError: typeof storedMeta['logError'] === 'boolean' ? storedMeta['logError'] : undefined,
      domain: (storedMeta['domain'] as TanstackFactoryMeta['domain'] | undefined) ?? 'global',
      tags: Array.isArray(storedMeta['tags'])
        ? storedMeta['tags'].filter((tag): tag is string => typeof tag === 'string')
        : [],
    });
  } catch {
    return null;
  }
};

export const attachTanstackFactoryMeta = (
  meta: TanstackFactoryMetaResolved,
  existingMeta?: unknown
): Record<string, unknown> => {
  const metaRecord = toRecord(existingMeta) ?? {};
  return {
    ...metaRecord,
    [META_KEY]: meta,
  };
};

const shouldSampleEvent = (
  stage: TanstackLifecycleStage,
  criticality: TanstackCriticality,
  samplingRate: number
): boolean => {
  if (stage === 'error' || stage === 'retry') return true;
  if (criticality === 'critical' || criticality === 'high') return true;
  return Math.random() <= samplingRate;
};

const cleanupDedupeBucket = (now: number): void => {
  if (dedupeBucket.size <= DEDUPE_BUCKET_LIMIT) return;
  for (const [key, timestamp] of dedupeBucket.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      dedupeBucket.delete(key);
    }
  }
};

const buildDedupeKey = (event: TanstackTelemetryEvent): string =>
  [
    event.entity,
    event.stage,
    event.source,
    event.operation,
    event.resource,
    event.keyHash,
    event.attempt ?? 0,
    event.errorMessage ?? '',
  ].join('|');

const shouldDropAsDuplicate = (event: TanstackTelemetryEvent): boolean => {
  const now = Date.now();
  cleanupDedupeBucket(now);
  const key = buildDedupeKey(event);
  const previous = dedupeBucket.get(key);
  if (typeof previous === 'number' && now - previous < DEDUPE_WINDOW_MS) {
    return true;
  }
  dedupeBucket.set(key, now);
  return false;
};

const flushQueue = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (queuedEvents.length === 0) return;
  const events = queuedEvents.splice(0, queuedEvents.length);
  const payload: TanstackTelemetryBatch = { events };
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) return;
    }
  } catch {
    // Fallback to fetch.
  }

  if (typeof fetch !== 'function') return;
  await fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Never throw from telemetry transport.
  });
};

const scheduleFlush = (): void => {
  if (typeof window === 'undefined') return;
  if (queuedEvents.length >= MAX_EVENT_QUEUE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushQueue();
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_DELAY_MS);
};

export const emitTanstackTelemetry = (input: EmitTanstackTelemetryInput): boolean => {
  if (typeof window === 'undefined') return false;
  if (!ENABLE_QUERY_TELEMETRY) return false;

  const resolvedMeta = resolveTanstackFactoryMeta(input.meta, { key: input.key });
  const sampled = shouldSampleEvent(
    input.stage,
    resolvedMeta.criticality,
    resolvedMeta.samplingRate
  );
  if (!sampled) return false;

  const stableKey = toStableKey(resolvedMeta.key);
  const errorMessage = input.error instanceof Error ? input.error.message : undefined;
  const statusCode = input.statusCode ?? extractStatusCode(input.error);
  const category = input.error ? classifyError(input.error) : undefined;

  // Extend error context with detailed info if available
  const errorContext: Record<string, unknown> = {};
  if (isApiErrorLike(input.error)) {
    errorContext['apiStatus'] = input.error.status;
    errorContext['apiErrorId'] = input.error.errorId ?? null;
    if (input.error.payload) {
      errorContext['apiPayload'] = input.error.payload;
    }
  } else if (input.error instanceof z.ZodError) {
    errorContext['zodIssues'] = input.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  }

  const context = sanitizeContext({
    ...errorContext,
    ...(input.context ?? {}),
  });
  const tags = sanitizeTags([...resolvedMeta.tags, ...(input.tags ?? [])]);

  const event: TanstackTelemetryEvent = {
    id: createEventId(),
    timestamp: new Date().toISOString(),
    traceId: getTraceId(),
    entity: input.entity,
    stage: input.stage,
    source: resolvedMeta.source,
    operation: resolvedMeta.operation,
    resource: resolvedMeta.resource,
    key: stableKey,
    keyHash: hashKey(stableKey),
    criticality: resolvedMeta.criticality,
    domain: resolvedMeta.domain,
    sampled: true,
    ...(typeof input.attempt === 'number' ? { attempt: input.attempt } : {}),
    ...(typeof input.durationMs === 'number'
      ? { durationMs: Math.max(0, Math.round(input.durationMs)) }
      : {}),
    ...(typeof statusCode === 'number' ? { statusCode } : {}),
    ...(category ? { category } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    ...(context ? { context } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };

  if (shouldDropAsDuplicate(event)) {
    return false;
  }

  // Centrally log error if stage is 'error', logError is enabled and not already logged by API client
  const alreadyLogged = (input.error as any)?.__logged === true;
  if (input.stage === 'error' && resolvedMeta.logError && input.error && !alreadyLogged) {
    logClientError(input.error, {
      context: {
        telemetryId: event.id,
        traceId: event.traceId,
        source: event.source,
        operation: event.operation,
        resource: event.resource,
        category: event.category,
        domain: event.domain,
        key: event.key,
        attempt: event.attempt,
        ...context,
      },
    });
  }

  queuedEvents.push(event);
  scheduleFlush();
  return true;
};

export const telemetryErrorStage = (error: unknown): TanstackLifecycleStage =>
  isAbortError(error) ? 'cancel' : 'error';

export const flushTanstackTelemetry = async (): Promise<void> => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushQueue();
};

export const tanstackTelemetryTestUtils = {
  buildDedupeKey,
  clampSamplingRate,
  hashKey,
  isAbortError,
  shouldSampleEvent,
  toStableKey,
  reset: (): void => {
    dedupeBucket.clear();
    queuedEvents.splice(0, queuedEvents.length);
    sanitizedContextCache = new WeakMap<
      Record<string, unknown>,
      Record<string, unknown> | undefined
    >();
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  },
};
