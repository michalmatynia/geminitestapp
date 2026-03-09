import { NextRequest, NextResponse } from 'next/server';

import { clientErrorPayloadSchema, type ErrorContext } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from '@/shared/lib/observability/log-redaction';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';

const MAX_CLIENT_ERROR_BODY_BYTES = 64_000;
const MAX_CLIENT_CONTEXT_BYTES = 16_000;
const MAX_CLIENT_VALUE_LENGTH = 2_000;
const NETWORK_FETCH_FAILURE_MESSAGES = new Set([
  'failed to fetch',
  'networkerror when attempting to fetch resource.',
]);

const normalizeClientErrorPayload = (rawBody: unknown): Record<string, unknown> => {
  if (!isObjectRecord(rawBody)) return {};

  const normalized: Record<string, unknown> = {};

  const pull = (key: string): void => {
    if (rawBody[key] !== undefined) {
      normalized[key] = rawBody[key];
    }
  };

  pull('message');
  pull('name');
  pull('stack');
  pull('url');
  pull('timestamp');
  pull('digest');
  pull('userAgent');
  pull('componentStack');
  pull('context');

  return normalized;
};

const sanitizeClientContext = (value: unknown): Record<string, unknown> | null => {
  if (!isObjectRecord(value)) return null;
  try {
    const seen = new WeakSet();
    const serialized = JSON.stringify(value, (key: string, current: unknown): unknown => {
      if (key && isSensitiveKey(key)) return REDACTED_VALUE;
      if (typeof current === 'object' && current !== null) {
        if (seen.has(current)) return '[Circular]';
        seen.add(current);
      }
      if (typeof current === 'function') return '[Function]';
      if (typeof current === 'bigint') return current.toString();
      if (typeof current === 'string') return truncateString(current, MAX_CLIENT_VALUE_LENGTH);
      return current;
    });
    if (!serialized) return null;
    if (serialized.length > MAX_CLIENT_CONTEXT_BYTES) {
      return {
        truncated: true,
        preview: serialized.slice(0, MAX_CLIENT_CONTEXT_BYTES),
      };
    }
    const parsed = JSON.parse(serialized) as unknown;
    if (isObjectRecord(parsed)) {
      return parsed;
    }
    return { value: parsed };
  } catch {
    return { error: 'Failed to sanitize context.' };
  }
};

const isNoisyDevNetworkFetchFailure = (
  error: Error,
  context: Record<string, unknown> | null
): boolean => {
  if (process.env['NODE_ENV'] === 'production') return false;
  const normalizedMessage = error.message.trim().toLowerCase();
  if (!NETWORK_FETCH_FAILURE_MESSAGES.has(normalizedMessage)) return false;
  const endpoint = typeof context?.['endpoint'] === 'string' ? context['endpoint'].trim() : '';
  const method =
    typeof context?.['method'] === 'string' ? context['method'].trim().toUpperCase() : '';
  if (!endpoint.startsWith('/api/')) return false;
  if (method && method !== 'GET' && method !== 'HEAD') return false;
  return true;
};

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<NextResponse> {
  const contentLength = Number.parseInt(req.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_CLIENT_ERROR_BODY_BYTES) {
    return NextResponse.json(
      { ok: true, success: true, dropped: true, reason: 'payload_too_large' },
      { status: 200 }
    );
  }

  const rawBody = (await req.json().catch(() => null)) as unknown;
  const normalizedBody = normalizeClientErrorPayload(rawBody);
  const parsed = clientErrorPayloadSchema.safeParse(normalizedBody);
  const payload = parsed.success ? parsed.data : {};
  const sanitizedContext = sanitizeClientContext(payload.context ?? null);

  const fallbackMessage =
    typeof normalizedBody['message'] === 'string' ? normalizedBody['message'] : null;
  const fallbackName = typeof normalizedBody['name'] === 'string' ? normalizedBody['name'] : null;
  const fallbackStack =
    typeof normalizedBody['stack'] === 'string' ? normalizedBody['stack'] : null;
  const resolveStringField = (
    primary: unknown,
    fallback: unknown,
    maxLength: number,
    defaultValue: string
  ): string => {
    if (typeof primary === 'string' && primary.trim().length > 0) return primary;
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return truncateString(fallback, maxLength);
    }
    return defaultValue;
  };

  const message = resolveStringField(
    payload.message,
    fallbackMessage,
    2_000,
    'Unknown client error'
  );
  const normalizedName = resolveStringField(payload.name, fallbackName, 120, 'ClientError');
  if (isAbortLikeError({ name: normalizedName, message })) {
    return NextResponse.json(
      { ok: true, success: true, dropped: true, reason: 'aborted_request' },
      { status: 200 }
    );
  }

  const normalizedError = new Error(message);
  normalizedError.name = normalizedName;
  if (typeof payload.stack === 'string' && payload.stack.trim().length > 0) {
    normalizedError.stack = payload.stack;
  } else if (typeof fallbackStack === 'string' && fallbackStack.trim().length > 0) {
    normalizedError.stack = truncateString(fallbackStack, 20_000);
  }

  if (isNoisyDevNetworkFetchFailure(normalizedError, sanitizedContext)) {
    return NextResponse.json(
      { ok: true, success: true, dropped: true, reason: 'network_fetch_failed' },
      { status: 200 }
    );
  }

  const context: ErrorContext = {
    ...(sanitizedContext ?? {}),
    ...(typeof payload.url === 'string' ? { url: payload.url } : {}),
    ...(typeof payload.digest === 'string' ? { digest: payload.digest } : {}),
    ...(typeof payload.timestamp === 'string' ? { clientTimestamp: payload.timestamp } : {}),
    ...(typeof payload.userAgent === 'string' ? { clientUserAgent: payload.userAgent } : {}),
    ...(typeof payload.componentStack === 'string'
      ? { componentStack: payload.componentStack }
      : {}),
    ...(!parsed.success ? { payloadInvalid: true } : {}),
    source: 'client.error.reporter',
    service: 'client-error-reporter',
  };

  await ErrorSystem.captureException(normalizedError, {
    ...context,
  });

  return NextResponse.json({ ok: true, success: true }, { status: 200 });
}
