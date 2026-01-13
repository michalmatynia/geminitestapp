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

export async function addAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  content: string;
  summary?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importance?: number | null;
}) {
  if (!("agentLongTermMemory" in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][memory] Long-term memory table not initialized.");
    }
    return null;
  }
  try {
    return prisma.agentLongTermMemory.create({
      data: {
        memoryKey: params.memoryKey,
        runId: params.runId ?? null,
        content: params.content,
        summary: params.summary ?? null,
        tags: params.tags ?? [],
        metadata: params.metadata,
        importance: params.importance ?? null,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][memory] Failed to add long-term memory", {
        memoryKey: params.memoryKey,
        runId: params.runId,
        error,
      });
    }
    throw error;
  }
}

export async function listAgentLongTermMemory(params: {
  memoryKey: string;
  limit?: number;
  tags?: string[];
}) {
  if (!("agentLongTermMemory" in prisma)) {
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][agent][memory] Long-term memory table not initialized.");
    }
    return [];
  }
  try {
    const tagFilter =
      params.tags && params.tags.length > 0
        ? { hasSome: params.tags }
        : undefined;
    const items = await prisma.agentLongTermMemory.findMany({
      where: {
        memoryKey: params.memoryKey,
        ...(tagFilter ? { tags: tagFilter } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: params.limit ?? 5,
    });
    const ids = items.map((item) => item.id);
    if (ids.length > 0) {
      await prisma.agentLongTermMemory.updateMany({
        where: { id: { in: ids } },
        data: { lastAccessedAt: new Date() },
      });
    }
    return items;
  } catch (error) {
    if (DEBUG_CHATBOT) {
      console.error("[chatbot][agent][memory] Failed to list long-term memory", {
        memoryKey: params.memoryKey,
        error,
      });
    }
    throw error;
  }
}
