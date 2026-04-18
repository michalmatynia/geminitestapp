import 'server-only';

import type { AuditLevel } from '@/shared/contracts/agent-runtime';
import type { InputJsonValue } from '@/shared/contracts/json';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

/**
 * Convert "unknown-ish" objects into plain JSON-compatible values.
 * - Removes functions/undefined/symbols
 * - Converts Date -> ISO string
 * - Drops BigInt (would throw) unless you transform it (we stringify it)
 */
function toInputJsonValue(
  value: Record<string, unknown> | undefined
): InputJsonValue | undefined {
  if (value === undefined) return undefined;

  const jsonString = JSON.stringify(value, (_key: string, v: unknown) => {
    if (typeof v === 'bigint') return v.toString();
    return v;
  });

  return JSON.parse(jsonString) as InputJsonValue;
}

const isRunIdForeignKeyViolation = (error: unknown): boolean => {
  if (error === null || typeof error !== 'object') return false;
  const maybe = error as { code?: unknown; meta?: unknown };
  if (maybe.code !== 'P2003') return false;
  const metaText = JSON.stringify(maybe.meta ?? {});
  return metaText.includes('runId') || metaText.includes('AgentAuditLog_runId_fkey');
};

async function reportError(
  error: unknown,
  runId: string | null,
  level: string,
  message: string
): Promise<void> {
  await ErrorSystem.captureException(error, {
    service: 'agent-audit',
    action: 'logAgentAudit',
    originalMessage: message,
    auditLevel: level,
    targetRunId: runId,
  });
}

interface RetryOptions {
  agentAuditLog: { create(args: Record<string, unknown>): Promise<unknown> };
  runId: string;
  level: AuditLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

async function retryLogWithoutRunId(options: RetryOptions): Promise<void> {
  const { agentAuditLog, runId, level, message, metadata } = options;
  const fallbackMetadata = toInputJsonValue({
    ...(metadata ?? {}),
    orphanedRunId: runId,
    runLinkMissing: true,
  });
  await agentAuditLog.create({
    data: {
      runId: null,
      level,
      message,
      ...(fallbackMetadata !== undefined && { metadata: fallbackMetadata }),
    },
  });
}

async function handleStorageUnavailable(): Promise<void> {
  await logSystemEvent({
    level: 'info',
    source: 'agent-audit',
    message: 'agentAuditLog storage unavailable',
  });
  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'warn',
      source: 'agent-audit',
      message: 'Audit table not initialized',
    });
  }
}

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const agentAuditLog = getAgentAuditLogDelegate();
  if (agentAuditLog === null) {
    await handleStorageUnavailable();
    return;
  }

  const serializedMetadata = toInputJsonValue(metadata);

  try {
    await agentAuditLog.create({
      data: {
        runId,
        level,
        message,
        ...(serializedMetadata !== undefined && { metadata: serializedMetadata }),
      },
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    const canRetry = runId !== null && runId !== '' && isRunIdForeignKeyViolation(error);
    if (canRetry) {
      try {
        await retryLogWithoutRunId({ agentAuditLog, runId, level, message, metadata });
        return;
      } catch (fallbackError) {
        await ErrorSystem.captureException(fallbackError);
        await reportError(fallbackError, runId, level, message);
        return;
      }
    }
    await reportError(error, runId, level, message);
  }
}
