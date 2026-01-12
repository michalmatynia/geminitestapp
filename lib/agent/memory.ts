import prisma from "@/lib/prisma";

export type MemoryScope = "session" | "longterm";

export async function addAgentMemory(params: {
  runId?: string | null;
  scope: MemoryScope;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.agentMemoryItem.create({
    data: {
      runId: params.runId ?? null,
      scope: params.scope,
      content: params.content,
      metadata: params.metadata,
    },
  });
}

export async function listAgentMemory(params: {
  runId?: string | null;
  scope?: MemoryScope;
}) {
  return prisma.agentMemoryItem.findMany({
    where: {
      ...(params.runId ? { runId: params.runId } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}
