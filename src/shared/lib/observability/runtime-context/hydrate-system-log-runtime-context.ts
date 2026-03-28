import 'server-only';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { hydrateLogContext } from '../log-hydration-registry';

/**
 * Hydrate a log context record using the registered hydrator.
 * This function is now a shell that delegates to the global LogHydrationRegistry
 * to avoid shared->features circular dependencies.
 */
export async function hydrateLogRuntimeContext(
  context: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> {
  return await hydrateLogContext(context);
}

/**
 * Hydrate a full system log record using the registered hydrator.
 */
export async function hydrateSystemLogRecordRuntimeContext(
  log: SystemLogRecord
): Promise<SystemLogRecord> {
  const hydratedContext = await hydrateLogContext(log.context ?? null);
  
  if (!hydratedContext || hydratedContext === log.context) {
    return log;
  }

  return {
    ...log,
    context: hydratedContext,
  };
}
