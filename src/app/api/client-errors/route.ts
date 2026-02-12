import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isSensitiveKey, REDACTED_VALUE, truncateString } from '@/features/observability/lib/log-redaction';
import { ErrorSystem } from '@/features/observability/server';
import type { ErrorContext } from '@/features/observability/services/error-system';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

const MAX_CLIENT_ERROR_BODY_BYTES = 64_000;
const MAX_CLIENT_CONTEXT_BYTES = 16_000;
const MAX_CLIENT_VALUE_LENGTH = 2_000;

const clientErrorPayloadSchema = z.object({
  message: z.string().trim().min(1).max(2_000).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  stack: z.string().trim().max(20_000).nullable().optional(),
  url: z.string().trim().url().max(2_000).optional(),
  timestamp: z.string().datetime().optional(),
  digest: z.string().trim().max(256).optional(),
  userAgent: z.string().trim().max(1_000).optional(),
  componentStack: z.string().trim().max(8_000).nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
});

const sanitizeClientContext = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const seen = new WeakSet();
    const serialized = JSON.stringify(
      value,
      (key: string, current: unknown): unknown => {
        if (key && isSensitiveKey(key)) return REDACTED_VALUE;
        if (typeof current === 'object' && current !== null) {
          if (seen.has(current)) return '[Circular]';
          seen.add(current);
        }
        if (typeof current === 'function') return '[Function]';
        if (typeof current === 'bigint') return current.toString();
        if (typeof current === 'string') return truncateString(current, MAX_CLIENT_VALUE_LENGTH);
        return current;
      }
    );
    if (!serialized) return null;
    if (serialized.length > MAX_CLIENT_CONTEXT_BYTES) {
      return {
        truncated: true,
        preview: serialized.slice(0, MAX_CLIENT_CONTEXT_BYTES),
      };
    }
    const parsed = JSON.parse(serialized) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { error: 'Failed to sanitize context.' };
  }
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<NextResponse> {
  const contentLength = Number.parseInt(req.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_CLIENT_ERROR_BODY_BYTES) {
    return NextResponse.json({ ok: true, success: true, dropped: true, reason: 'payload_too_large' }, { status: 200 });
  }

  const rawBody = (await req.json().catch(() => null)) as unknown;
  const parsed = clientErrorPayloadSchema.safeParse(rawBody);
  const payload = parsed.success ? parsed.data : {};
  const sanitizedContext = sanitizeClientContext(payload.context ?? null);

  const message =
    typeof payload.message === 'string' && payload.message.trim().length > 0
      ? payload.message
      : 'Unknown client error';
  const normalizedError = new Error(message);
  normalizedError.name =
    typeof payload.name === 'string' && payload.name.trim().length > 0
      ? payload.name
      : 'ClientError';
  if (typeof payload.stack === 'string' && payload.stack.trim().length > 0) {
    normalizedError.stack = payload.stack;
  }

  const context: ErrorContext = {
    source: 'client.error.reporter',
    service: 'client-error-reporter',
    ...(typeof payload.url === 'string' ? { url: payload.url } : {}),
    ...(typeof payload.digest === 'string' ? { digest: payload.digest } : {}),
    ...(typeof payload.timestamp === 'string' ? { clientTimestamp: payload.timestamp } : {}),
    ...(typeof payload.userAgent === 'string' ? { clientUserAgent: payload.userAgent } : {}),
    ...(typeof payload.componentStack === 'string' ? { componentStack: payload.componentStack } : {}),
    ...(sanitizedContext ?? {}),
    ...(!parsed.success ? { payloadInvalid: true } : {}),
    extra: sanitizedContext ?? {},
  };

  await ErrorSystem.captureException(normalizedError, {
    ...context,
  });

  return NextResponse.json({ ok: true, success: true }, { status: 200 });
}

export const POST = apiHandler(POST_handler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  // Browser-side error reporter can fire before CSRF cookie/header bootstrap.
  requireCsrf: false,
});
