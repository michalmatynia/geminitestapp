import 'server-only';

import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';

import {
  type AiPathRunStaticContext,
  buildAiPathRunStaticContext,
} from './runtime-context/adapters/ai-path-run';
import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from './runtime-context/hydrate-system-log-runtime-context';
import { sanitizeSystemLogForAi } from './runtime-context/sanitize-system-log-for-ai';

export type { AiPathRunStaticContext };

export { buildAiPathRunStaticContext };

export const hydrateLogContextWithAiPathRunStaticContext = async (
  context: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> => await hydrateLogRuntimeContext(context);

export const hydrateSystemLogWithAiPathRunStaticContext = async (
  log: SystemLogRecord
): Promise<SystemLogRecord> => await hydrateSystemLogRecordRuntimeContext(log);

export const sanitizeSystemLogForAiInsight = async (
  log: SystemLogRecord
): Promise<Record<string, unknown>> => await sanitizeSystemLogForAi(log);
