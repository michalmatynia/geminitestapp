import prisma from "@/lib/prisma";

export type AuditLevel = "info" | "warning" | "error";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function logAgentAudit(
  runId: string | null,
  level: AuditLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  if (!("agentAuditLog" in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][audit] Audit table not initialized.");
    }
    return;
  }
  try {
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level,
        message,
        metadata,
      },
    });
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][audit] Failed to write audit log", {
        runId,
        level,
        message,
        error,
      });
    }
  }
}
