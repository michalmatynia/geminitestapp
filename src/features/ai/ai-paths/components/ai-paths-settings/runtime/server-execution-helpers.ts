'use client';

import { aiPathRunNodeSchema, type AiPathRunEventRecord, type AiPathRunNodeRecord } from '@/shared/lib/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';

export type RuntimeEventLevel = 'debug' | 'info' | 'warn' | 'error';
export const SERVER_EXECUTION_ENQUEUE_TIMEOUT_MS = 90_000;

export const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const asNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

export const parseSsePayload = (event: MessageEvent): unknown => {
  try {
    return JSON.parse(event.data as string) as unknown;
  } catch {
    return null;
  }
};

export type ApiErrorMetadata = {
  code: string | null;
  category: string | null;
  errorId: string | null;
  fingerprint: string | null;
  retryable: boolean;
  retryAfterMs: number | null;
  details: Record<string, unknown> | null;
  suggestedActions: unknown[] | null;
};

export const readApiErrorMetadata = (value: unknown): ApiErrorMetadata => {
  if (!isObjectRecord(value)) {
    return {
      code: null,
      category: null,
      errorId: null,
      fingerprint: null,
      retryable: false,
      retryAfterMs: null,
      details: null,
      suggestedActions: null,
    };
  }
  const detailsRaw = value['details'];
  return {
    code: asString(value['code']),
    category: asString(value['category']),
    errorId: asString(value['errorId']),
    fingerprint: asString(value['fingerprint']),
    retryable: value['retryable'] === true,
    retryAfterMs: asNumber(value['retryAfterMs']),
    details: isObjectRecord(detailsRaw) ? detailsRaw : null,
    suggestedActions: Array.isArray(value['suggestedActions']) ? value['suggestedActions'] : null,
  };
};

export const normalizeRuntimeEventLevel = (value: unknown): RuntimeEventLevel => {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  if (value === 'fatal') {
    return 'error';
  }
  return 'info';
};

export const parseRunNodeRecord = (value: unknown): AiPathRunNodeRecord | null => {
  const parsed = aiPathRunNodeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeNodeStreamPayload = (value: unknown): AiPathRunNodeRecord[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry: unknown): AiPathRunNodeRecord[] => {
      const parsed = parseRunNodeRecord(entry);
      return parsed ? [parsed] : [];
    });
  }
  if (!isObjectRecord(value)) return [];
  if (Array.isArray(value['nodes'])) {
    return value['nodes'].flatMap((entry: unknown): AiPathRunNodeRecord[] => {
      const parsed = parseRunNodeRecord(entry);
      return parsed ? [parsed] : [];
    });
  }
  const parsed = parseRunNodeRecord(value);
  return parsed ? [parsed] : [];
};

export const normalizeEventStreamPayload = (
  value: unknown
): Array<AiPathRunEventRecord | Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter((entry: unknown): boolean => isObjectRecord(entry)) as Array<
      AiPathRunEventRecord | Record<string, unknown>
    >;
  }
  if (!isObjectRecord(value)) return [];
  if (Array.isArray(value['events'])) {
    return value['events'].filter((entry: unknown): boolean => isObjectRecord(entry)) as Array<
      AiPathRunEventRecord | Record<string, unknown>
    >;
  }
  if (typeof value['message'] === 'string') {
    return [value];
  }
  return [];
};

export const resolveEntityIdFromContext = (triggerContext: Record<string, unknown>): string | null => {
  return asString(triggerContext['entityId']) ?? asString(triggerContext['productId']) ?? null;
};

export const resolveEntityTypeFromContext = (
  triggerContext: Record<string, unknown>,
  entityId: string | null
): string | null => {
  const explicit = asString(triggerContext['entityType']);
  if (explicit) return explicit;
  if (entityId && asString(triggerContext['productId'])) {
    return 'product';
  }
  return null;
};
