import {
  AgentAuditLog,
  AgentBrowserLog,
  ChatMessage,
  ModelProfile,
  ModelTaskRule,
  TimelineEntry,
} from "@/shared/types/chatbot";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const parseModelSize = (normalized: string): number | null => {
  const mixMatch: RegExpMatchArray | null = normalized.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)b/);
  if (mixMatch) {
    return Number(mixMatch[1]) * Number(mixMatch[2]);
  }
  const sizeMatch: RegExpMatchArray | null = normalized.match(/(\d+(?:\.\d+)?)b/);
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
  const normalized: string = name.toLowerCase();
  const isEmbedding: boolean = [
    "embed",
    "embedding",
    "text-embedding",
    "nomic-embed",
    "bge",
    "e5",
    "gte",
  ].some((tag: string): boolean => normalized.includes(tag));
  const isRerank: boolean = ["rerank", "reranker", "cross-encoder"].some((tag: string): boolean =>
    normalized.includes(tag)
  );
  const isVision: boolean = [
    "vision",
    "llava",
    "bakllava",
    "minicpm",
    "moondream",
    "qwen-vl",
    "cogvlm",
  ].some((tag: string): boolean => normalized.includes(tag));
  const isCode: boolean = [
    "code",
    "coder",
    "codestral",
    "codeqwen",
    "starcoder",
    "codegen",
  ].some((tag: string): boolean => normalized.includes(tag));
  const isInstruct: boolean = ["instruct", "assistant"].some((tag: string): boolean =>
    normalized.includes(tag)
  );
  const isChat: boolean = normalized.includes("chat");
  const isReasoning: boolean = 
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

export const scoreModelForTask = (profile: ModelProfile, rule: ModelTaskRule): number => {
  if (profile.isEmbedding || profile.isRerank) return Number.NEGATIVE_INFINITY;
  const size: number = profile.size ?? 7;
  let score: number = 0;
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
  let bestScore: number = Number.NEGATIVE_INFINITY;
  let bestSize: number = -1;

  for (const profile of profiles) {
    const score: number = scoreModelForTask(profile, rule);
    if (!Number.isFinite(score)) continue;

    const size: number = profile.size ?? 0;

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

export const safeLocalStorageGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
};

export const safeLocalStorageRemove = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
};

export const readCachedMessages = (sessionId: string): ChatMessage[] => {
  try {
    const raw: string | null = window.localStorage.getItem(`chatbotSessionCache:${sessionId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (message: unknown): message is ChatMessage => 
        !!message && 
        typeof message === "object" && 
        "content" in message && 
        typeof (message as { content: unknown }).content === "string"
    );
  } catch {
    return [];
  }
};

export const writeCachedMessages = (sessionId: string, messages: ChatMessage[]): void => {
  try {
    const safeMessages: ChatMessage[] = messages.filter(
      (message: ChatMessage): boolean =>
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

export const resolveIgnoreRobots = (planState?: Record<string, unknown> | null): boolean => {
  if (!planState || typeof planState !== "object") return false;
  const prefs: { ignoreRobotsTxt?: boolean } | undefined = (planState as { preferences?: { ignoreRobotsTxt?: boolean } })
    .preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

export const resolveApprovalStepId = (planState?: Record<string, unknown> | null): string | null => {
  if (!planState || typeof planState !== "object") return null;
  const approval: string | null | undefined = (planState as { approvalRequestedStepId?: string | null })
    .approvalRequestedStepId;
  return typeof approval === "string" ? approval : null;
};

export const buildAgentResultMessage = (
  audits: AgentAuditLog[],
  status: string | null
): string | null => {
  const taskType: unknown = audits
    .map((audit: AgentAuditLog): unknown => audit.metadata)
    .find(
      (metadata: unknown): boolean =>
        !!metadata &&
        typeof (metadata as { plannerMeta?: { taskType?: string } }).plannerMeta
          ?.taskType === "string"
    );
  const resolvedTaskType: string | null = 
    (taskType as { plannerMeta?: { taskType?: string } })?.plannerMeta
      ?.taskType ?? null;
  const extractionAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean =>
      Array.isArray(audit.metadata?.items) ||
      Array.isArray(audit.metadata?.names)
  );
  if (extractionAudit) {
    const extractionItems: unknown[] = Array.isArray(extractionAudit.metadata?.items) 
      ? (extractionAudit.metadata.items as unknown[])
      : Array.isArray(extractionAudit.metadata?.names)
        ? (extractionAudit.metadata.names as unknown[])
        : [];
    const items: string[] = extractionItems
      .filter((name: unknown): name is string => typeof name === "string")
      .map((name: string): string => name.trim())
      .filter(Boolean);
    if (items.length > 0) {
      const url: string | null = 
        typeof extractionAudit.metadata?.url === "string"
          ? extractionAudit.metadata.url
          : null;
      const extractionType: string | null = 
        typeof extractionAudit.metadata?.extractionType === "string"
          ? extractionAudit.metadata.extractionType
          : null;
      const label: string = 
        extractionType === "emails"
          ? "Extracted emails"
          : extractionType === "product_names"
            ? "Extracted product names"
            : "Extracted information";
      const intro: string = url ? `${label} found on ${url}:` : `${label}:`;
      return `${intro}\n${items.map((name: string): string => `- ${name}`).join("\n")}`;
    }
  }
  const emptyAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean =>
      audit.message === "No product names extracted."
  );
  if (emptyAudit) {
    const url: string | null = 
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

export const buildAgentResumeSummaryMessage = (audits: AgentAuditLog[]): string | null => {
  const resumeAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean =>
      audit.message === "Resume summary prepared."
  );
  const autoResumeAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean => audit.message === "Auto-resume queued for stuck run."
  );
  if (!resumeAudit) {
    if (!autoResumeAudit) return null;
    const timestamp: string | null = autoResumeAudit.createdAt
      ? new Date(autoResumeAudit.createdAt).toLocaleString()
      : null;
    return `Auto-resume queued for stuck run${timestamp ? ` (${timestamp})` : ""}.`;
  }
  const summary: string = 
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
    .filter((audit: AgentAuditLog): boolean =>
      /tool|playwright|snapshot|selector|extraction|login|search|navigation/i.test(
        audit.message
      )
    )
    .map((audit: AgentAuditLog): TimelineEntry => ({
      id: `audit-${audit.id}`,
      source: "audit" as const,
      level: null,
      message: audit.message,
      createdAt: audit.createdAt,
    }));
  const logEntries: TimelineEntry[] = logs.map((log: AgentBrowserLog): TimelineEntry => ({
    id: `browser-${log.id}`,
    source: "browser" as const,
    level: log.level,
    message: log.message,
    createdAt: log.createdAt,
  }));
  return [...auditEntries, ...logEntries].sort(
    (a: TimelineEntry, b: TimelineEntry): number => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const formatDependencies = (dependsOn?: string[] | null): string | null => {
  if (!dependsOn || dependsOn.length === 0) return null;
  const readable: string[] = dependsOn.map((item: string): string => {
    const match: RegExpMatchArray | null = item.match(/^step-(\d+)$/);
    if (!match) return item;
    const index: number = Number(match[1]);
    if (!Number.isFinite(index)) return item;
    return `#${index + 1}`;
  });
  return readable.join(", ");
};

export const getSelfCheckAudits = (audits: AgentAuditLog[]): AgentAuditLog[] =>
  audits.filter(
    (audit: AgentAuditLog): boolean =>
      audit.message === "Self-check completed."
  );

export const getAuditList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string): string => item.trim())
        .filter(Boolean)
    : [];

export const formatAdaptiveReason = (reason?: string | null): string => {
  if (!reason) return "unspecified";
  const trimmed: string = reason.trim();
  if (!trimmed) return "unspecified";
  if (trimmed.includes(" ")) return trimmed;
  return trimmed.replace(/-/g, " ");
};

export const getLatestAdaptiveTrigger = (audits: AgentAuditLog[]): { 
  id: string;
  createdAt: string;
  reason: string | null;
  label: string;
} | null => {
  const candidates: Array<{ 
    id: string;
    createdAt: string;
    reason: string | null;
    label: string;
  }> = audits
    .map((audit: AgentAuditLog): {
      id: string;
      createdAt: string;
      reason: string | null;
      label: string;
    } | null => {
      const metadata: {
        type?: string;
        reason?: string | null;
      } | null = audit.metadata as {
        type?: string;
        reason?: string | null;
      } | null;
      const type: string | undefined = metadata?.type;
      if (
        type !== "plan-replan" &&
        type !== "plan-adapt" &&
        type !== "self-check-replan"
      ) {
        return null;
      }
      const label: string = 
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
    .filter((item: {
      id: string;
      createdAt: string;
      reason: string | null;
      label: string;
    } | null): item is {
      id: string;
      createdAt: string;
      reason: string | null;
      label: string;
    } => !!item);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest: {
    id: string;
    createdAt: string;
    reason: string | null;
    label: string;
  }, current: {
    id: string;
    createdAt: string;
    reason: string | null;
    label: string;
  }): {
    id: string;
    createdAt: string;
    reason: string | null;
    label: string;
  } => {
    const latestTime: number = Date.parse(latest.createdAt);
    const currentTime: number = Date.parse(current.createdAt);
    return currentTime > latestTime ? current : latest;
  }, candidates[0]!);
};

export const getLatestAuditByType = (
  audits: AgentAuditLog[],
  type: string
): AgentAuditLog | null => {
  const filtered: AgentAuditLog[] = audits.filter((audit: AgentAuditLog): boolean => audit.metadata?.type === type);
  return filtered.length ? filtered[filtered.length - 1]! : null;
};

export const isAbortError = (error: unknown): boolean =>
  (error instanceof Error && error.name === "AbortError") ||
  (typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError");