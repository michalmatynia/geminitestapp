import {
  AgentAuditLog,
  AgentBrowserLog,
  AgentPlanStep,
  AgentSnapshot,
  ChatMessage,
  ModelProfile,
  ModelTaskRule,
  TimelineEntry,
} from "@/types/chatbot";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const parseModelSize = (normalized: string) => {
  const mixMatch = normalized.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)b/);
  if (mixMatch) {
    return Number(mixMatch[1]) * Number(mixMatch[2]);
  }
  const sizeMatch = normalized.match(/(\d+(?:\.\d+)?)b/);
  if (sizeMatch) return Number(sizeMatch[1]);
  if (normalized.includes("xxl")) return 34;
  if (normalized.includes("xlarge") || normalized.includes("xl")) return 13;
  if (normalized.includes("large")) return 13;
  if (normalized.includes("medium")) return 7;
  if (normalized.includes("small") || normalized.includes("mini")) return 3;
  if (normalized.includes("tiny")) return 1.5;
  return null;
};

export const buildModelProfile = (name: string): ModelProfile => {
  const normalized = name.toLowerCase();
  const isEmbedding = [
    "embed",
    "embedding",
    "text-embedding",
    "nomic-embed",
    "bge",
    "e5",
    "gte",
  ].some((tag) => normalized.includes(tag));
  const isRerank = ["rerank", "reranker", "cross-encoder"].some((tag) =>
    normalized.includes(tag)
  );
  const isVision = [
    "vision",
    "llava",
    "bakllava",
    "minicpm",
    "moondream",
    "qwen-vl",
    "cogvlm",
  ].some((tag) => normalized.includes(tag));
  const isCode = [
    "code",
    "coder",
    "codestral",
    "codeqwen",
    "starcoder",
    "codegen",
  ].some((tag) => normalized.includes(tag));
  const isInstruct = ["instruct", "assistant"].some((tag) =>
    normalized.includes(tag)
  );
  const isChat = normalized.includes("chat");
  const isReasoning =
    normalized.includes("reasoner") ||
    /(^|[^a-z0-9])r1($|[^a-z0-9])/.test(normalized);
  return {
    name,
    normalized,
    size: parseModelSize(normalized),
    isEmbedding,
    isRerank,
    isVision,
    isCode,
    isInstruct,
    isChat,
    isReasoning,
  };
};

export const scoreModelForTask = (profile: ModelProfile, rule: ModelTaskRule) => {
  if (profile.isEmbedding || profile.isRerank) return Number.NEGATIVE_INFINITY;
  const size = profile.size ?? 7;
  let score = 0;
  if (profile.isInstruct || profile.isChat) score += 1;
  if (profile.isReasoning) score += rule.preferReasoning ? 1.2 : 0.3;
  if (profile.isVision) score -= 1.5;
  if (profile.isCode) score -= 0.4;
  if (rule.preferLarge) score += size * 0.35;
  if (rule.preferSmall) score += (10 - size) * 0.25;
  if (rule.targetSize) score -= Math.abs(size - rule.targetSize) * 0.7;
  if (rule.minSize && size < rule.minSize) {
    score -= (rule.minSize - size) * 0.9;
  }
  if (rule.maxSize && size > rule.maxSize) {
    score -= (size - rule.maxSize) * 0.4;
  }
  return score;
};

export const pickBestModel = (
  profiles: readonly ModelProfile[],
  rule: ModelTaskRule
): string | null => {
  let bestName: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestSize = -1;

  for (const profile of profiles) {
    const score = scoreModelForTask(profile, rule);
    if (!Number.isFinite(score)) continue;

    const size = profile.size ?? 0;

    if (
      bestName === null ||
      score > bestScore ||
      (score === bestScore && size > bestSize)
    ) {
      bestName = profile.name;
      bestScore = score;
      bestSize = size;
    }
  }

  return bestName;
};

export const readErrorResponse = async (res: Response) => {
  try {
    const data = (await res.json()) as { error?: string; errorId?: string };
    return { 
      message: data.error || "Request failed.", 
      errorId: data.errorId 
    };
  } catch (error) {
    try {
      const text = await res.text();
      return { message: text || "Request failed." };
    } catch {
      return { message: "Request failed." };
    }
  }
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const safeLocalStorageGet = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
};

export const safeLocalStorageRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
};

export const readCachedMessages = (sessionId: string) => {
  try {
    const raw = window.localStorage.getItem(`chatbotSessionCache:${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message) => message && typeof message.content === "string"
    );
  } catch {
    return [];
  }
};

export const writeCachedMessages = (sessionId: string, messages: ChatMessage[]) => {
  try {
    const safeMessages = messages.filter(
      (message) =>
        message.role !== "system" && message.content.trim().length > 0
    );
    window.localStorage.setItem(
      `chatbotSessionCache:${sessionId}`,
      JSON.stringify(safeMessages)
    );
  } catch {
    // ignore cache failures
  }
};

export const resolveIgnoreRobots = (planState?: Record<string, unknown> | null) => {
  if (!planState || typeof planState !== "object") return false;
  const prefs = (planState as { preferences?: { ignoreRobotsTxt?: boolean } })
    .preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

export const resolveApprovalStepId = (planState?: Record<string, unknown> | null) => {
  if (!planState || typeof planState !== "object") return null;
  const approval = (planState as { approvalRequestedStepId?: string | null })
    .approvalRequestedStepId;
  return typeof approval === "string" ? approval : null;
};

export const buildAgentResultMessage = (
  audits: AgentAuditLog[],
  status: string | null
) => {
  const taskType = audits
    .map((audit) => audit.metadata)
    .find(
      (metadata) =>
        metadata &&
        typeof (metadata as { plannerMeta?: { taskType?: string } }).plannerMeta
          ?.taskType === "string"
    );
  const resolvedTaskType = 
    (taskType as { plannerMeta?: { taskType?: string } })?.plannerMeta
      ?.taskType ?? null;
  const extractionAudit = audits.find(
    (audit) =>
      Array.isArray(audit.metadata?.items) ||
      Array.isArray(audit.metadata?.names)
  );
  if (extractionAudit) {
    const extractionItems = Array.isArray(extractionAudit.metadata?.items) 
      ? extractionAudit.metadata.items 
      : Array.isArray(extractionAudit.metadata?.names)
        ? extractionAudit.metadata.names
        : [];
    const items = extractionItems
      .filter((name) => typeof name === "string")
      .map((name) => name.trim())
      .filter(Boolean);
    if (items.length > 0) {
      const url = 
        typeof extractionAudit.metadata?.url === "string"
          ? extractionAudit.metadata.url
          : null;
      const extractionType = 
        typeof extractionAudit.metadata?.extractionType === "string"
          ? extractionAudit.metadata.extractionType
          : null;
      const label = 
        extractionType === "emails"
          ? "Extracted emails"
          : extractionType === "product_names"
            ? "Extracted product names"
            : "Extracted information";
      const intro = url ? `${label} found on ${url}:` : `${label}:`;
      return `${intro}\n${items.map((name) => `- ${name}`).join("\n")}`;
    }
  }
  const emptyAudit = audits.find(
    (audit) =>
      audit.message === "No product names extracted."
  );
  if (emptyAudit) {
    const url = 
      typeof emptyAudit.metadata?.url === "string"
        ? emptyAudit.metadata.url
        : null;
    return `No information extracted${url ? ` from ${url}` : ""}.`;
  }
  if (status === "completed") {
    if (resolvedTaskType === "extract_info") {
      return "No information extracted.";
    }
    if (resolvedTaskType === "web_task") {
      return "Agent run completed. Actions executed in agent mode.";
    }
    return "Agent run completed. No extractable results.";
  }
  if (status === "failed") {
    return "Agent run failed. Check the agent run details for errors.";
  }
  if (status === "waiting_human") {
    return "Agent run needs human input to continue.";
  }
  return null;
};

export const buildAgentResumeSummaryMessage = (audits: AgentAuditLog[]) => {
  const resumeAudit = audits.find(
    (audit) =>
      audit.message === "Resume summary prepared."
  );
  const autoResumeAudit = audits.find(
    (audit) => audit.message === "Auto-resume queued for stuck run."
  );
  if (!resumeAudit) {
    if (!autoResumeAudit) return null;
    const timestamp = autoResumeAudit.createdAt
      ? new Date(autoResumeAudit.createdAt).toLocaleString()
      : null;
    return `Auto-resume queued for stuck run${timestamp ? ` (${timestamp})` : ""}.`;
  }
  const summary = 
    typeof resumeAudit.metadata?.summary === "string"
      ? resumeAudit.metadata.summary.trim()
      : "";
  if (!summary) return null;
  return `Resume summary:\n${summary}`;
};

export const buildToolTimeline = (
  logs: AgentBrowserLog[],
  audits: AgentAuditLog[]
): TimelineEntry[] => {
  const auditEntries: TimelineEntry[] = audits
    .filter((audit) =>
      /tool|playwright|snapshot|selector|extraction|login|search|navigation/i.test(
        audit.message
      )
    )
    .map((audit) => ({
      id: `audit-${audit.id}`,
      source: "audit" as const,
      level: null,
      message: audit.message,
      createdAt: audit.createdAt,
    }));
  const logEntries: TimelineEntry[] = logs.map((log) => ({
    id: `browser-${log.id}`,
    source: "browser" as const,
    level: log.level,
    message: log.message,
    createdAt: log.createdAt,
  }));
  return [...auditEntries, ...logEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const formatDependencies = (dependsOn?: string[] | null) => {
  if (!dependsOn || dependsOn.length === 0) return null;
  const readable = dependsOn.map((item) => {
    const match = item.match(/^step-(\d+)$/);
    if (!match) return item;
    const index = Number(match[1]);
    if (!Number.isFinite(index)) return item;
    return `#${index + 1}`;
  });
  return readable.join(", ");
};

export const getSelfCheckAudits = (audits: AgentAuditLog[]) =>
  audits.filter(
    (audit) =>
      audit.message === "Self-check completed."
  );

export const getAuditList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const formatAdaptiveReason = (reason?: string | null) => {
  if (!reason) return "unspecified";
  const trimmed = reason.trim();
  if (!trimmed) return "unspecified";
  if (trimmed.includes(" ")) return trimmed;
  return trimmed.replace(/-/g, " ");
};

export const getLatestAdaptiveTrigger = (audits: AgentAuditLog[]) => {
  const candidates = audits
    .map((audit) => {
      const metadata = audit.metadata as {
        type?: string;
        reason?: string | null;
      } | null;
      const type = metadata?.type;
      if (
        type !== "plan-replan" &&
        type !== "plan-adapt" &&
        type !== "self-check-replan"
      ) {
        return null;
      }
      const label = 
        type === "plan-adapt"
          ? "mid-run adaptation"
          : type === "self-check-replan"
            ? "self-check replan"
            : "adaptive replan";
      return {
        id: audit.id,
        createdAt: audit.createdAt,
        reason: typeof metadata?.reason === "string" ? metadata.reason : null,
        label,
      };
    })
    .filter(Boolean) as Array<{ 
      id: string;
      createdAt: string;
      reason: string | null;
      label: string;
    }>;
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, current) => {
    const latestTime = Date.parse(latest.createdAt);
    const currentTime = Date.parse(current.createdAt);
    return currentTime > latestTime ? current : latest;
  }, candidates[0]);
};

export const getLatestAuditByType = (
  audits: AgentAuditLog[],
  type: string
): AgentAuditLog | null => {
  const filtered = audits.filter((audit) => audit.metadata?.type === type);
  return filtered.length ? filtered[filtered.length - 1] : null;
};

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export const persistSessionMessage = async (
  sessionId: string,
  role: ChatMessage["role"],
  content: string
) => {
  const res = await fetchWithTimeout(
    `/api/chatbot/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    },
    12000
  );
  if (!res.ok) {
    const error = await readErrorResponse(res);
    const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
    throw new Error(`${error.message}${suffix}`);
  }
};
