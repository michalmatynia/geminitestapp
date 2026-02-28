import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logger } from '@/shared/utils/logger';
import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from '@/shared/utils/observability/client-redaction';

const MAX_BATCH_SIZE = 100;
const MAX_CONTEXT_BYTES = 12_000;
const MAX_STRING_LENGTH = 2_000;
const BLOCKING_QUERY_TELEMETRY_INGESTION =
  process.env['QUERY_TELEMETRY_BLOCKING_INGESTION'] === 'true';

const eventSchema = z.object({
  id: z.coerce.string().trim().min(1).max(120),
  timestamp: z.coerce.string().trim().min(1).max(120),
  traceId: z.coerce.string().trim().min(1).max(120),
  entity: z.coerce.string().trim().min(1).max(64),
  stage: z.coerce.string().trim().min(1).max(64),
  source: z.coerce.string().trim().min(1).max(240),
  operation: z.coerce.string().trim().min(1).max(64),
  resource: z.coerce.string().trim().min(1).max(240),
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

const toLogLevel = (stage: string): 'info' | 'warn' | 'error' => {
  if (stage === 'error') return 'error';
  if (stage === 'retry' || stage === 'cancel') return 'warn';
  return 'info';
};

const sanitizeContext = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  if (!context) return undefined;
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
      if (typeof value === 'string') return truncateString(value, MAX_STRING_LENGTH);
      return value;
    });
    if (!serialized) return undefined;
    if (serialized.length > MAX_CONTEXT_BYTES) {
      return {
        truncated: true,
        preview: serialized.slice(0, MAX_CONTEXT_BYTES),
      };
    }
    const parsed = JSON.parse(serialized) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { error: 'Failed to sanitize telemetry context.' };
  }
};

type LogSystemEventInput = {
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
  statusCode?: number;
  request?: Request;
  requestId?: string;
  context?: Record<string, unknown>;
  critical?: boolean;
};

const logSystemTelemetryEvent = async (input: LogSystemEventInput): Promise<void> => {
  try {
    const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
    await logSystemEvent(input);
  } catch (error) {
    logger.error('query-telemetry failed to persist log event', error, {
      source: input.source,
      requestId: input.requestId,
    });
  }
};

type PersistTelemetryBatchInput = {
  events: Array<z.infer<typeof eventSchema>>;
  request: NextRequest;
  requestId?: string | undefined;
};

const persistTelemetryBatch = async ({
  events,
  request,
  requestId,
}: PersistTelemetryBatchInput): Promise<{ accepted: number; dropped: number }> => {
  let accepted = 0;
  let dropped = 0;

  const tasks = events.map(async (event) => {
    const sanitizedContext = sanitizeContext(event.context);
    const message = `TanStack ${event.entity} ${event.stage} (${event.resource})`;
    const source = `tanstack.telemetry.${event.entity}.${event.stage}`;
    const context: Record<string, unknown> = {
      eventId: event.id,
      traceId: event.traceId,
      timestamp: event.timestamp,
      operation: event.operation,
      resource: event.resource,
      keyHash: event.keyHash,
      key: event.key,
      criticality: event.criticality,
      sampled: event.sampled,
      domain: event.domain,
      ...(typeof event.attempt === 'number' ? { attempt: event.attempt } : {}),
      ...(typeof event.durationMs === 'number' ? { durationMs: event.durationMs } : {}),
      ...(event.category ? { category: event.category } : {}),
      ...(event.errorMessage ? { errorMessage: event.errorMessage } : {}),
      ...(Array.isArray(event.tags) && event.tags.length > 0 ? { tags: event.tags } : {}),
      ...(sanitizedContext ? { telemetryContext: sanitizedContext } : {}),
    };

    try {
      await logSystemTelemetryEvent({
        level: toLogLevel(event.stage),
        message,
        source,
        ...(typeof event.statusCode === 'number' ? { statusCode: event.statusCode } : {}),
        request,
        ...(requestId ? { requestId } : {}),
        context,
        critical: event.criticality === 'critical',
      });
      accepted += 1;
    } catch {
      dropped += 1;
    }
  });

  await Promise.all(tasks);
  return { accepted, dropped };
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
      queued: false,
    });
  }

  void persistTelemetryBatch({
    events: parsed.data.events,
    request: req,
    requestId: ctx.requestId,
  }).catch((error: unknown) => {
    logger.error('query-telemetry background ingestion failed', error, {
      source: 'query-telemetry.POST',
      requestId: ctx.requestId,
      eventCount: parsed.data.events.length,
    });
  });

  return NextResponse.json(
    {
      ok: true,
      accepted: parsed.data.events.length,
      dropped: 0,
      queued: true,
      requestId: ctx.requestId,
    },
    { status: 202 }
  );
}
