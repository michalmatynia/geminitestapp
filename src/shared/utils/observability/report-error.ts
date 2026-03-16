import 'server-only';

import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';
import type { ResolvedError } from '@/shared/contracts/base';
import { resolveError } from '@/shared/errors/resolve-error';
import {
  resolveErrorLogMessage,
  resolveErrorUserMessage,
} from '@/shared/errors/error-catalog';
import {
  getErrorFingerprint,
  logSystemEvent,
} from '@/shared/lib/observability/system-logger';
import { getActiveOtelContextAttributes } from '@/shared/lib/observability/otel-context';

type ReportErrorInput = {
  error: unknown;
  source: string;
  service?: string;
  request?: Request;
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  statusCode?: number;
  fallbackMessage?: string;
  context?: Record<string, unknown>;
  includeOtelContext?: boolean;
};

type ReportErrorResult = {
  resolved: ResolvedError;
  userMessage: string;
  logMessage: string;
  fingerprint?: string;
};

export const reportError = async (input: ReportErrorInput): Promise<ReportErrorResult> => {
  const resolved = resolveError(input.error, {
    ...(input.fallbackMessage ? { fallbackMessage: input.fallbackMessage } : {}),
  });
  const userMessage = resolveErrorUserMessage(resolved);
  const logMessage = resolveErrorLogMessage(resolved);
  const level: SystemLogLevel = resolved.critical ? 'error' : resolved.expected ? 'warn' : 'error';
  const otelContext = input.includeOtelContext ? getActiveOtelContextAttributes() : {};

  await logSystemEvent({
    level,
    message: logMessage,
    source: input.source,
    service: input.service,
    error: input.error,
    ...(input.request ? { request: input.request } : {}),
    requestId: input.requestId,
    traceId: input.traceId,
    correlationId: input.correlationId,
    statusCode: input.statusCode ?? resolved.httpStatus,
    context: {
      ...(input.context ?? {}),
      ...otelContext,
      errorId: resolved.errorId,
      code: resolved.code,
      category: resolved.category,
      expected: resolved.expected,
      critical: resolved.critical,
      retryable: resolved.retryable,
      ...(resolved.retryAfterMs ? { retryAfterMs: resolved.retryAfterMs } : {}),
      ...(resolved.meta ? { meta: resolved.meta } : {}),
      ...(logMessage !== resolved.message ? { originalMessage: resolved.message } : {}),
      userMessage,
      ...(input.service ? { service: input.service } : {}),
    },
  });

  const fingerprint = getErrorFingerprint({
    message: resolved.message,
    source: input.source,
    ...(input.request ? { request: input.request } : {}),
    statusCode: input.statusCode ?? resolved.httpStatus,
    error: input.error,
  });

  return {
    resolved,
    userMessage,
    logMessage,
    fingerprint,
  };
};
