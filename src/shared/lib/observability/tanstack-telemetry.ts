import { classifyError } from '@/shared/errors/error-classifier';
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

import type { QueryKey } from '@tanstack/react-query';

const TELEMETRY_ENDPOINT = '/api/query-telemetry';
const DEDUPE_WINDOW_MS = 1_000;
const DEDUPE_BUCKET_LIMIT = 500;
const DEFAULT_SAMPLING_RATE = 0.2;
const MAX_CONTEXT_SIZE = 6_000;
const MAX_EVENT_QUEUE = 20;
const FLUSH_DELAY_MS = 250;
const META_KEY = 'tanstackFactoryV2Meta';

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

type SerializableRecord = Record<string, unknown>;

const dedupeBucket = new Map<string, number>();
const queuedEvents: TanstackTelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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

const sanitizeContext = (context: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!context) return undefined;
  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(context, (_key, value: unknown): unknown => {
      if (value && typeof value === 'object') {
        const objectValue = value;
        if (seen.has(objectValue)) return '[Circular]';
        seen.add(objectValue);
      }
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'function') return '[Function]';
      return value;
    });
    if (!serialized) return undefined;
    if (serialized.length > MAX_CONTEXT_SIZE) {
      return {
        truncated: true,
        preview: serialized.slice(0, MAX_CONTEXT_SIZE),
      };
    }
    const parsed = JSON.parse(serialized) as unknown;
    return toRecord(parsed) ?? { value: parsed };
  } catch {
    return { error: 'Failed to serialize telemetry context.' };
  }
};

const requiredMetaFields: Array<keyof Pick<TanstackFactoryMeta, 'source' | 'operation' | 'resource'>> = [
  'source',
  'operation',
  'resource',
];

const assertFactoryMeta = (meta: TanstackFactoryMeta): void => {
  if (process.env['NODE_ENV'] === 'production') return;
  const missing = requiredMetaFields.filter((field) => {
    const value = meta[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(
      `[tanstack-factory-v2] Missing required meta fields: ${missing.join(', ')}`
    );
  }
};

export const resolveTanstackFactoryMeta = (
  meta: TanstackFactoryMeta,
  options?: { key?: QueryKey | undefined }
): TanstackFactoryMetaResolved => {
  assertFactoryMeta(meta);
  const key = meta.queryKey ?? meta.mutationKey ?? options?.key;
  return {
    source: meta.source?.trim() || 'tanstack.unknown',
    operation: meta.operation,
    resource: meta.resource?.trim() || 'unknown-resource',
    key,
    criticality: meta.criticality ?? 'normal',
    samplingRate: clampSamplingRate(meta.samplingRate),
    domain: meta.domain ?? 'global',
    tags: Array.isArray(meta.tags) ? meta.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0) : [],
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
        typeof storedMeta['samplingRate'] === 'number'
          ? storedMeta['samplingRate']
          : undefined,
      domain: (storedMeta['domain'] as TanstackFactoryMeta['domain'] | undefined) ?? 'global',
      tags: Array.isArray(storedMeta['tags'])
        ? (storedMeta['tags'].filter((tag): tag is string => typeof tag === 'string'))
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
  const context = sanitizeContext(input.context);
  const tags = [...resolvedMeta.tags, ...(input.tags ?? [])].filter((tag) => tag.trim().length > 0);

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
    ...(typeof input.durationMs === 'number' ? { durationMs: Math.max(0, Math.round(input.durationMs)) } : {}),
    ...(typeof statusCode === 'number' ? { statusCode } : {}),
    ...(category ? { category } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    ...(context ? { context } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };

  if (shouldDropAsDuplicate(event)) {
    return false;
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
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  },
};
