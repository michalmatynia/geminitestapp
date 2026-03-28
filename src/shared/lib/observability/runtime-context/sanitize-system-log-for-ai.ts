import 'server-only';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { hydrateSystemLogRecordRuntimeContext } from './hydrate-system-log-runtime-context';
import { isObjectRecord } from '@/shared/utils/object-utils';

/**
 * Sanitize a system log record for AI consumption.
 * This function now uses the registered hydrator to enrich the log.
 * Note: Full sanitization logic is moved to observability feature.
 * This shared version provides a basic safe baseline.
 */
export const sanitizeSystemLogForAi = async (
  log: SystemLogRecord
): Promise<Record<string, unknown>> => {
  const hydrated = await hydrateSystemLogRecordRuntimeContext(log);
  const context = isObjectRecord(hydrated.context) ? hydrated.context : null;
  
  return {
    id: hydrated.id,
    level: hydrated.level,
    message: hydrated.message,
    source: hydrated.source,
    createdAt: hydrated.createdAt,
    path: hydrated.path ?? null,
    method: hydrated.method ?? null,
    statusCode: hydrated.statusCode ?? null,
    context,
  };
};
