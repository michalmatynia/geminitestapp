import 'server-only';

import {
  isSensitiveKey,
  REDACTED_VALUE,
  truncateString,
} from '@/shared/lib/observability/log-redaction';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type AuthLogStage = 'start' | 'success' | 'failure';

type AuthLogInput = {
  req: Request;
  action: string;
  stage: AuthLogStage;
  userId?: string | null;
  status?: number;
  outcome?: string;
  body?: unknown;
  extra?: Record<string, unknown>;
};

const MAX_STRING = 2000;
const MAX_DEPTH = 4;
const MAX_ARRAY = 20;

const safeHeaderKeys = new Set([
  'content-type',
  'user-agent',
  'origin',
  'referer',
  'x-forwarded-for',
  'x-real-ip',
  'x-request-id',
]);

const AUTH_LOGGING_ENABLED = process.env['AUTH_LOGGING'] === 'true';

const getClientIp = (req: Request): string | null => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded !== null) {
    const first = forwarded.split(',')[0];
    if (first !== undefined && first !== '') return first.trim();
  }
  const real = req.headers.get('x-real-ip');
  if (real !== null) return real;
  return null;
};

const redactObject = (value: Record<string, unknown>, depth: number): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, val]: [string, unknown]) => {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED_VALUE;
    } else {
      out[key] = redactValue(val, depth + 1);
    }
  });
  return out;
};

const redactValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (typeof value === 'string') return truncateString(value, MAX_STRING);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item: unknown) => redactValue(item, depth + 1));
  }
  if (typeof value === 'object' && value !== null) {
    return redactObject(value as Record<string, unknown>, depth);
  }
  return '[Unknown]';
};

const redactBody = (body: unknown): Record<string, unknown> | null => {
  if (body === undefined || body === null || body === false) return null;
  const redacted = redactValue(body, 0);
  if (redacted !== null && typeof redacted === 'object' && !Array.isArray(redacted)) {
    return redacted as Record<string, unknown>;
  }
  return { value: redacted };
};

const extractHeaders = (req: Request): Record<string, string> => {
  const result: Record<string, string> = {};
  req.headers.forEach((value: string, key: string) => {
    if (!safeHeaderKeys.has(key.toLowerCase())) return;
    result[key] = truncateString(value, 400);
  });
  return result;
};

const buildAuthContext = (input: AuthLogInput, url: URL): Record<string, unknown> => {
  const context: Record<string, unknown> = {
    stage: input.stage,
    path: url.pathname,
    method: input.req.method,
    ip: getClientIp(input.req),
    headers: extractHeaders(input.req),
  };

  if (typeof input.outcome === 'string' && input.outcome !== '') {
    context['outcome'] = input.outcome;
  }
  if (typeof input.status === 'number') {
    context['status'] = input.status;
  }
  if (input.body !== undefined && input.body !== null) {
    context['body'] = redactBody(input.body);
  }
  if (input.extra !== undefined && input.extra !== null) {
    context['extra'] = redactValue(input.extra, 0);
  }

  return context;
};

export async function logAuthEvent(input: AuthLogInput): Promise<void> {
  if (!AUTH_LOGGING_ENABLED) return;
  try {
    const url = new URL(input.req.url);
    const context = buildAuthContext(input, url);

    await logSystemEvent({
      level: input.stage === 'failure' ? 'warn' : 'info',
      message: `${input.action}.${input.stage}`,
      source: input.action,
      request: input.req,
      userId: input.userId ?? null,
      ...(input.status !== undefined ? { statusCode: input.status } : {}),
      context,
    });
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => {});
  }
}
