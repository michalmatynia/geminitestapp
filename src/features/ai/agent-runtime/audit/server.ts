import 'server-only';

import type { AuditLevel } from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';
import type { Prisma } from '@/shared/lib/db/prisma-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

/**
 * Convert "unknown-ish" objects into something Prisma JSON accepts.
 * - Removes functions/undefined/symbols
 * - Converts Date -> ISO string
 * - Drops BigInt (would throw) unless you transform it (we stringify it)
 */
function toPrismaJson(
  value: Record<string, unknown> | undefined
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;

  // JSON.stringify will:
  // - convert Date to ISO (via toJSON)
  // - remove undefined/functions/symbols
  // - throw on BigInt unless we handle it
  const jsonString = JSON.stringify(value, (_key: string, v: unknown) => {
    if (typeof v === 'bigint') return v.toString();
    return v;
  });
  if (!jsonString) return undefined;

  return JSON.parse(jsonString) as Prisma.InputJsonValue;
}

const isRunIdForeignKeyViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: unknown; meta?: unknown };
  if (maybe.code !== 'P2003') return false;
  const metaText = JSON.stringify(maybe.meta ?? {});
  return metaText.includes('runId') || metaText.includes('AgentAuditLog_runId_fkey');
};

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!('agentAuditLog' in prisma)) {
    void logSystemEvent({
      level: 'info',
      source: 'agent-audit',
      message: 'agentAuditLog NOT in prisma',
    });
    if (DEBUG_CHATBOT) {
      void logSystemEvent({
        level: 'warn',
        source: 'agent-audit',
        message: 'Audit table not initialized',
      });
    }
    return;
  }

  const prismaMetadata = toPrismaJson(metadata);

  try {
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level,
        message,
        ...(prismaMetadata !== undefined && { metadata: prismaMetadata }),
      },
    });
  } catch (error) {
    if (runId && isRunIdForeignKeyViolation(error)) {
      try {
        const fallbackMetadata = toPrismaJson({
          ...(metadata ?? {}),
          orphanedRunId: runId,
          runLinkMissing: true,
        });
        await prisma.agentAuditLog.create({
          data: {
            runId: null,
            level,
            message,
            ...(fallbackMetadata !== undefined && { metadata: fallbackMetadata }),
          },
        });
        return;
      } catch (fallbackError) {
        // Report the fallback failure instead of the original FK violation
        // We re-use the reporting block below
        void reportError(fallbackError, runId, level, message);
        return;
      }
    }
    void reportError(error, runId, level, message);
  }
}

async function reportError(
  error: unknown,
  runId: string | null,
  level: string,
  message: string
): Promise<void> {
  void ErrorSystem.captureException(error, {
    service: 'agent-audit',
    action: 'logAgentAudit',
    originalMessage: message,
    auditLevel: level,
    targetRunId: runId,
  });
}
