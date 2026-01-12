import prisma from "@/lib/prisma";

export type AuditLevel = "info" | "warning" | "error";

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  await prisma.agentAuditLog.create({
    data: {
      runId,
      level,
      message,
      metadata,
    },
  });
}
