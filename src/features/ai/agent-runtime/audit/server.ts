import prisma from '@/shared/lib/db/prisma';

import type { Prisma } from '@prisma/client';

export type AuditLevel = 'info' | 'warning' | 'error';
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

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!('agentAuditLog' in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn('[chatbot][agent][audit] Audit table not initialized.');
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
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'agent-audit',
        action: 'logAgentAudit',
        originalMessage: message,
        auditLevel: level,
        targetRunId: runId,
      });
    } catch (logError) {
      if (DEBUG_CHATBOT) {
        console.error('[chatbot][agent][audit] Failed to write audit log (and logging failed)', {
          runId,
          level,
          message,
          error,
          logError,
        });
      }
    }
  }
}
