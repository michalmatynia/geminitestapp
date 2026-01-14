import prisma from "@/lib/prisma";

const DEFAULT_MEMORY_VALIDATION_MODEL =
  process.env.MEMORY_VALIDATION_MODEL ?? process.env.OLLAMA_MODEL;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export type MemoryScope = "session" | "longterm";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const extractMessageContent = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  const message = (payload as { message?: { content?: unknown } }).message;
  return typeof message?.content === "string" ? message.content : "";
};

const parseJsonObject = (raw: string): unknown => {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch {
    return null;
  }
};

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

export async function validateAgentLongTermMemory(params: {
  model?: string | null;
  prompt?: string | null;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const model = params.model?.trim() || DEFAULT_MEMORY_VALIDATION_MODEL;
  const prompt = params.prompt ?? "";
  if (!model) {
    throw new Error("MEMORY_VALIDATION_MODEL/OLLAMA_MODEL is not configured.");
  }
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You validate long-term memory entries. Return only JSON with keys: valid (boolean), issues (array of strings), reason. Mark invalid if the prompt implies a target URL/domain that conflicts with metadata.url or metadata.run.url. Prefer strictness if evidence is missing.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              content: params.content,
              summary: params.summary ?? null,
              metadata: params.metadata ?? null,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Memory validation failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload);
    const parsed = parseJsonObject(content) as {
      valid?: unknown;
      issues?: unknown;
      reason?: unknown;
    } | null;
    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.filter((item: unknown) => typeof item === "string")
      : [];
    return {
      valid: typeof parsed?.valid === "boolean" ? parsed.valid : true,
      issues,
      reason: typeof parsed?.reason === "string" ? parsed.reason : null,
      model,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [
        `Memory validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      reason: null,
      model,
    };
  }
}

export async function validateAndAddAgentLongTermMemory(params: {
  memoryKey: string;
  runId?: string | null;
  content: string;
  summary?: string | null;
  summaryModel?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importance?: number | null;
  model?: string | null;
  prompt?: string | null;
}) {
  const summaryModel = params.summaryModel?.trim();
  let summary = params.summary ?? null;
  if (summaryModel) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: summaryModel,
          stream: false,
          messages: [
            {
              role: "system",
              content:
                "You write concise long-term memory summaries. Return only JSON with key summary (string). Keep it 1-2 sentences.",
            },
            {
              role: "user",
              content: JSON.stringify({
                prompt: params.prompt ?? null,
                content: params.content,
                metadata: params.metadata ?? null,
              }),
            },
          ],
          options: { temperature: 0.2 },
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const content = extractMessageContent(payload);
        const parsed = parseJsonObject(content) as {
          summary?: unknown;
        } | null;
        if (typeof parsed?.summary === "string" && parsed.summary.trim()) {
          summary = parsed.summary.trim();
        }
      }
    } catch {
      // keep existing summary if summarization fails
    }
  }
  const validation = await validateAgentLongTermMemory({
    model: params.model,
    prompt: params.prompt,
    content: params.content,
    summary,
    metadata: params.metadata,
  });
  if (!validation.valid) {
    return { skipped: true, validation };
  }
  const record = await addAgentLongTermMemory({
    memoryKey: params.memoryKey,
    runId: params.runId ?? null,
    content: params.content,
    summary,
    tags: params.tags ?? [],
    metadata: params.metadata,
    importance: params.importance ?? null,
  });
  return { skipped: false, validation, record };
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
