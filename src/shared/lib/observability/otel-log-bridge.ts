import { SeverityNumber, logs } from '@opentelemetry/api-logs';

import type { SystemLogLevelDto as SystemLogLevel } from '@/shared/contracts/observability';

import { isSensitiveKey, REDACTED_VALUE, redactSensitiveText, truncateString } from './log-redaction';
import { getActiveOtelContextAttributes } from './otel-context';

const OTEL_LOGGER_NAME = 'geminitestapp.system-logger';
const MAX_ATTRIBUTE_VALUE_LENGTH = 2000;
const MAX_CONTEXT_KEYS = 80;

type EmitOtelLogRecordInput = {
  level: SystemLogLevel;
  message: string;
  source?: string | null | undefined;
  service?: string | null | undefined;
  category?: string | null | undefined;
  context?: Record<string, unknown> | null | undefined;
  stack?: string | null | undefined;
  path?: string | null | undefined;
  method?: string | null | undefined;
  statusCode?: number | null | undefined;
  requestId?: string | null | undefined;
  traceId?: string | null | undefined;
  correlationId?: string | null | undefined;
  spanId?: string | null | undefined;
  parentSpanId?: string | null | undefined;
  userId?: string | null | undefined;
};

const mapSeverity = (level: SystemLogLevel): SeverityNumber => {
  if (level === 'error') return SeverityNumber.ERROR;
  if (level === 'warn') return SeverityNumber.WARN;
  return SeverityNumber.INFO;
};

const asAttributeValue = (
  key: string,
  value: unknown
): string | number | boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (isSensitiveKey(key)) return REDACTED_VALUE;

  if (typeof value === 'string') {
    return truncateString(redactSensitiveText(value), MAX_ATTRIBUTE_VALUE_LENGTH);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') {
    return truncateString(value.toString(), MAX_ATTRIBUTE_VALUE_LENGTH);
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return undefined;
    return truncateString(redactSensitiveText(serialized), MAX_ATTRIBUTE_VALUE_LENGTH);
  } catch {
    return '[Unserializable]';
  }
};

const sanitizeContextAttributes = (
  context: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean> => {
  if (!context) return {};
  const attributes: Record<string, string | number | boolean> = {};
  const entries = Object.entries(context).slice(0, MAX_CONTEXT_KEYS);

  for (const [key, value] of entries) {
    const attributeKey = `context.${key}`;
    const attributeValue = asAttributeValue(key, value);
    if (attributeValue !== undefined) {
      attributes[attributeKey] = attributeValue;
    }
  }

  return attributes;
};

export const emitOtelLogRecord = (input: EmitOtelLogRecordInput): void => {
  try {
    const otelContext = getActiveOtelContextAttributes();
    const logger = logs.getLogger(OTEL_LOGGER_NAME);
    const body = truncateString(redactSensitiveText(input.message), MAX_ATTRIBUTE_VALUE_LENGTH);
    const attributes: Record<string, string | number | boolean> = {
      ...sanitizeContextAttributes(input.context),
      ...(input.source ? { source: input.source } : {}),
      ...(input.service ? { service: input.service } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.path ? { path: input.path } : {}),
      ...(input.method ? { method: input.method } : {}),
      ...(typeof input.statusCode === 'number' ? { statusCode: input.statusCode } : {}),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      ...(input.traceId ? { traceId: input.traceId } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.spanId ? { spanId: input.spanId } : {}),
      ...(input.parentSpanId ? { parentSpanId: input.parentSpanId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.stack
        ? { stack: truncateString(redactSensitiveText(input.stack), MAX_ATTRIBUTE_VALUE_LENGTH) }
        : {}),
      ...(otelContext.otelTraceId ? { otelTraceId: otelContext.otelTraceId } : {}),
      ...(otelContext.otelSpanId ? { otelSpanId: otelContext.otelSpanId } : {}),
      ...(otelContext.otelTraceFlags ? { otelTraceFlags: otelContext.otelTraceFlags } : {}),
    };

    logger.emit({
      severityNumber: mapSeverity(input.level),
      severityText: input.level.toUpperCase(),
      body,
      attributes,
    });
  } catch {
    // Never throw from observability bridge.
  }
};

