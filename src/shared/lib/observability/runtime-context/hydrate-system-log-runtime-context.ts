import 'server-only';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { aiPathRunRuntimeContextAdapter } from './adapters/ai-path-run';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isObjectRecord(value) ? value : null;

export const systemLogRuntimeContextAdapters = [aiPathRunRuntimeContextAdapter] as const;

export const hydrateLogRuntimeContext = async (
  context: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> => {
  const contextRecord = asRecord(context);
  if (!contextRecord) return context ?? null;

  const adapter = systemLogRuntimeContextAdapters.find((candidate) =>
    candidate.canHydrate(contextRecord)
  );
  if (!adapter) return contextRecord;

  try {
    const hydrated = await adapter.hydrate(contextRecord);
    if (!hydrated) return contextRecord;

    const staticContext = asRecord(contextRecord['staticContext']);
    const analysisContext = asRecord(contextRecord['analysisContext']);

    return {
      ...contextRecord,
      ...(hydrated.analysisContextPatch
        ? {
            analysisContext: {
              ...(analysisContext ?? {}),
              ...hydrated.analysisContextPatch,
            },
          }
        : {}),
      staticContext: {
        ...(staticContext ?? {}),
        ...hydrated.staticContextPatch,
      },
    };
  } catch {
    return contextRecord;
  }
};

export const hydrateSystemLogRecordRuntimeContext = async (
  log: SystemLogRecord
): Promise<SystemLogRecord> => {
  const context = await hydrateLogRuntimeContext(log.context ?? null);
  if (context === log.context) return log;
  return {
    ...log,
    context,
  };
};
