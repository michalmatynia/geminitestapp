import 'server-only';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  hydrateSystemLogRecordRuntimeContext,
  systemLogRuntimeContextAdapters,
} from './hydrate-system-log-runtime-context';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

const pickSanitizedStaticContext = (
  staticContext: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!staticContext) return null;

  const allowedKeys = new Set<string>();
  for (const adapter of systemLogRuntimeContextAdapters) {
    for (const key of adapter.ownedStaticContextKeys) {
      allowedKeys.add(key);
    }
  }

  const picked: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in staticContext) {
      picked[key] = staticContext[key];
    }
  }

  return Object.keys(picked).length > 0 ? picked : null;
};

export const sanitizeSystemLogForAi = async (
  log: SystemLogRecord
): Promise<Record<string, unknown>> => {
  const hydrated = await hydrateSystemLogRecordRuntimeContext(log);
  const context = asRecord(hydrated.context);
  const fingerprint = context ? context['fingerprint'] : undefined;
  const staticContext = pickSanitizedStaticContext(asRecord(context?.['staticContext']));

  return {
    id: hydrated.id,
    level: hydrated.level,
    message: hydrated.message,
    source: hydrated.source,
    createdAt: hydrated.createdAt,
    path: hydrated.path ?? null,
    method: hydrated.method ?? null,
    statusCode: hydrated.statusCode ?? null,
    context:
      fingerprint !== undefined || staticContext
        ? {
            ...(fingerprint !== undefined ? { fingerprint } : {}),
            ...(staticContext ? { staticContext } : {}),
          }
        : null,
  };
};
