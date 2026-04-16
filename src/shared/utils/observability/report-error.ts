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

const getLogLevel = (resolved: ResolvedError): SystemLogLevel => {
  if (resolved.critical) return 'error';
  if (resolved.expected) return 'warn';
  return 'error';
};

const getOptionalContext = (
  input: ReportErrorInput,
  resolved: ResolvedError,
  logMessage: string
): Record<string, unknown> => {
  const opts: Record<string, unknown> = {};
  if (resolved.retryAfterMs !== undefined) {
    opts['retryAfterMs'] = resolved.retryAfterMs;
  }
  if (resolved.meta !== undefined) {
    opts['meta'] = resolved.meta;
  }
  if (logMessage !== resolved.message) {
    opts['originalMessage'] = resolved.message;
  }
  if (input.service !== undefined && input.service.length > 0) {
    opts['service'] = input.service;
  }
  return opts;
};

const buildErrorContext = (
  input: ReportErrorInput,
  resolved: ResolvedError,
  logMessage: string,
  userMessage: string
): Record<string, unknown> => {
  const otelContext = input.includeOtelContext === true ? getActiveOtelContextAttributes() : {};
  return {
    ...(input.context ?? {}),
    ...otelContext,
    errorId: resolved.errorId,
    code: resolved.code,
    category: resolved.category,
    expected: resolved.expected,
    critical: resolved.critical,
    retryable: resolved.retryable,
    userMessage,
    ...getOptionalContext(input, resolved, logMessage),
  };
};

const dispatchLogEvent = async (
  input: ReportErrorInput,
  resolved: ResolvedError,
  logMessage: string,
  userMessage: string
): Promise<void> => {
  await logSystemEvent({
    level: getLogLevel(resolved),
    message: logMessage,
    source: input.source,
    service: input.service,
    error: input.error,
    ...(input.request !== undefined ? { request: input.request } : {}),
    requestId: input.requestId,
    traceId: input.traceId,
    correlationId: input.correlationId,
    statusCode: input.statusCode ?? resolved.httpStatus,
    context: buildErrorContext(input, resolved, logMessage, userMessage),
  });
};

export const reportError = async (input: ReportErrorInput): Promise<ReportErrorResult> => {
  const resolved = resolveError(input.error, {
    ...(input.fallbackMessage !== undefined ? { fallbackMessage: input.fallbackMessage } : {}),
  });

  const userMessage = resolveErrorUserMessage(resolved);
  const logMessage = resolveErrorLogMessage(resolved);

  await dispatchLogEvent(input, resolved, logMessage, userMessage);

  const fingerprint = getErrorFingerprint({
    message: resolved.message,
    source: input.source,
    ...(input.request !== undefined ? { request: input.request } : {}),
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
