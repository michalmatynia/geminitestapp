import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logger } from '@/shared/utils/logger';
import {
  isSensitiveKey,
  REDACTED_VALUE,
  redactSensitiveText,
  truncateString,
} from '@/shared/utils/observability/client-redaction';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const MAX_BATCH_SIZE = 100;
const MAX_CONTEXT_BYTES = 12_000;
const MAX_STRING_LENGTH = 2_000;
const MAX_KEY_PREVIEW_LENGTH = 180;
const DEDUPE_WINDOW_MS = 90_000;
const BLOCKING_QUERY_TELEMETRY_INGESTION =
  process.env['QUERY_TELEMETRY_BLOCKING_INGESTION'] === 'true';
const STORE_RAW_TELEMETRY_KEYS = process.env['QUERY_TELEMETRY_STORE_RAW_KEYS'] === 'true';

const eventSchema = z.object({
  id: z.coerce.string().trim().min(1).max(120),
  timestamp: z.coerce.string().trim().min(1).max(120),
  traceId: z.coerce.string().trim().min(1).max(120),
  entity: z.coerce.string().trim().min(1).max(64),
  stage: z.coerce.string().trim().min(1).max(64),
  source: z.coerce.string().trim().min(1).max(240),
  operation: z.coerce.string().trim().min(1).max(64),
  resource: z.coerce.string().trim().min(1).max(240),
  description: z.coerce.string().trim().min(1).max(320).optional(),
  key: z.coerce.string().trim().min(1).max(2_000),
  keyHash: z.coerce.string().trim().min(1).max(120),
  criticality: z.coerce.string().trim().min(1).max(32),
  domain: z.coerce.string().trim().min(1).max(64),
  sampled: z.coerce.boolean(),
  attempt: z.coerce.number().int().positive().optional(),
  durationMs: z.coerce.number().int().nonnegative().optional(),
  statusCode: z.coerce.number().int().nonnegative().optional(),
  category: z.coerce.string().trim().min(1).max(120).optional(),
  errorMessage: z.coerce.string().trim().min(1).max(2_000).optional(),
  context: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  tags: z.array(z.coerce.string().trim().min(1).max(120)).max(16).optional(),
});

export const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(MAX_BATCH_SIZE),
});

type TelemetryEvent = z.infer<typeof eventSchema>;

type IngestionCounters = {
  accepted: number;
  dropped: number;
  deduplicated: number;
  persistErrors: number;
};

type IngestionState = {
  dedupe: Map<string, number>;
  counters: IngestionCounters;
};

const getIngestionState = (): IngestionState => {
  const globalWithState = globalThis as typeof globalThis & {
    __queryTelemetryIngestionState__?: IngestionState;
  };

  if (!globalWithState.__queryTelemetryIngestionState__) {
    globalWithState.__queryTelemetryIngestionState__ = {
      dedupe: new Map<string, number>(),
      counters: {
        accepted: 0,
        dropped: 0,
        deduplicated: 0,
        persistErrors: 0,
      },
    };
  }

  return globalWithState.__queryTelemetryIngestionState__;
};

const pruneDedupeWindow = (state: IngestionState, now: number): void => {
  for (const [key, timestamp] of state.dedupe.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      state.dedupe.delete(key);
    }
  }
};

const buildDedupeSignature = (event: TelemetryEvent): string =>
  [
    event.id,
    event.traceId,
    event.entity,
    event.stage,
    event.source,
    event.operation,
    event.resource,
    event.keyHash,
  ].join('|');

const toLogLevel = (stage: string): 'info' | 'warn' | 'error' => {
  if (stage === 'error') return 'error';
  if (stage === 'retry' || stage === 'cancel') return 'warn';
  return 'info';
};

const sanitizeKeyPreview = (key: string): { keyPreview: string; keyPreviewTruncated: boolean } => {
  const safe = redactSensitiveText(key);
  const truncated = safe.length > MAX_KEY_PREVIEW_LENGTH;
  return {
    keyPreview: truncateString(safe, MAX_KEY_PREVIEW_LENGTH),
    keyPreviewTruncated: truncated,
  };
};

const sanitizeContext = (
  context: Record<string, unknown> | undefined
): { value?: Record<string, unknown>; truncation?: Record<string, unknown> } => {
  if (!context) return {};
  let hadStringTruncation = false;
  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(context, (key, value: unknown): unknown => {
      if (key && isSensitiveKey(key)) return REDACTED_VALUE;
      if (value && typeof value === 'object') {
        const objectValue = value;
        if (seen.has(objectValue)) return '[Circular]';
        seen.add(objectValue);
      }
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'string') {
        const redacted = redactSensitiveText(value);
        if (redacted.length > MAX_STRING_LENGTH) {
          hadStringTruncation = true;
        }
        return truncateString(redacted, MAX_STRING_LENGTH);
      }
      return value;
    });

    if (!serialized) return {};

    if (serialized.length > MAX_CONTEXT_BYTES) {
      return {
        value: {
          truncated: true,
          preview: serialized.slice(0, MAX_CONTEXT_BYTES),
        },
        truncation: {
          reason: 'context_size_limit',
          maxBytes: MAX_CONTEXT_BYTES,
          originalBytes: serialized.length,
        },
      };
    }

    const parsed = JSON.parse(serialized) as unknown;
    const value =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { value: parsed };
    return {
      value,
      ...(hadStringTruncation
        ? {
          truncation: {
            reason: 'string_value_truncation',
            maxLength: MAX_STRING_LENGTH,
          },
        }
        : {}),
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {
      value: { error: 'Failed to sanitize telemetry context.' },
    };
  }
};

type LogSystemEventInput = {
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
  service: string;
  statusCode?: number;
  request?: Request;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  critical?: boolean;
};

const logSystemTelemetryEvent = async (input: LogSystemEventInput): Promise<void> => {
  try {
    const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
    await logSystemEvent(input);
  } catch (error) {
    void ErrorSystem.captureException(error);
    logger.error('query-telemetry failed to persist log event', error, {
      service: 'query.telemetry',
      source: input.source,
      requestId: input.requestId,
      traceId: input.traceId,
      correlationId: input.correlationId,
    });
  }
};

type PersistTelemetryBatchInput = {
  events: TelemetryEvent[];
  request: NextRequest;
  requestId?: string;
};

type PersistTelemetryBatchResult = {
  accepted: number;
  dropped: number;
  droppedByReason: {
    deduplicated: number;
    persistError: number;
  };
  truncated: number;
};

const persistTelemetryBatch = async ({
  events,
  request,
  requestId,
}: PersistTelemetryBatchInput): Promise<PersistTelemetryBatchResult> => {
  const ingestionState = getIngestionState();
  const now = Date.now();
  pruneDedupeWindow(ingestionState, now);

  let accepted = 0;
  let dropped = 0;
  let deduplicated = 0;
  let persistError = 0;
  let truncated = 0;

  for (const event of events) {
    const signature = buildDedupeSignature(event);
    const previous = ingestionState.dedupe.get(signature) ?? 0;
    if (previous && now - previous <= DEDUPE_WINDOW_MS) {
      dropped += 1;
      deduplicated += 1;
      continue;
    }
    ingestionState.dedupe.set(signature, now);

    const { keyPreview, keyPreviewTruncated } = sanitizeKeyPreview(event.key);
    const sanitizedContext = sanitizeContext(event.context);
    if (keyPreviewTruncated || sanitizedContext.truncation) {
      truncated += 1;
    }

    const message = `TanStack ${event.entity} ${event.stage} (${event.resource})`;
    const source = `tanstack.telemetry.${event.entity}.${event.stage}`;
    const context: Record<string, unknown> = {
      eventId: event.id,
      traceId: event.traceId,
      timestamp: event.timestamp,
      operation: event.operation,
      resource: event.resource,
      ...(event.description ? { description: event.description } : {}),
      keyHash: event.keyHash,
      keyPreview,
      keyPreviewTruncated,
      criticality: event.criticality,
      sampled: event.sampled,
      domain: event.domain,
      ...(STORE_RAW_TELEMETRY_KEYS ? { keyRaw: event.key } : {}),
      ...(typeof event.attempt === 'number' ? { attempt: event.attempt } : {}),
      ...(typeof event.durationMs === 'number' ? { durationMs: event.durationMs } : {}),
      ...(event.category ? { category: event.category } : {}),
      ...(event.errorMessage ? { errorMessage: event.errorMessage } : {}),
      ...(Array.isArray(event.tags) && event.tags.length > 0 ? { tags: event.tags } : {}),
      ...(sanitizedContext.value ? { telemetryContext: sanitizedContext.value } : {}),
      ...(sanitizedContext.truncation ? { telemetryTruncation: sanitizedContext.truncation } : {}),
    };

    try {
      await logSystemTelemetryEvent({
        level: toLogLevel(event.stage),
        message,
        source,
        service: 'query.telemetry',
        ...(typeof event.statusCode === 'number' ? { statusCode: event.statusCode } : {}),
        request,
        ...(requestId ? { requestId } : {}),
        traceId: event.traceId,
        correlationId: event.id,
        context,
        critical: event.criticality === 'critical',
      });
      accepted += 1;
    } catch (error) {
      void ErrorSystem.captureException(error);
      dropped += 1;
      persistError += 1;
    }
  }

  ingestionState.counters.accepted += accepted;
  ingestionState.counters.dropped += dropped;
  ingestionState.counters.deduplicated += deduplicated;
  ingestionState.counters.persistErrors += persistError;

  return {
    accepted,
    dropped,
    droppedByReason: {
      deduplicated,
      persistError,
    },
    truncated,
  };
};

const getIngestionCounters = (): IngestionCounters => {
  const state = getIngestionState();
  return { ...state.counters };
};

export const queryTelemetryTestUtils = {
  resetIngestionState: (): void => {
    const state = getIngestionState();
    state.dedupe.clear();
    state.counters = {
      accepted: 0,
      dropped: 0,
      deduplicated: 0,
      persistErrors: 0,
    };
  },
};

export async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(ctx.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        accepted: 0,
        dropped: 0,
        reason: 'invalid_payload',
      },
      { status: 400 }
    );
  }

  if (BLOCKING_QUERY_TELEMETRY_INGESTION) {
    const persisted = await persistTelemetryBatch({
      events: parsed.data.events,
      request: req,
      requestId: ctx.requestId,
    });

    return NextResponse.json({
      ok: true,
      accepted: persisted.accepted,
      dropped: persisted.dropped,
      droppedByReason: persisted.droppedByReason,
      truncated: persisted.truncated,
      queued: false,
    });
  }

  const scheduledCount = parsed.data.events.length;
  void persistTelemetryBatch({
    events: parsed.data.events,
    request: req,
    requestId: ctx.requestId,
  }).catch((error: unknown) => {
    logger.error('query-telemetry background ingestion failed', error, {
      service: 'query.telemetry',
      source: 'query-telemetry.POST',
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
      eventCount: scheduledCount,
    });
  });

  return NextResponse.json(
    {
      ok: true,
      accepted: 0,
      dropped: 0,
      queued: true,
      scheduled: scheduledCount,
      requestId: ctx.requestId,
      ingestionCounters: getIngestionCounters(),
    },
    { status: 202 }
  );
}
