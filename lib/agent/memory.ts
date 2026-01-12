import prisma from "@/lib/prisma";

export type MemoryScope = "session" | "longterm";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function addAgentMemory(params: {
  runId?: string | null;
  scope: MemoryScope;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  if (!("agentMemoryItem" in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][memory] Memory table not initialized.");
    }
    return null;
  }
  try {
    return prisma.agentMemoryItem.create({
      data: {
        runId: params.runId ?? null,
        scope: params.scope,
        content: params.content,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][memory] Failed to add memory", {
        runId: params.runId,
        error,
      });
    }
    throw error;
  }
}

export async function listAgentMemory(params: {
  runId?: string | null;
  scope?: MemoryScope;
}) {
  if (!("agentMemoryItem" in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][memory] Memory table not initialized.");
    }
    return [];
  }
  try {
    return prisma.agentMemoryItem.findMany({
      where: {
        ...(params.runId ? { runId: params.runId } : {}),
        ...(params.scope ? { scope: params.scope } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][memory] Failed to list memory", {
        runId: params.runId,
        scope: params.scope,
        error,
      });
    }
    throw error;
  }
}
