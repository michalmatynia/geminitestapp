"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import ModalShell from "@/components/ui/modal-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatbotDebugState = {
  lastRequest?: {
    model: string;
    tools: string[];
    messageCount: number;
    hasLocalContext: boolean;
    hasGlobalContext: boolean;
    localContextMode: "override" | "append";
    attachmentCount: number;
    searchUsed: boolean;
    searchProvider?: string;
    agentBrowser?: string;
    agentRunHeadless?: boolean;
    ignoreRobotsTxt?: boolean;
    requireHumanApproval?: boolean;
    agentPlanSettings?: {
      maxSteps: number;
      maxStepAttempts: number;
      maxReplanCalls: number;
      replanEverySteps: number;
      maxSelfChecks: number;
    };
  };
  lastResponse?: {
    ok: boolean;
    durationMs: number;
    error?: string;
    errorId?: string;
  };
};

type AgentSnapshot = {
  id: string;
  url: string;
  title: string | null;
  domText: string;
  screenshotData: string | null;
  screenshotPath: string | null;
  mouseX: number | null;
  mouseY: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  createdAt: string;
};

type AgentAuditLog = {
  id: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type AgentBrowserLog = {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type TimelineEntry = {
  id: string;
  source: "audit" | "browser";
  level?: string | null;
  message: string;
  createdAt: string;
};

type AgentPlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  snapshotId?: string | null;
  logCount?: number | null;
  dependsOn?: string[] | null;
  phase?: string | null;
  priority?: number | null;
};

type ExtractionPlan = {
  target?: string | null;
  fields?: string[];
  primarySelectors?: string[];
  fallbackSelectors?: string[];
  notes?: string | null;
};

type PlannerMeta = {
  critique?: {
    assumptions?: string[];
    risks?: string[];
    unknowns?: string[];
    safetyChecks?: string[];
    questions?: string[];
  };
  safetyChecks?: string[];
  questions?: string[];
  alternatives?: Array<{
    title: string;
    rationale?: string | null;
    steps?: Array<{ title?: string | null }>;
  }>;
};

type AgentSettingsPayload = {
  agentBrowser: string;
  runHeadless: boolean;
  ignoreRobotsTxt: boolean;
  requireHumanApproval: boolean;
  maxSteps: number;
  maxStepAttempts: number;
  maxReplanCalls: number;
  replanEverySteps: number;
  maxSelfChecks: number;
};

const AGENT_SETTINGS_KEY = "chatbot.agentSettings.v1";
const DEFAULT_AGENT_SETTINGS: AgentSettingsPayload = {
  agentBrowser: "chromium",
  runHeadless: true,
  ignoreRobotsTxt: false,
  requireHumanApproval: false,
  maxSteps: 12,
  maxStepAttempts: 2,
  maxReplanCalls: 2,
  replanEverySteps: 2,
  maxSelfChecks: 4,
};

const readErrorResponse = async (res: Response) => {
  try {
    const data = (await res.json()) as { error?: string; errorId?: string };
    return {
      message: data.error || "Request failed.",
      errorId: data.errorId,
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

const fetchWithTimeout = async (
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

const safeLocalStorageGet = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
};

const safeLocalStorageRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
};

const readCachedMessages = (sessionId: string) => {
  try {
    const raw = window.localStorage.getItem(`chatbotSessionCache:${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((message) => message && typeof message.content === "string");
  } catch {
    return [];
  }
};

const writeCachedMessages = (sessionId: string, messages: ChatMessage[]) => {
  try {
    const safeMessages = messages.filter(
      (message) => message.role !== "system" && message.content.trim().length > 0
    );
    window.localStorage.setItem(
      `chatbotSessionCache:${sessionId}`,
      JSON.stringify(safeMessages)
    );
  } catch {
    // ignore cache failures
  }
};

const resolveIgnoreRobots = (planState?: Record<string, unknown> | null) => {
  if (!planState || typeof planState !== "object") return false;
  const prefs = (planState as { preferences?: { ignoreRobotsTxt?: boolean } })
    .preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

const resolveApprovalStepId = (planState?: Record<string, unknown> | null) => {
  if (!planState || typeof planState !== "object") return null;
  const approval = (planState as { approvalRequestedStepId?: string | null })
    .approvalRequestedStepId;
  return typeof approval === "string" ? approval : null;
};

const buildAgentResultMessage = (
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
      const intro = url
        ? `${label} found on ${url}:`
        : `${label}:`;
      return `${intro}\n${items.map((name) => `- ${name}`).join("\n")}`;
    }
  }
  const emptyAudit = audits.find(
    (audit) =>
      audit.message === "No product names extracted." ||
      audit.message === "No emails extracted."
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

const buildAgentResumeSummaryMessage = (audits: AgentAuditLog[]) => {
  const resumeAudit = audits.find(
    (audit) =>
      audit.message === "Resume summary prepared." &&
      typeof audit.metadata?.summary === "string"
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

const buildToolTimeline = (
  logs: AgentBrowserLog[],
  audits: AgentAuditLog[]
) => {
  const auditEntries: TimelineEntry[] = audits
    .filter((audit) =>
      /tool|playwright|snapshot|selector|extraction|login|search|navigation/i.test(
        audit.message
      )
    )
    .map((audit) => ({
      id: `audit-${audit.id}`,
      source: "audit",
      level: null,
      message: audit.message,
      createdAt: audit.createdAt,
    }));
  const logEntries: TimelineEntry[] = logs.map((log) => ({
    id: `browser-${log.id}`,
    source: "browser",
    level: log.level,
    message: log.message,
    createdAt: log.createdAt,
  }));
  return [...auditEntries, ...logEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const formatDependencies = (dependsOn?: string[] | null) => {
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

const renderExtractionPlan = (plan: ExtractionPlan) => (
  <div className="rounded-md border border-gray-800 bg-gray-950 p-2 text-[10px] text-gray-300">
    <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
      <span>Target:</span>
      <span className="text-gray-200">{plan.target || "unknown"}</span>
    </div>
    {plan.fields?.length ? (
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Fields</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {plan.fields.map((field) => (
            <span
              key={field}
              className="rounded-full border border-gray-800 bg-gray-900 px-2 py-[1px]"
            >
              {field}
            </span>
          ))}
        </div>
      </div>
    ) : null}
    {plan.primarySelectors?.length ? (
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">
          Primary selectors
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {plan.primarySelectors.map((selector) => (
            <li key={selector}>{selector}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {plan.fallbackSelectors?.length ? (
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">
          Fallback selectors
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {plan.fallbackSelectors.map((selector) => (
            <li key={selector}>{selector}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {plan.notes ? (
      <p className="mt-2 text-gray-400">{plan.notes}</p>
    ) : null}
  </div>
);

const getSelfCheckAudits = (audits: AgentAuditLog[]) =>
  audits.filter(
    (audit) =>
      audit.message === "Self-check completed." ||
      audit.metadata?.type === "self-check"
  );

const getAuditList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const formatAdaptiveReason = (reason?: string | null) => {
  if (!reason) return "unspecified";
  const trimmed = reason.trim();
  if (!trimmed) return "unspecified";
  if (trimmed.includes(" ")) return trimmed;
  return trimmed.replace(/-/g, " ");
};

const getLatestAdaptiveTrigger = (audits: AgentAuditLog[]) => {
  const candidates = audits
    .map((audit) => {
      const metadata = audit.metadata as
        | { type?: string; reason?: string | null }
        | null;
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

const getLatestAuditByType = (
  audits: AgentAuditLog[],
  type: string
): AgentAuditLog | null => {
  const filtered = audits.filter((audit) => audit.metadata?.type === type);
  return filtered.length ? filtered[filtered.length - 1] : null;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const persistSessionMessage = async (
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

const renderInline = (text: string) => {
  const parts = text.split("**");
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>
  );
};

const renderFormattedMessage = (content: string) => {
  const lines = content.split("\n");
  const blocks: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={`${key}-item-${index}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${index}`);
      blocks.push(<div key={`spacer-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList(`list-${index}`);
      blocks.push(
        <h3 key={`h3-${index}`} className="text-sm font-semibold text-white">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList(`list-${index}`);
      blocks.push(
        <h2 key={`h2-${index}`} className="text-base font-semibold text-white">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList(`list-${index}`);
      blocks.push(
        <h1 key={`h1-${index}`} className="text-lg font-semibold text-white">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList(`list-${index}`);
    blocks.push(
      <p key={`p-${index}`} className="leading-relaxed text-slate-100">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList("list-final");
  return <div className="space-y-2">{blocks}</div>;
};

export default function ChatbotPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [model, setModel] = useState("llama3");
  const [modelLoading, setModelLoading] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [useGlobalContext, setUseGlobalContext] = useState(false);
  const [useLocalContext, setUseLocalContext] = useState(false);
  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState("serpapi");
  const [agentBrowser, setAgentBrowser] = useState("chromium");
  const [agentRunHeadless, setAgentRunHeadless] = useState(true);
  const [agentIgnoreRobotsTxt, setAgentIgnoreRobotsTxt] = useState(false);
  const [agentRequireHumanApproval, setAgentRequireHumanApproval] = useState(false);
  const [agentMaxSteps, setAgentMaxSteps] = useState(12);
  const [agentMaxStepAttempts, setAgentMaxStepAttempts] = useState(2);
  const [agentMaxReplanCalls, setAgentMaxReplanCalls] = useState(2);
  const [agentReplanEverySteps, setAgentReplanEverySteps] = useState(2);
  const [agentMaxSelfChecks, setAgentMaxSelfChecks] = useState(4);
  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [latestAgentRunStatus, setLatestAgentRunStatus] = useState<string | null>(
    null
  );
  const [agentPreviewSnapshot, setAgentPreviewSnapshot] =
    useState<AgentSnapshot | null>(null);
  const [agentPreviewStatus, setAgentPreviewStatus] = useState<
    "idle" | "connecting" | "live" | "error"
  >("idle");
  const [highlightedSnapshotId, setHighlightedSnapshotId] = useState<
    string | null
  >(null);
  const [latestAgentIgnoreRobots, setLatestAgentIgnoreRobots] = useState(false);
  const [latestApprovalStepId, setLatestApprovalStepId] = useState<string | null>(
    null
  );
  const [agentControlUrl, setAgentControlUrl] = useState("");
  const [agentControlBusy, setAgentControlBusy] = useState(false);
  const [agentResumeBusy, setAgentResumeBusy] = useState(false);
  const [agentProgressOpen, setAgentProgressOpen] = useState(false);
  const [agentPlanSteps, setAgentPlanSteps] = useState<AgentPlanStep[]>([]);
  const [agentPlanMeta, setAgentPlanMeta] = useState<PlannerMeta | null>(null);
  const [agentStepActionBusyId, setAgentStepActionBusyId] = useState<string | null>(
    null
  );
  const [stepDetailsOpen, setStepDetailsOpen] = useState(false);
  const [stepDetailsLoading, setStepDetailsLoading] = useState(false);
  const [stepDetailsTitle, setStepDetailsTitle] = useState("");
  const [stepDetailsSnapshot, setStepDetailsSnapshot] =
    useState<AgentSnapshot | null>(null);
  const [stepDetailsLogs, setStepDetailsLogs] = useState<AgentBrowserLog[]>([]);
  const [snapshotLightboxOpen, setSnapshotLightboxOpen] = useState(false);
  const [snapshotLightbox, setSnapshotLightbox] = useState<AgentSnapshot | null>(
    null
  );
  const [agentRunDetailsOpen, setAgentRunDetailsOpen] = useState(false);
  const [agentRunDetailsLoading, setAgentRunDetailsLoading] = useState(false);
  const [agentRunDetails, setAgentRunDetails] = useState<{
    id: string;
    prompt: string;
    model?: string | null;
    status?: string | null;
    requiresHumanIntervention?: boolean | null;
    recordingPath?: string | null;
    planState?: Record<string, unknown> | null;
  } | null>(null);
  const [agentRunLogs, setAgentRunLogs] = useState<AgentBrowserLog[]>([]);
  const [agentRunAudits, setAgentRunAudits] = useState<AgentAuditLog[]>([]);
  const [resumeStepId, setResumeStepId] = useState<string>("");
  const [expandedRunAuditIds, setExpandedRunAuditIds] = useState<
    Record<string, boolean>
  >({});
  const [toolSelectValue, setToolSelectValue] = useState("add");
  const [globalContext, setGlobalContext] = useState("");
  const [localContext, setLocalContext] = useState("");
  const [localContextMode, setLocalContextMode] = useState<"override" | "append">(
    "override"
  );
  const [contextLoading, setContextLoading] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const initStartedRef = useRef(false);
  const agentSettingsLoadedRef = useRef(false);
  const agentSettingsSaveRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const agentResultSentRef = useRef<Set<string>>(new Set());
  const agentResumeSummarySentRef = useRef<Set<string>>(new Set());
  const [pollingReply, setPollingReply] = useState(false);
  const sessionReady = Boolean(sessionId) && !initError;
  const selfCheckAudits = useMemo(
    () => getSelfCheckAudits(agentRunAudits),
    [agentRunAudits]
  );
  const branchAudits = useMemo(
    () => agentRunAudits.filter((audit) => audit.metadata?.type === "plan-branch"),
    [agentRunAudits]
  );
  const selfImprovementAudits = useMemo(
    () =>
      agentRunAudits.filter(
        (audit) =>
          audit.metadata?.type === "self-improvement" ||
          audit.message === "Self-improvement review completed."
      ),
    [agentRunAudits]
  );
  const latestPlannerContext = useMemo(
    () => getLatestAuditByType(agentRunAudits, "planner-context"),
    [agentRunAudits]
  );
  const latestLoopGuard = useMemo(
    () => getLatestAuditByType(agentRunAudits, "loop-guard"),
    [agentRunAudits]
  );
  const latestSelfImprovementContext = useMemo(
    () => getLatestAuditByType(agentRunAudits, "self-improvement-context"),
    [agentRunAudits]
  );
  const latestSelfImprovementPlaybook = useMemo(
    () => getLatestAuditByType(agentRunAudits, "self-improvement-playbook"),
    [agentRunAudits]
  );
  const latestPlanReplan = useMemo(
    () => getLatestAuditByType(agentRunAudits, "plan-replan"),
    [agentRunAudits]
  );
  const latestPlanAdapt = useMemo(
    () => getLatestAuditByType(agentRunAudits, "plan-adapt"),
    [agentRunAudits]
  );
  const latestSelfCheckReplan = useMemo(
    () => getLatestAuditByType(agentRunAudits, "self-check-replan"),
    [agentRunAudits]
  );
  const latestAdaptiveTrigger = useMemo(
    () => getLatestAdaptiveTrigger(agentRunAudits),
    [agentRunAudits]
  );
  const sessionContextLogs = useMemo(
    () => agentRunLogs.filter((log) => log.message === "Captured session context."),
    [agentRunLogs]
  );
  const loginCandidateLogs = useMemo(
    () => agentRunLogs.filter((log) => log.message === "Inferred login candidates."),
    [agentRunLogs]
  );
  const uiInventoryLogs = useMemo(
    () => agentRunLogs.filter((log) => log.message === "Captured UI inventory."),
    [agentRunLogs]
  );
  const latestSessionContext = sessionContextLogs.at(-1)?.metadata ?? null;
  const latestLoginCandidates = loginCandidateLogs.at(-1)?.metadata ?? null;
  const latestUiInventory = uiInventoryLogs.at(-1)?.metadata ?? null;
  const toolTimeline = useMemo(
    () => buildToolTimeline(agentRunLogs, agentRunAudits),
    [agentRunLogs, agentRunAudits]
  );
  const currentPlanStep =
    agentPlanSteps.find((step) => step.status === "running") ??
    agentPlanSteps.find((step) => step.status === "pending") ??
    null;
  const robotsStatus = useMemo(() => {
    if (agentRunLogs.length === 0) return null;
    if (agentRunLogs.some((log) => log.message === "Blocked by robots.txt.")) {
      return "Blocked by robots.txt";
    }
    if (
      agentRunLogs.some((log) => log.message === "Robots.txt unavailable; proceeding.")
    ) {
      return "Robots.txt unavailable";
    }
    return "Allowed or not checked";
  }, [agentRunLogs]);
  const clampAgentSetting = (
    value: number,
    min: number,
    max: number,
    fallback: number
  ) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), min), max);
  };
  const readAgentSettings = (raw: unknown): AgentSettingsPayload => {
    if (!raw || typeof raw !== "object") return DEFAULT_AGENT_SETTINGS;
    const settings = raw as Partial<AgentSettingsPayload>;
    const browser =
      settings.agentBrowser === "firefox" ||
      settings.agentBrowser === "webkit" ||
      settings.agentBrowser === "chromium"
        ? settings.agentBrowser
        : DEFAULT_AGENT_SETTINGS.agentBrowser;
    return {
      agentBrowser: browser,
      runHeadless:
        typeof settings.runHeadless === "boolean"
          ? settings.runHeadless
          : DEFAULT_AGENT_SETTINGS.runHeadless,
      ignoreRobotsTxt:
        typeof settings.ignoreRobotsTxt === "boolean"
          ? settings.ignoreRobotsTxt
          : DEFAULT_AGENT_SETTINGS.ignoreRobotsTxt,
      requireHumanApproval:
        typeof settings.requireHumanApproval === "boolean"
          ? settings.requireHumanApproval
          : DEFAULT_AGENT_SETTINGS.requireHumanApproval,
      maxSteps: clampAgentSetting(
        Number(settings.maxSteps),
        1,
        20,
        DEFAULT_AGENT_SETTINGS.maxSteps
      ),
      maxStepAttempts: clampAgentSetting(
        Number(settings.maxStepAttempts),
        1,
        5,
        DEFAULT_AGENT_SETTINGS.maxStepAttempts
      ),
      maxReplanCalls: clampAgentSetting(
        Number(settings.maxReplanCalls),
        0,
        6,
        DEFAULT_AGENT_SETTINGS.maxReplanCalls
      ),
      replanEverySteps: clampAgentSetting(
        Number(settings.replanEverySteps),
        1,
        10,
        DEFAULT_AGENT_SETTINGS.replanEverySteps
      ),
      maxSelfChecks: clampAgentSetting(
        Number(settings.maxSelfChecks),
        0,
        8,
        DEFAULT_AGENT_SETTINGS.maxSelfChecks
      ),
    };
  };
  const buildAgentSettingsPayload = (): AgentSettingsPayload => ({
    agentBrowser,
    runHeadless: agentRunHeadless,
    ignoreRobotsTxt: agentIgnoreRobotsTxt,
    requireHumanApproval: agentRequireHumanApproval,
    maxSteps: clampAgentSetting(agentMaxSteps, 1, 20, DEFAULT_AGENT_SETTINGS.maxSteps),
    maxStepAttempts: clampAgentSetting(
      agentMaxStepAttempts,
      1,
      5,
      DEFAULT_AGENT_SETTINGS.maxStepAttempts
    ),
    maxReplanCalls: clampAgentSetting(
      agentMaxReplanCalls,
      0,
      6,
      DEFAULT_AGENT_SETTINGS.maxReplanCalls
    ),
    replanEverySteps: clampAgentSetting(
      agentReplanEverySteps,
      1,
      10,
      DEFAULT_AGENT_SETTINGS.replanEverySteps
    ),
    maxSelfChecks: clampAgentSetting(
      agentMaxSelfChecks,
      0,
      8,
      DEFAULT_AGENT_SETTINGS.maxSelfChecks
    ),
  });

  const fetchMessagesForSession = useCallback(async (activeSessionId: string) => {
    const res = await fetchWithTimeout(
      `/api/chatbot/sessions/${activeSessionId}/messages`,
      {},
      15000
    );
    if (!res.ok) {
      const error = await readErrorResponse(res);
      const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
      throw new Error(`${error.message}${suffix}`);
    }
    const data = (await res.json()) as {
      messages: Array<{ role: ChatMessage["role"]; content: string }>;
    };
    return data.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      setModelLoading(true);
      try {
        const res = await fetchWithTimeout("/api/chatbot");
        if (!res.ok) {
          const error = (await res.json()) as { error?: string; errorId?: string };
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          throw new Error(`${error.error || "Failed to load models."}${suffix}`);
        }
        const data = (await res.json()) as { models?: string[] };
        const models = (data.models || []).filter(Boolean);
        if (!isMounted) return;
        setModelOptions(models);
        if (models.length > 0 && !models.includes(model)) {
          setModel(models[0]);
        }
      } catch (error) {
        const message = isAbortError(error)
          ? "Loading models timed out."
          : error instanceof Error
            ? error.message
            : "Failed to load models.";
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          setModelLoading(false);
        }
      }
    };
    void loadModels();
    return () => {
      isMounted = false;
    };
  }, [model, toast]);

  useEffect(() => {
    let isMounted = true;
    const loadAgentSettings = async () => {
      try {
        const res = await fetchWithTimeout("/api/settings", {}, 12000);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const stored = data.find((item) => item.key === AGENT_SETTINGS_KEY);
        if (!stored?.value) {
          agentSettingsLoadedRef.current = true;
          return;
        }
        const parsed = JSON.parse(stored.value) as unknown;
        if (!isMounted) return;
        const next = readAgentSettings(parsed);
        setAgentBrowser(next.agentBrowser);
        setAgentRunHeadless(next.runHeadless);
        setAgentIgnoreRobotsTxt(next.ignoreRobotsTxt);
        setAgentRequireHumanApproval(next.requireHumanApproval);
        setAgentMaxSteps(next.maxSteps);
        setAgentMaxStepAttempts(next.maxStepAttempts);
        setAgentMaxReplanCalls(next.maxReplanCalls);
        setAgentReplanEverySteps(next.replanEverySteps);
        setAgentMaxSelfChecks(next.maxSelfChecks);
        agentSettingsLoadedRef.current = true;
      } catch {
        agentSettingsLoadedRef.current = true;
      }
    };
    void loadAgentSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!agentSettingsLoadedRef.current) return;
    if (agentSettingsSaveRef.current) {
      clearTimeout(agentSettingsSaveRef.current);
    }
    agentSettingsSaveRef.current = setTimeout(async () => {
      try {
        const payload = buildAgentSettingsPayload();
        await fetchWithTimeout(
          "/api/settings",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: AGENT_SETTINGS_KEY,
              value: JSON.stringify(payload),
            }),
          },
          12000
        );
      } catch {
        // ignore persistence failures
      }
    }, 600);
    return () => {
      if (agentSettingsSaveRef.current) {
        clearTimeout(agentSettingsSaveRef.current);
      }
    };
  }, [
    agentBrowser,
    agentRunHeadless,
    agentIgnoreRobotsTxt,
    agentRequireHumanApproval,
    agentMaxSteps,
    agentMaxStepAttempts,
    agentMaxReplanCalls,
    agentReplanEverySteps,
    agentMaxSelfChecks,
  ]);

  useEffect(() => {
    let isMounted = true;
    const loadContext = async () => {
      try {
        const res = await fetchWithTimeout(
          "/api/settings",
          { cache: "no-store" },
          12000
        );
        if (!res.ok) {
          const error = (await res.json()) as { error?: string };
          throw new Error(error.error || "Failed to load context.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const storedItems = data.find(
          (item) => item.key === "chatbot_global_context_items"
        );
        const storedActive = data.find(
          (item) => item.key === "chatbot_global_context_active"
        );
        const storedLegacy = data.find(
          (item) => item.key === "chatbot_global_context"
        );
        if (isMounted) {
          let merged = "";
          if (storedItems?.value) {
            try {
              const items = JSON.parse(storedItems.value) as Array<{
                id: string;
                content: string;
              }>;
              const active =
                storedActive?.value
                  ? (JSON.parse(storedActive.value) as string[])
                  : items.map((item) => item.id);
              const activeSet = new Set(active);
              merged = items
                .filter((item) => activeSet.has(item.id))
                .map((item) => item.content)
                .filter(Boolean)
                .join("\n\n");
            } catch {
              merged = "";
            }
          }
          if (!merged) {
            merged = storedLegacy?.value || "";
          }
          setGlobalContext(merged);
        }
      } catch (error) {
        const message = isAbortError(error)
          ? "Loading context timed out."
          : error instanceof Error
            ? error.message
            : "Failed to load context.";
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          setContextLoading(false);
        }
      }
    };
    void loadContext();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      try {
        if (initStartedRef.current) {
          return;
        }
        initStartedRef.current = true;
        if (isMounted) {
          setSessionLoading(true);
          setInitError(null);
        }
        const sessionParam = searchParams.get("session");
        const stored = safeLocalStorageGet("chatbotSessionId");
        let activeSessionId = sessionParam || stored;

        const fetchMessages = async (sessionId: string) => {
          if (isMounted) {
            setMessagesLoading(true);
          }
          const res = await fetchWithTimeout(
            `/api/chatbot/sessions/${sessionId}/messages`,
            {},
            15000
          );
          if (!res.ok) {
            const error = await readErrorResponse(res);
            const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
            const message = `Failed to load chat history.${suffix}`;
            const err = new Error(message) as Error & { status?: number };
            err.status = res.status;
            throw err;
          }
          const data = (await res.json()) as {
            messages: Array<{ role: ChatMessage["role"]; content: string }>;
          };
          const loaded = data.messages.map((message) => ({
            role: message.role,
            content: message.content,
          }));
          if (isMounted) {
            setMessages(loaded);
            setMessagesLoading(false);
          }
          return loaded;
        };

        const createSession = async () => {
          const res = await fetchWithTimeout(
            "/api/chatbot/sessions",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
            12000
          );
          if (!res.ok) {
            const error = await readErrorResponse(res);
            const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
            throw new Error(`Failed to create chat session.${suffix}`);
          }
          const data = (await res.json()) as { sessionId: string };
          return data.sessionId;
        };

        if (!activeSessionId) {
          try {
            const listRes = await fetchWithTimeout(
              "/api/chatbot/sessions",
              {},
              12000
            );
            if (listRes.ok) {
              const listData = (await listRes.json()) as {
                sessions?: Array<{ id: string }>;
              };
              activeSessionId = listData.sessions?.[0]?.id || null;
            }
          } catch {
            // fall back to creating a session
          }
        }

        if (activeSessionId) {
          try {
            if (isMounted) {
              setSessionId(activeSessionId);
              safeLocalStorageSet("chatbotSessionId", activeSessionId);
              setSessionLoading(false);
              const cached = readCachedMessages(activeSessionId);
              if (cached.length > 0) {
                setMessages(cached);
              }
            }
            const loaded = await fetchMessages(activeSessionId);
            if (!isMounted) return;
            if (loaded.length === 0) {
              const cached = readCachedMessages(activeSessionId);
              if (cached.length > 0) {
                setMessages(cached);
                for (const message of cached) {
                  try {
                    await persistSessionMessage(
                      activeSessionId,
                      message.role,
                      message.content
                    );
                  } catch (error) {
                    const messageText =
                      error instanceof Error
                        ? error.message
                        : "Failed to persist cached message.";
                    toast(messageText, { variant: "error" });
                    break;
                  }
                }
              }
            }
            return;
          } catch (error) {
            const status =
              error instanceof Error && "status" in error
                ? (error as Error & { status?: number }).status
                : undefined;
            if (status === 404 && stored === activeSessionId) {
              safeLocalStorageRemove("chatbotSessionId");
              activeSessionId = null;
            } else if (status === 404 && sessionParam === activeSessionId) {
              activeSessionId = null;
            } else {
              throw error;
            }
          }
        }

        activeSessionId = await createSession();
        if (!isMounted) return;
        setSessionId(activeSessionId);
        safeLocalStorageSet("chatbotSessionId", activeSessionId);
        toast("New chat session created", { variant: "success" });
        setSessionLoading(false);
        await fetchMessages(activeSessionId);
      } catch (error) {
        const message = isAbortError(error)
          ? "Loading chat session timed out."
          : error instanceof Error
            ? error.message
            : "Failed to load chat session.";
        setInitError(message);
        toast(message, { variant: "error" });
      } finally {
        if (isMounted) {
          initStartedRef.current = false;
          setSessionLoading(false);
          setMessagesLoading(false);
        }
      }
    };
    void initSession();
    return () => {
      isMounted = false;
    };
  }, [searchParams, toast]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    writeCachedMessages(sessionId, messages);
  }, [messages, sessionId]);

  useEffect(() => {
    if (!sessionId || latestAgentRunId) return;
    const stored = safeLocalStorageGet(`chatbotLatestAgentRunId:${sessionId}`);
    if (stored) {
      setLatestAgentRunId(stored);
    }
  }, [sessionId, latestAgentRunId]);

  useEffect(() => {
    if (!pollingReply || !sessionId) return;
    if (pollingRef.current) return;
    const startCount = messages.length;
    pollingRef.current = setInterval(async () => {
      try {
        const loaded = await fetchMessagesForSession(sessionId);
        setMessages(loaded);
        const lastMessage = loaded[loaded.length - 1];
        if (loaded.length > startCount && lastMessage?.role === "assistant") {
          setPollingReply(false);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh messages.";
        toast(message, { variant: "error" });
        setPollingReply(false);
      }
    }, 2000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingReply, sessionId, messages.length, toast, fetchMessagesForSession]);

  useEffect(() => {
    if (!latestAgentRunId) return;
    let isMounted = true;
    let isTerminal = false;
    const pollStatus = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/chatbot/agent/${latestAgentRunId}`,
          {},
          12000
        );
        if (!res.ok) {
          throw new Error("Failed to load agent run status.");
        }
        const data = (await res.json()) as {
          run?: { status?: string; planState?: Record<string, unknown> | null };
        };
        if (isMounted) {
          const nextStatus = data.run?.status ?? null;
          setLatestAgentRunStatus(nextStatus);
          setLatestAgentIgnoreRobots(
            resolveIgnoreRobots(data.run?.planState ?? null)
          );
          setLatestApprovalStepId(
            resolveApprovalStepId(data.run?.planState ?? null)
          );
          if (
            nextStatus &&
            ["completed", "failed", "stopped", "waiting_human"].includes(
              nextStatus
            )
          ) {
            isTerminal = true;
          }
        }
      } catch {
        if (isMounted) {
          setLatestAgentRunStatus("unknown");
        }
      }
    };
    void pollStatus();
    const timer = setInterval(() => {
      if (isTerminal) {
        clearInterval(timer);
        return;
      }
      void pollStatus();
    }, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [latestAgentRunId]);

  const refreshAgentRunDetails = useCallback(
    async (runId: string) => {
      setAgentRunDetailsLoading(true);
      try {
        const [runRes, logsRes, auditsRes] = await Promise.all([
          fetchWithTimeout(`/api/chatbot/agent/${runId}`, {}, 12000),
          fetchWithTimeout(`/api/chatbot/agent/${runId}/logs`, {}, 12000),
          fetchWithTimeout(`/api/chatbot/agent/${runId}/audits`, {}, 12000),
        ]);
        if (!runRes.ok) {
          const error = await readErrorResponse(runRes);
          throw new Error(error.message);
        }
        if (!logsRes.ok) {
          throw new Error("Failed to load agent logs.");
        }
        if (!auditsRes.ok) {
          throw new Error("Failed to load agent steps.");
        }
        const runData = (await runRes.json()) as { run?: typeof agentRunDetails };
        const logsData = (await logsRes.json()) as { logs?: AgentBrowserLog[] };
        const auditsData = (await auditsRes.json()) as { audits?: AgentAuditLog[] };
        if (runData.run) {
          setAgentRunDetails(runData.run);
        }
        const audits = auditsData.audits ?? [];
        setAgentRunLogs(logsData.logs ?? []);
        setAgentRunAudits(audits);
        if (runData.run) {
          const storedFlag = safeLocalStorageGet(
            `chatbotAgentResultSent:${runData.run.id}`
          );
          if (
            !agentResultSentRef.current.has(runData.run.id) &&
            storedFlag !== "true"
          ) {
            const message = buildAgentResultMessage(
              audits,
              runData.run.status ?? null
            );
            if (message) {
              setMessages((prev) => [...prev, { role: "assistant", content: message }]);
              if (sessionId) {
                await persistSessionMessage(sessionId, "assistant", message);
              }
              agentResultSentRef.current.add(runData.run.id);
              safeLocalStorageSet(`chatbotAgentResultSent:${runData.run.id}`, "true");
            }
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load agent run.";
        toast(message, { variant: "error" });
      } finally {
        setAgentRunDetailsLoading(false);
      }
    },
    [sessionId, toast]
  );

  useEffect(() => {
    if (!latestAgentRunId || !latestAgentRunStatus) return;
    const runId = latestAgentRunId;
    const storedFlag = safeLocalStorageGet(`chatbotAgentResultSent:${runId}`);
    if (agentResultSentRef.current.has(runId) || storedFlag === "true") {
      return;
    }
    if (!["completed", "failed", "waiting_human"].includes(latestAgentRunStatus)) {
      return;
    }
    let isMounted = true;
    const publishResult = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/chatbot/agent/${runId}/audits`,
          {},
          12000
        );
        if (!res.ok) return;
        const data = (await res.json()) as { audits?: AgentAuditLog[] };
        const message = buildAgentResultMessage(
          data.audits ?? [],
          latestAgentRunStatus
        );
        if (!message) return;
        if (!isMounted) return;
        setMessages((prev) => [...prev, { role: "assistant", content: message }]);
        if (sessionId) {
          await persistSessionMessage(sessionId, "assistant", message);
        }
        agentResultSentRef.current.add(runId);
        safeLocalStorageSet(`chatbotAgentResultSent:${runId}`, "true");
      } catch (error) {
        if (error instanceof Error) {
          toast(error.message, { variant: "error" });
        }
      }
    };
    void publishResult();
    return () => {
      isMounted = false;
    };
  }, [latestAgentRunId, latestAgentRunStatus, sessionId, toast]);

  useEffect(() => {
    if (!latestAgentRunId) return;
    const runId = latestAgentRunId;
    let isMounted = true;
    let stopPolling = false;
    const pollAudits = async () => {
      if (stopPolling) return;
      if (
        latestAgentRunStatus &&
        ["completed", "failed", "stopped", "waiting_human"].includes(
          latestAgentRunStatus
        )
      ) {
        stopPolling = true;
        return;
      }
      const storedFlag = safeLocalStorageGet(`chatbotAgentResultSent:${runId}`);
      if (agentResultSentRef.current.has(runId) || storedFlag === "true") {
        stopPolling = true;
        return;
      }
      try {
        const res = await fetchWithTimeout(
          `/api/chatbot/agent/${runId}/audits`,
          {},
          12000
        );
        if (!res.ok) return;
        const data = (await res.json()) as { audits?: AgentAuditLog[] };
        const message = buildAgentResultMessage(
          data.audits ?? [],
          latestAgentRunStatus ?? null
        );
        if (!message || !isMounted) return;
        setMessages((prev) => [...prev, { role: "assistant", content: message }]);
        if (sessionId) {
          await persistSessionMessage(sessionId, "assistant", message);
        }
        agentResultSentRef.current.add(runId);
        safeLocalStorageSet(`chatbotAgentResultSent:${runId}`, "true");
        stopPolling = true;
      } catch (error) {
        if (error instanceof Error) {
          toast(error.message, { variant: "error" });
        }
      }
    };
    void pollAudits();
    const timer = setInterval(pollAudits, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [latestAgentRunId, sessionId, toast]);

  useEffect(() => {
    if (!latestAgentRunId || !latestAgentRunStatus) return;
    const runId = latestAgentRunId;
    const storedFlag = safeLocalStorageGet(
      `chatbotAgentResumeSummarySent:${runId}`
    );
    if (agentResumeSummarySentRef.current.has(runId) || storedFlag === "true") {
      return;
    }
    let isMounted = true;
    const publishSummary = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/chatbot/agent/${runId}/audits`,
          {},
          12000
        );
        if (!res.ok) return;
        const data = (await res.json()) as { audits?: AgentAuditLog[] };
        const message = buildAgentResumeSummaryMessage(data.audits ?? []);
        if (!message) return;
        if (!isMounted) return;
        setMessages((prev) => [...prev, { role: "assistant", content: message }]);
        if (sessionId) {
          await persistSessionMessage(sessionId, "assistant", message);
        }
        agentResumeSummarySentRef.current.add(runId);
        safeLocalStorageSet(`chatbotAgentResumeSummarySent:${runId}`, "true");
      } catch (error) {
        if (error instanceof Error) {
          toast(error.message, { variant: "error" });
        }
      }
    };
    void publishSummary();
    return () => {
      isMounted = false;
    };
  }, [latestAgentRunId, latestAgentRunStatus, sessionId, toast]);

  useEffect(() => {
    if (!latestAgentRunId) {
      setAgentPreviewSnapshot(null);
      setAgentPreviewStatus("idle");
      setAgentPlanSteps([]);
      setAgentPlanMeta(null);
      return;
    }
    setAgentPreviewStatus("connecting");
    const source = new EventSource(
      `/api/chatbot/agent/${latestAgentRunId}/stream`
    );
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          snapshot?: AgentSnapshot | null;
        };
        if (payload.snapshot) {
          setAgentPreviewSnapshot(payload.snapshot);
          setAgentPreviewStatus("live");
          setAgentControlUrl((prev) =>
            prev ? prev : payload.snapshot.url || ""
          );
        }
      } catch {
        setAgentPreviewStatus("error");
      }
    };
    source.onerror = () => {
      setAgentPreviewStatus("error");
    };
    return () => {
      source.close();
    };
  }, [latestAgentRunId]);

  useEffect(() => {
    if (!latestAgentRunId) return;
    let isMounted = true;
    const loadPlan = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/chatbot/agent/${latestAgentRunId}/audits`,
          {},
          12000
        );
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { audits?: AgentAuditLog[] };
        const planAudits = (data.audits ?? []).filter((audit) =>
          Array.isArray(audit.metadata?.steps)
        );
        const latestPlan = planAudits[0];
        const steps = Array.isArray(latestPlan?.metadata?.steps)
          ? (latestPlan?.metadata?.steps as AgentPlanStep[])
          : [];
        const plannerMeta = (latestPlan?.metadata as { plannerMeta?: PlannerMeta } | null)
          ?.plannerMeta;
        const normalizedSteps = steps.map((step, index) => ({
          ...step,
          id: step.id || `${latestAgentRunId}-${index}`,
        }));
        if (isMounted) {
          setAgentPlanSteps(normalizedSteps);
          setAgentPlanMeta(plannerMeta ?? null);
        }
      } catch {
        if (isMounted) {
          setAgentPlanSteps([]);
          setAgentPlanMeta(null);
        }
      }
    };
    void loadPlan();
    return () => {
      isMounted = false;
    };
  }, [latestAgentRunId]);

  useEffect(() => {
    if (!latestAgentRunId || !agentRunDetailsOpen) {
      setAgentRunLogs([]);
      setAgentRunAudits([]);
      setAgentRunDetails(null);
      return;
    }
    const loadDetails = async () => {
      if (!latestAgentRunId) return;
      await refreshAgentRunDetails(latestAgentRunId);
    };
    void loadDetails();
  }, [agentRunDetailsOpen, latestAgentRunId, refreshAgentRunDetails]);

  const runAgentControl = async (
    action: "goto" | "reload" | "snapshot",
    overrideUrl?: string
  ) => {
    if (!latestAgentRunId) {
      toast("No agent run available for control.", { variant: "error" });
      return;
    }
    if (action === "goto" && !overrideUrl?.trim()) {
      toast("Enter a URL to navigate.", { variant: "error" });
      return;
    }
    setAgentControlBusy(true);
    try {
      const res = await fetch(`/api/chatbot/agent/${latestAgentRunId}/controls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          url: overrideUrl?.trim(),
        }),
      });
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Control action failed.";
      toast(message, { variant: "error" });
    } finally {
      setAgentControlBusy(false);
    }
  };

  const resumeAgentRun = async (stepId?: string) => {
    if (!latestAgentRunId) {
      toast("No agent run available to resume.", { variant: "error" });
      return;
    }
    setAgentResumeBusy(true);
    try {
      const res = await fetch(`/api/chatbot/agent/${latestAgentRunId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resume",
          ...(stepId ? { stepId } : {}),
        }),
      });
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
      toast("Agent run queued for resume.", { variant: "success" });
      setAgentRunDetailsOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resume agent run.";
      toast(message, { variant: "error" });
    } finally {
      setAgentResumeBusy(false);
    }
  };

  const retryAgentStep = async (stepId: string) => {
    if (!latestAgentRunId) {
      toast("No agent run available for step retry.", { variant: "error" });
      return;
    }
    try {
      setAgentStepActionBusyId(stepId);
      const res = await fetch(`/api/chatbot/agent/${latestAgentRunId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_step", stepId }),
      });
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
      toast("Step retry queued.", { variant: "success" });
      await refreshAgentRunDetails(latestAgentRunId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retry step.";
      toast(message, { variant: "error" });
    } finally {
      setAgentStepActionBusyId(null);
    }
  };

  const overrideAgentStep = async (
    stepId: string,
    status: "completed" | "failed" | "pending"
  ) => {
    if (!latestAgentRunId) {
      toast("No agent run available for step override.", { variant: "error" });
      return;
    }
    try {
      setAgentStepActionBusyId(stepId);
      const res = await fetch(`/api/chatbot/agent/${latestAgentRunId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override_step", stepId, status }),
      });
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
      toast(`Step marked ${status}.`, { variant: "success" });
      await refreshAgentRunDetails(latestAgentRunId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to override step.";
      toast(message, { variant: "error" });
    } finally {
      setAgentStepActionBusyId(null);
    }
  };

  const approveAgentStep = async (stepId: string) => {
    if (!latestAgentRunId) {
      toast("No agent run available for approval.", { variant: "error" });
      return;
    }
    try {
      setAgentStepActionBusyId(stepId);
      const res = await fetch(`/api/chatbot/agent/${latestAgentRunId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_step", stepId }),
      });
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
      toast("Step approved. Run queued.", { variant: "success" });
      await refreshAgentRunDetails(latestAgentRunId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to approve step.";
      toast(message, { variant: "error" });
    } finally {
      setAgentStepActionBusyId(null);
    }
  };

  const openStepDetails = async (step: AgentPlanStep) => {
    if (!latestAgentRunId) {
      toast("No agent run available for step details.", { variant: "error" });
      return;
    }
    setStepDetailsOpen(true);
    setStepDetailsTitle(step.title);
    setStepDetailsLoading(true);
    try {
      const snapshotPromise = step.snapshotId
        ? fetchWithTimeout(`/api/chatbot/agent/snapshots/${step.snapshotId}`)
        : Promise.resolve(null);
      const logsPromise = fetchWithTimeout(
        `/api/chatbot/agent/${latestAgentRunId}/logs?stepId=${step.id}`
      );
      const [snapshotRes, logsRes] = await Promise.all([snapshotPromise, logsPromise]);

      if (snapshotRes && snapshotRes.ok) {
        const data = (await snapshotRes.json()) as { snapshot?: AgentSnapshot };
        setStepDetailsSnapshot(data.snapshot ?? null);
      } else {
        setStepDetailsSnapshot(null);
      }

      if (logsRes.ok) {
        const data = (await logsRes.json()) as { logs?: AgentBrowserLog[] };
        setStepDetailsLogs(data.logs ?? []);
      } else {
        setStepDetailsLogs([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load step details.";
      toast(message, { variant: "error" });
      setStepDetailsSnapshot(null);
      setStepDetailsLogs([]);
    } finally {
      setStepDetailsLoading(false);
    }
  };

  const openSnapshotLightbox = async (step: AgentPlanStep) => {
    if (!latestAgentRunId || !step.snapshotId) {
      toast("No snapshot available for this step.", { variant: "error" });
      return;
    }
    try {
      const res = await fetchWithTimeout(
        `/api/chatbot/agent/snapshots/${step.snapshotId}`
      );
      if (!res.ok) {
        const error = await readErrorResponse(res);
        throw new Error(error.message);
      }
      const data = (await res.json()) as { snapshot?: AgentSnapshot };
      setSnapshotLightbox(data.snapshot ?? null);
      setSnapshotLightboxOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load snapshot.";
      toast(message, { variant: "error" });
    }
  };

  const jumpToStepSnapshot = async (step: AgentPlanStep) => {
    if (!step.snapshotId) {
      toast("No snapshot captured for this step yet.", { variant: "error" });
      return;
    }
    try {
      const res = await fetchWithTimeout(
        `/api/chatbot/agent/snapshots/${step.snapshotId}`
      );
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`${error.message}${suffix}`);
      }
      const data = (await res.json()) as { snapshot?: AgentSnapshot };
      if (data.snapshot) {
        setAgentPreviewSnapshot(data.snapshot);
        setHighlightedSnapshotId(data.snapshot.id);
        setTimeout(() => {
          setHighlightedSnapshotId((current) =>
            current === data.snapshot?.id ? null : current
          );
        }, 2500);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load step snapshot.";
      toast(message, { variant: "error" });
    }
  };

  const sendMessage = async () => {
    if (!sessionReady) {
      toast("Chat session is not ready yet.", { variant: "error" });
      return;
    }
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isSending) {
      return;
    }
    const wasAgentModeEnabled = agentModeEnabled;
    if (agentModeEnabled && attachments.length > 0) {
      toast("Agent mode does not support attachments yet.", { variant: "error" });
      return;
    }

    setIsSending(true);

    let searchNote = "";
    if (webSearchEnabled && trimmed) {
      try {
        const res = await fetchWithTimeout(
          "/api/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: trimmed,
              limit: 5,
              provider: searchProvider,
            }),
          },
          12000
        );
        if (res.ok) {
          const data = (await res.json()) as {
            results?: Array<{ title: string; url: string; description: string }>;
          };
          if (data.results && data.results.length > 0) {
            const lines = data.results.map(
              (item, index) =>
                `${index + 1}. ${item.title}\n${item.url}\n${item.description}`
            );
            searchNote = `\n\nWeb search results:\n${lines.join("\n\n")}`;
          }
        } else {
          const error = (await res.json()) as { error?: string };
          throw new Error(error.error || "Search failed.");
        }
      } catch (error) {
        const message = isAbortError(error)
          ? "Web search timed out."
          : error instanceof Error
            ? error.message
            : "Web search failed.";
        toast(message, { variant: "error" });
      }
    }

    const attachmentNote =
      attachments.length > 0
        ? `\n\nAttached files:\n${attachments
            .map((file) => `- ${file.name} (${Math.round(file.size / 1024)} KB)`)
            .join("\n")}`
        : "";
    const userMessage = `${trimmed}${searchNote}${attachmentNote}`.trim();
    const nextMessages = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(nextMessages);
    setInput("");

    try {
      if (sessionId && agentModeEnabled) {
        await persistSessionMessage(sessionId, "user", userMessage);
      }
      const trimmedGlobal = globalContext.trim();
      const trimmedLocal = useLocalContext ? localContext.trim() : "";
      let mergedContext = "";
      if (useLocalContext && trimmedLocal) {
        if (useGlobalContext && trimmedGlobal) {
          mergedContext =
            localContextMode === "append"
              ? `${trimmedGlobal}\n\n${trimmedLocal}`
              : trimmedLocal;
        } else {
          mergedContext = trimmedLocal;
        }
      } else if (useGlobalContext && trimmedGlobal) {
        mergedContext = trimmedGlobal;
      }
      const payloadMessages = mergedContext
        ? ([{ role: "system", content: `Context:\n${mergedContext}` }, ...nextMessages] as ChatMessage[])
        : nextMessages;
      const hasFiles = attachments.length > 0;
      const tools: string[] = [];
      if (webSearchEnabled) tools.push("websearch");
      if (useGlobalContext) tools.push("global-context");
      if (useLocalContext) tools.push("local-context");
      if (agentModeEnabled) tools.push("agent-mode");
      const agentPlanSettings = agentModeEnabled
        ? {
            maxSteps: clampAgentSetting(agentMaxSteps, 1, 20, 12),
            maxStepAttempts: clampAgentSetting(agentMaxStepAttempts, 1, 5, 2),
            maxReplanCalls: clampAgentSetting(agentMaxReplanCalls, 0, 6, 2),
            replanEverySteps: clampAgentSetting(agentReplanEverySteps, 1, 10, 2),
            maxSelfChecks: clampAgentSetting(agentMaxSelfChecks, 0, 8, 4),
          }
        : undefined;
      if (debugEnabled) {
        setDebugState({
          lastRequest: {
            model,
            tools,
            messageCount: payloadMessages.length,
            hasLocalContext: Boolean(trimmedLocal),
            hasGlobalContext: Boolean(trimmedGlobal),
            localContextMode,
            attachmentCount: attachments.length,
            searchUsed: Boolean(searchNote),
            searchProvider,
            agentBrowser,
            agentRunHeadless,
            ignoreRobotsTxt: agentIgnoreRobotsTxt,
            requireHumanApproval: agentRequireHumanApproval,
            agentPlanSettings,
          },
        });
      }
      const startedAt = Date.now();
      if (agentModeEnabled) {
        const res = await fetchWithTimeout(
          "/api/chatbot/agent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: trimmed,
              model,
              tools,
              searchProvider,
              agentBrowser,
              runHeadless: agentRunHeadless,
              ignoreRobotsTxt: agentIgnoreRobotsTxt,
              requireHumanApproval: agentRequireHumanApproval,
              planSettings: agentPlanSettings,
            }),
          },
          20000
        );

        if (!res.ok) {
          const error = await readErrorResponse(res);
          if (debugEnabled) {
            setDebugState((prev) => ({
              ...prev,
              lastResponse: {
                ok: false,
                durationMs: Date.now() - startedAt,
                error: error.message,
                errorId: error.errorId,
              },
            }));
          }
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          throw new Error(`${error.message}${suffix}`);
        }

        const data = (await res.json()) as { runId: string; status: string };
        const agentReply = `Agent mode queued a run (${data.runId}). Check the run queue for progress.`;
        setLatestAgentRunId(data.runId);
        setLatestAgentRunStatus(data.status);
        if (sessionId) {
          safeLocalStorageSet(`chatbotLatestAgentRunId:${sessionId}`, data.runId);
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: agentReply,
          },
        ]);
        if (sessionId) {
          await persistSessionMessage(sessionId, "assistant", agentReply);
        }
      } else {
        const res = await fetchWithTimeout(
          "/api/chatbot/jobs",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                model,
                messages: payloadMessages,
                userMessage,
              }),
          },
          12000
        );
        if (!res.ok) {
          const error = await readErrorResponse(res);
          if (debugEnabled) {
            setDebugState((prev) => ({
              ...prev,
              lastResponse: {
                ok: false,
                durationMs: Date.now() - startedAt,
                error: error.message,
                errorId: error.errorId,
              },
            }));
          }
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          throw new Error(`${error.message}${suffix}`);
        }
        toast("Reply queued. You can leave this page.", { variant: "success" });
        setPollingReply(true);
      }
      if (attachments.length > 0) {
        setAttachments([]);
      }
      if (debugEnabled) {
        setDebugState((prev) => ({
          ...prev,
          lastResponse: {
            ok: true,
            durationMs: Date.now() - startedAt,
          },
        }));
      }
    } catch (error) {
      if (debugEnabled && !debugState.lastResponse) {
        setDebugState((prev) => ({
          ...prev,
          lastResponse: {
            ok: false,
            durationMs: 0,
            error: error instanceof Error ? error.message : "Chatbot error.",
          },
        }));
      }
      const message = isAbortError(error)
        ? "Chatbot request timed out."
        : error instanceof Error
          ? error.message
          : "Chatbot error.";
      toast(message, { variant: "error" });
    } finally {
      if (wasAgentModeEnabled && !agentModeEnabled) {
        setAgentModeEnabled(true);
      }
      setIsSending(false);
    }
  };

  const createNewSession = async () => {
    if (creatingSession || isSending) return;
    setCreatingSession(true);
    try {
      const res = await fetchWithTimeout(
        "/api/chatbot/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        12000
      );
      if (!res.ok) {
        const error = await readErrorResponse(res);
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        throw new Error(`Failed to create chat session.${suffix}`);
      }
      const data = (await res.json()) as { sessionId?: string };
      if (!data.sessionId) {
        throw new Error("Failed to create chat session.");
      }
      setSessionId(data.sessionId);
      safeLocalStorageSet("chatbotSessionId", data.sessionId);
      setMessages([]);
      setInput("");
      setAttachments([]);
      setLatestAgentRunId(null);
      setLatestAgentRunStatus(null);
      setAgentPreviewSnapshot(null);
      setAgentPreviewStatus("idle");
      setAgentPlanSteps([]);
      setAgentPlanMeta(null);
      setAgentControlUrl("");
      safeLocalStorageRemove(`chatbotLatestAgentRunId:${data.sessionId}`);
      setInitError(null);
      setSessionLoading(false);
      setMessagesLoading(false);
      setDebugState({});
      toast("New chat session created", { variant: "success" });
    } catch (error) {
      const message = isAbortError(error)
        ? "Creating a new session timed out."
        : error instanceof Error
          ? error.message
          : "Failed to create chat session.";
      toast(message, { variant: "error" });
    } finally {
      setCreatingSession(false);
    }
  };

  const renderPlannerNotes = (meta: PlannerMeta | null) => {
    if (!meta) return null;
    return (
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px] text-slate-200">
        <p className="text-[11px] text-slate-400">Planner notes</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {meta.critique?.assumptions?.length ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Assumptions
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {meta.critique.assumptions.map((item, index) => (
                  <li key={`assumption-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {meta.critique?.risks?.length ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Risks
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {meta.critique.risks.map((item, index) => (
                  <li key={`risk-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {meta.critique?.unknowns?.length ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Unknowns
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {meta.critique.unknowns.map((item, index) => (
                  <li key={`unknown-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {meta.critique?.questions?.length || meta.questions?.length ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Questions
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(meta.critique?.questions ?? meta.questions ?? []).map(
                  (item, index) => (
                    <li key={`question-${index}`}>{item}</li>
                  )
                )}
              </ul>
            </div>
          ) : null}
          {meta.critique?.safetyChecks?.length || meta.safetyChecks?.length ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Safety checks
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {(meta.critique?.safetyChecks ?? meta.safetyChecks ?? []).map(
                  (item, index) => (
                    <li key={`safety-${index}`}>{item}</li>
                  )
                )}
              </ul>
            </div>
          ) : null}
        </div>
        {meta.alternatives?.length ? (
          <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/70 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Alternatives
            </p>
            <div className="mt-2 space-y-2">
              {meta.alternatives.map((alt, index) => (
                <div
                  key={`alternative-${index}`}
                  className="rounded-md border border-slate-800 bg-slate-950/80 p-2"
                >
                  <p className="text-slate-100">{alt.title}</p>
                  {alt.rationale ? (
                    <p className="mt-1 text-slate-400">{alt.rationale}</p>
                  ) : null}
                  {alt.steps?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">
                      {alt.steps.map((step, stepIndex) => (
                        <li key={`alternative-${index}-step-${stepIndex}`}>
                          {step.title || "Step"}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Chatbot</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/admin/chatbot/jobs">Jobs</Link>
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/admin/chatbot/memory">Memory</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={createNewSession}
              disabled={creatingSession || isSending || sessionLoading}
            >
              {creatingSession ? "Creating..." : "New session"}
            </Button>
          </div>
        </div>
      {initError ? (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">Chat session not ready</p>
            <p className="mt-1 text-xs text-amber-200/80">
              If you recently updated the schema, run `npx prisma generate` then
              `npx prisma db push`, and restart the dev server.
            </p>
            <p className="mt-2 text-xs text-amber-200/80">{initError}</p>
          </div>
      ) : null}
      {stepDetailsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setStepDetailsOpen(false)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ModalShell
              title={`Step details: ${stepDetailsTitle || "Agent step"}`}
              onClose={() => setStepDetailsOpen(false)}
              size="lg"
            >
              {stepDetailsLoading ? (
                <div className="rounded-md border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
                  Loading step details...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    <p className="text-[11px] text-gray-500">Snapshot</p>
                    <div className="mt-2 overflow-hidden rounded-md border border-gray-800 bg-gray-900">
                      {stepDetailsSnapshot?.screenshotPath ||
                      stepDetailsSnapshot?.screenshotData ? (
                        <img
                          src={
                            stepDetailsSnapshot.screenshotPath
                              ? `/api/chatbot/agent/${latestAgentRunId}/assets/${stepDetailsSnapshot.screenshotPath}`
                              : stepDetailsSnapshot.screenshotData ?? ""
                          }
                          alt="Step snapshot"
                          className="h-auto w-full"
                        />
                      ) : (
                        <div className="flex min-h-[160px] items-center justify-center text-xs text-gray-500">
                          No snapshot captured for this step.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    <p className="text-[11px] text-gray-500">DOM text</p>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                      {stepDetailsSnapshot?.domText || "No DOM captured."}
                    </div>
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    <p className="text-[11px] text-gray-500">Logs</p>
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                      {stepDetailsLogs.length === 0 ? (
                        <p className="text-gray-500">No logs for this step.</p>
                      ) : (
                        stepDetailsLogs.map((log) => (
                          <p key={log.id}>
                            [{log.level}] {log.message}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ModalShell>
          </div>
        </div>
      ) : null}
      {snapshotLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSnapshotLightboxOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-md border border-gray-800 bg-gray-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2 text-xs text-gray-400">
              <span>Snapshot preview</span>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200"
                onClick={() => setSnapshotLightboxOpen(false)}
              >
                Close
              </button>
            </div>
            {snapshotLightbox?.screenshotPath ||
            snapshotLightbox?.screenshotData ? (
              <img
                src={
                  snapshotLightbox.screenshotPath
                    ? `/api/chatbot/agent/${latestAgentRunId}/assets/${snapshotLightbox.screenshotPath}`
                    : snapshotLightbox.screenshotData ?? ""
                }
                alt="Snapshot preview"
                className="h-auto w-full object-contain"
              />
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-xs text-gray-500">
                No snapshot available.
              </div>
            )}
          </div>
        </div>
      ) : null}
      <div className="flex min-h-[420px] flex-col rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="max-h-[50vh] min-h-[220px] space-y-4 overflow-y-auto pr-2">
            {(sessionLoading || messagesLoading) && !initError ? (
              <div className="rounded-md border border-dashed border-gray-800 bg-gray-950/60 p-6 text-center text-sm text-gray-400">
                Loading chat session...
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
                Start a conversation to see messages here.
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-emerald-500/10 text-emerald-100"
                      : "bg-slate-500/10 text-slate-100"
                  }`}
                >
                  {renderFormattedMessage(message.content)}
                </div>
              ))
            )}
            {latestAgentRunId ? (
              <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs text-blue-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Agent job: {latestAgentRunId}
                    {latestAgentRunStatus
                      ? ` · ${latestAgentRunStatus.replace("_", " ")}`
                      : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-blue-200 underline-offset-2 hover:underline"
                      onClick={() => setAgentRunDetailsOpen(true)}
                    >
                      View run details
                    </button>
                    <Link
                      href="/admin/chatbot/jobs"
                      className="text-[11px] text-blue-200 underline-offset-2 hover:underline"
                    >
                      Jobs
                    </Link>
                  </div>
                </div>
                {latestAgentRunStatus === "waiting_human" ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                    <span>
                      Cloudflare detected — run paused for manual intervention.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-[11px] text-amber-200 underline-offset-2 hover:underline"
                        onClick={() => setAgentRunDetailsOpen(true)}
                      >
                        Open preview
                      </button>
                      <Link
                        href="/admin/chatbot/jobs"
                        className="text-[11px] text-amber-200 underline-offset-2 hover:underline"
                      >
                        View in jobs
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {agentRunDetailsOpen ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                onClick={() => setAgentRunDetailsOpen(false)}
              >
                <div onClick={(event) => event.stopPropagation()}>
                  <ModalShell
                    title="Agent run details"
                    onClose={() => setAgentRunDetailsOpen(false)}
                    size="xl"
                  >
                    {agentRunDetailsLoading ? (
                      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
                        Loading agent run details...
                      </div>
                    ) : (
                      <Tabs defaultValue="summary" className="w-full">
                      <TabsList className="grid w-full grid-cols-10">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="dom">DOM</TabsTrigger>
                        <TabsTrigger value="steps">Steps</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                        <TabsTrigger value="context">Context</TabsTrigger>
                        <TabsTrigger value="elements">Elements</TabsTrigger>
                        <TabsTrigger value="ui">UI</TabsTrigger>
                        <TabsTrigger value="debug">Debug</TabsTrigger>
                      </TabsList>
                        <TabsContent value="summary" className="mt-4 space-y-3">
                          {agentRunDetails ? (
                            <div className="rounded-md border border-gray-800 bg-gray-900 p-3 text-xs text-gray-300">
                              <p className="text-[11px] text-gray-500">Run summary</p>
                              <p className="mt-1 text-sm text-white">
                                {agentRunDetails.prompt}
                              </p>
                              <div className="mt-2 text-xs text-gray-400">
                                Status:{" "}
                                {agentRunDetails.status?.replace("_", " ") ||
                                  "unknown"}{" "}
                                · Model: {agentRunDetails.model || "Default"}
                                {agentRunDetails.requiresHumanIntervention
                                  ? " · needs input"
                                  : ""}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                Robots:{" "}
                                {resolveIgnoreRobots(agentRunDetails.planState)
                                  ? "Ignored"
                                  : robotsStatus || "Unknown"}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                Adaptive trigger:{" "}
                                {latestAdaptiveTrigger ? (
                                  <>
                                    {latestAdaptiveTrigger.label}
                                    {latestAdaptiveTrigger.reason
                                      ? ` · ${formatAdaptiveReason(
                                          latestAdaptiveTrigger.reason
                                        )}`
                                      : ""}
                                    {latestAdaptiveTrigger.createdAt
                                      ? ` · ${new Date(
                                          latestAdaptiveTrigger.createdAt
                                        ).toLocaleTimeString()}`
                                      : ""}
                                  </>
                                ) : (
                                  <span className="text-gray-500">none yet</span>
                                )}
                              </div>
                              {agentRunDetails.status === "waiting_human" &&
                              resolveApprovalStepId(agentRunDetails.planState) ? (
                                <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-100">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                      Approval required for step:{" "}
                                      {agentPlanSteps.find(
                                        (step) =>
                                          step.id ===
                                          resolveApprovalStepId(agentRunDetails.planState)
                                      )?.title || "Unknown step"}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={agentStepActionBusyId !== null}
                                      onClick={() =>
                                        approveAgentStep(
                                          resolveApprovalStepId(agentRunDetails.planState)!
                                        )
                                      }
                                    >
                                      Approve
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                              {selfCheckAudits.length > 0 ? (
                                <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Self-checks
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {selfCheckAudits.slice(0, 4).map((audit) => (
                                      <div
                                        key={audit.id}
                                        className="rounded-md border border-gray-800 bg-gray-900/70 p-2"
                                      >
                                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                                          <span>{audit.message}</span>
                                          <span>
                                            {new Date(
                                              audit.createdAt
                                            ).toLocaleTimeString()}
                                          </span>
                                        </div>
                                        {audit.metadata
                                          ? (() => {
                                              const meta = audit.metadata as Record<
                                                string,
                                                unknown
                                              >;
                                              const questions = getAuditList(meta.questions);
                                              const evidence = getAuditList(meta.evidence);
                                              const missingInfo = getAuditList(
                                                meta.missingInfo
                                              );
                                              const blockers = getAuditList(meta.blockers);
                                              const hypotheses = getAuditList(
                                                meta.hypotheses
                                              );
                                              const verificationSteps = getAuditList(
                                                meta.verificationSteps
                                              );
                                              const abortSignals = getAuditList(
                                                meta.abortSignals
                                              );
                                              const finishSignals = getAuditList(
                                                meta.finishSignals
                                              );
                                              const toolSwitch =
                                                typeof meta.toolSwitch === "string"
                                                  ? meta.toolSwitch.trim()
                                                  : "";
                                              return (
                                                <div className="mt-1 space-y-2 text-[11px] text-gray-200">
                                                  {typeof meta.reason === "string" ? (
                                                    <p>{meta.reason}</p>
                                                  ) : null}
                                                  {typeof meta.notes === "string" ? (
                                                    <p className="text-gray-400">
                                                      {meta.notes}
                                                    </p>
                                                  ) : null}
                                                  {toolSwitch ? (
                                                    <p className="text-gray-300">
                                                      Tool switch:{" "}
                                                      <span className="text-gray-100">
                                                        {toolSwitch}
                                                      </span>
                                                    </p>
                                                  ) : null}
                                                  {questions.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Questions
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {questions.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {evidence.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Evidence
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {evidence.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {missingInfo.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Missing info
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {missingInfo.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {blockers.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Blockers
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {blockers.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {hypotheses.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Hypotheses
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {hypotheses.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {verificationSteps.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Verification
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {verificationSteps.map(
                                                          (item) => (
                                                            <li key={item}>{item}</li>
                                                          )
                                                        )}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {abortSignals.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Abort signals
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {abortSignals.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                  {finishSignals.length > 0 ? (
                                                    <div>
                                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                        Finish signals
                                                      </p>
                                                      <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                        {finishSignals.map((item) => (
                                                          <li key={item}>{item}</li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  ) : null}
                                                </div>
                                              );
                                            })()
                                          : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {branchAudits.length > 0 ? (
                                <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Branches
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {branchAudits.slice(0, 3).map((audit) => {
                                      const meta = audit.metadata as
                                        | {
                                            branchSteps?: Array<{
                                              id?: string;
                                              title?: string;
                                            }>;
                                            reason?: string;
                                          }
                                        | null;
                                      const branchSteps = Array.isArray(meta?.branchSteps)
                                        ? meta?.branchSteps
                                        : [];
                                      return (
                                        <div
                                          key={audit.id}
                                          className="rounded-md border border-gray-800 bg-gray-900/70 p-2"
                                        >
                                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                                            <span>
                                              {meta?.reason
                                                ? `Reason: ${formatAdaptiveReason(
                                                    meta.reason
                                                  )}`
                                                : "Branch alternatives"}
                                            </span>
                                            <span>
                                              {new Date(
                                                audit.createdAt
                                              ).toLocaleTimeString()}
                                            </span>
                                          </div>
                                          {branchSteps.length > 0 ? (
                                            <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                              {branchSteps.map((step, index) => (
                                                <li
                                                  key={
                                                    step.id ??
                                                    `branch-step-${index}`
                                                  }
                                                >
                                                  {step.title || "Branch step"}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p className="mt-1 text-gray-500">
                                              No branch steps captured.
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {selfImprovementAudits.length > 0 ? (
                                <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Self-improvement
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {selfImprovementAudits.slice(0, 3).map((audit) => {
                                      const meta = audit.metadata as Record<
                                        string,
                                        unknown
                                      > | null;
                                      const mistakes = getAuditList(meta?.mistakes);
                                      const improvements = getAuditList(
                                        meta?.improvements
                                      );
                                      const guardrails = getAuditList(meta?.guardrails);
                                      const toolAdjustments = getAuditList(
                                        meta?.toolAdjustments
                                      );
                                      const summary =
                                        typeof meta?.summary === "string"
                                          ? meta.summary
                                          : "";
                                      const confidence =
                                        typeof meta?.confidence === "number"
                                          ? meta.confidence
                                          : null;
                                      return (
                                        <div
                                          key={audit.id}
                                          className="rounded-md border border-gray-800 bg-gray-900/70 p-2"
                                        >
                                          <div className="flex items-center justify-between text-[10px] text-gray-500">
                                            <span>{audit.message}</span>
                                            <span>
                                              {new Date(
                                                audit.createdAt
                                              ).toLocaleTimeString()}
                                            </span>
                                          </div>
                                          {summary ? (
                                            <p className="mt-1 text-gray-200">
                                              {summary}
                                            </p>
                                          ) : null}
                                          {confidence !== null ? (
                                            <p className="mt-1 text-gray-400">
                                              Confidence: {confidence}
                                            </p>
                                          ) : null}
                                          {mistakes.length > 0 ? (
                                            <div className="mt-2">
                                              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                Mistakes
                                              </p>
                                              <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                {mistakes.map((item) => (
                                                  <li key={item}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          ) : null}
                                          {improvements.length > 0 ? (
                                            <div className="mt-2">
                                              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                Improvements
                                              </p>
                                              <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                {improvements.map((item) => (
                                                  <li key={item}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          ) : null}
                                          {guardrails.length > 0 ? (
                                            <div className="mt-2">
                                              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                Guardrails
                                              </p>
                                              <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                {guardrails.map((item) => (
                                                  <li key={item}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          ) : null}
                                          {toolAdjustments.length > 0 ? (
                                            <div className="mt-2">
                                              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                                Tool tweaks
                                              </p>
                                              <ul className="mt-1 list-disc space-y-1 pl-4 text-gray-300">
                                                {toolAdjustments.map((item) => (
                                                  <li key={item}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {["waiting_human", "stopped", "failed"].includes(
                                agentRunDetails.status || ""
                              ) ? (
                                <div className="mt-3">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resumeAgentRun()}
                                    disabled={agentResumeBusy}
                                  >
                                    {agentResumeBusy ? "Resuming..." : "Resume run"}
                                  </Button>
                                </div>
                              ) : null}
                              {agentPlanSteps.length > 0 &&
                              ["waiting_human", "stopped", "failed"].includes(
                                agentRunDetails.status || ""
                              ) ? (
                                <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Resume from step
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <select
                                      value={resumeStepId}
                                      onChange={(event) =>
                                        setResumeStepId(event.target.value)
                                      }
                                      className="h-8 min-w-[220px] rounded-md border border-gray-800 bg-gray-900 px-2 text-xs text-gray-200"
                                    >
                                      <option value="">Select step…</option>
                                      {agentPlanSteps.map((step) => (
                                        <option key={step.id} value={step.id}>
                                          {step.title}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={agentResumeBusy || !resumeStepId}
                                      onClick={() => resumeAgentRun(resumeStepId)}
                                    >
                                      {agentResumeBusy ? "Resuming..." : "Resume"}
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                              {agentRunDetails.recordingPath ? (
                                <div className="mt-2 text-xs text-gray-400">
                                  Recording:{" "}
                                  <a
                                    className="text-emerald-300 hover:text-emerald-200"
                                    href={`/api/chatbot/agent/${agentRunDetails.id}/assets/${agentRunDetails.recordingPath}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View recording
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </TabsContent>
                        <TabsContent value="preview" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>Preview</span>
                              <span>
                                {agentPreviewStatus === "live"
                                  ? "Live"
                                  : agentPreviewStatus === "connecting"
                                    ? "Connecting..."
                                    : agentPreviewStatus === "error"
                                      ? "Fallback"
                                      : "Idle"}
                              </span>
                            </div>
                            <div className="mt-3 max-h-[320px] overflow-hidden rounded-md border border-gray-800 bg-gray-900">
                              {agentPreviewSnapshot?.screenshotPath ||
                              agentPreviewSnapshot?.screenshotData ? (
                                <img
                                  src={
                                    agentPreviewSnapshot.screenshotPath
                                      ? `/api/chatbot/agent/${latestAgentRunId}/assets/${agentPreviewSnapshot.screenshotPath}`
                                      : agentPreviewSnapshot.screenshotData ?? ""
                                  }
                                  alt="Agent preview"
                                  className="h-auto w-full object-cover"
                                />
                              ) : (
                                <div className="flex min-h-[200px] items-center justify-center text-xs text-gray-500">
                                  No preview yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="dom" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">DOM snapshot</p>
                            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                              {agentPreviewSnapshot?.domText ||
                                "No DOM captured yet."}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="steps" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">Agent steps</p>
                            {renderPlannerNotes(agentPlanMeta)}
                            {agentPlanSteps.length > 0 ? (
                              <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Plan steps with dependencies
                                </p>
                                <ol className="mt-2 space-y-2">
                                  {agentPlanSteps.map((step, index) => {
                                    const deps = formatDependencies(step.dependsOn);
                                    return (
                                      <li
                                        key={step.id || `${index}-plan-step`}
                                        className="rounded-md border border-gray-800 bg-gray-950/70 px-2 py-2"
                                      >
                                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                                          <span className="uppercase">#{index + 1}</span>
                                          <span className="uppercase">
                                            {step.status}
                                            {step.phase ? ` · ${step.phase}` : ""}
                                            {typeof step.priority === "number"
                                              ? ` · p${step.priority}`
                                              : ""}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-slate-100">
                                          {step.title}
                                        </p>
                                        {deps ? (
                                          <p className="mt-1 text-[10px] text-slate-400">
                                            Depends on: {deps}
                                          </p>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                            ) : null}
                            {agentPlanSteps.length > 0 ? (
                              <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Step retries & overrides
                                </p>
                                <ol className="mt-2 space-y-2">
                                  {agentPlanSteps.map((step) => (
                                    <li
                                      key={step.id}
                                      className="rounded-md border border-gray-800 bg-gray-950/70 px-2 py-2"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400">
                                        <span className="uppercase">
                                          {step.status}
                                        </span>
                                        <span>{step.title}</span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            agentRunDetails?.status === "running" ||
                                            agentStepActionBusyId === step.id
                                          }
                                          onClick={() => retryAgentStep(step.id)}
                                        >
                                          Retry
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            agentRunDetails?.status === "running" ||
                                            agentStepActionBusyId === step.id
                                          }
                                          onClick={() =>
                                            overrideAgentStep(step.id, "completed")
                                          }
                                        >
                                          Mark done
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            agentRunDetails?.status === "running" ||
                                            agentStepActionBusyId === step.id
                                          }
                                          onClick={() =>
                                            overrideAgentStep(step.id, "failed")
                                          }
                                        >
                                          Mark failed
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ) : null}
                            {agentRunAudits.some(
                              (audit) =>
                                audit.message === "LLM extraction plan created." &&
                                audit.metadata?.plan
                            ) ? (
                              <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Extraction plan
                                </p>
                                <div className="mt-2 space-y-2">
                                  {agentRunAudits
                                    .filter(
                                      (audit) =>
                                        audit.message ===
                                          "LLM extraction plan created." &&
                                        audit.metadata?.plan
                                    )
                                    .slice(0, 2)
                                    .map((audit) => (
                                      <div key={audit.id}>
                                        {renderExtractionPlan(
                                          audit.metadata?.plan as ExtractionPlan
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : null}
                            {agentRunAudits.some(
                              (audit) => audit.message === "Plan evaluated."
                            ) ? (
                              <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Planner evaluation
                                </p>
                                <div className="mt-2 space-y-2">
                                  {agentRunAudits
                                    .filter(
                                      (audit) => audit.message === "Plan evaluated."
                                    )
                                    .slice(0, 2)
                                    .map((audit) => (
                                      <div
                                        key={audit.id}
                                        className="rounded-md border border-gray-800 bg-gray-950 p-2 text-[10px] text-gray-300"
                                      >
                                        <p>
                                          Score:{" "}
                                          {typeof audit.metadata?.score === "number"
                                            ? audit.metadata.score
                                            : "n/a"}
                                        </p>
                                        {Array.isArray(audit.metadata?.issues) &&
                                        audit.metadata?.issues?.length ? (
                                          <ul className="mt-1 list-disc space-y-1 pl-4">
                                            {audit.metadata.issues.map(
                                              (issue: string, index: number) => (
                                                <li key={`${audit.id}-issue-${index}`}>
                                                  {issue}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        ) : (
                                          <p className="mt-1 text-gray-500">
                                            No issues reported.
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : null}
                            {agentRunAudits.some(
                              (audit) =>
                                audit.message === "Plan verification completed."
                            ) ? (
                              <div className="mt-3 rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Plan verification
                                </p>
                                <div className="mt-2 space-y-2">
                                  {agentRunAudits
                                    .filter(
                                      (audit) =>
                                        audit.message ===
                                        "Plan verification completed."
                                    )
                                    .slice(0, 2)
                                    .map((audit) => (
                                      <div
                                        key={audit.id}
                                        className="rounded-md border border-gray-800 bg-gray-950 p-2 text-[10px] text-gray-300"
                                      >
                                        <p>
                                          Verdict:{" "}
                                          {typeof audit.metadata?.verdict === "string"
                                            ? audit.metadata.verdict
                                            : "unknown"}
                                        </p>
                                        {Array.isArray(audit.metadata?.evidence) &&
                                        audit.metadata?.evidence?.length ? (
                                          <div className="mt-1">
                                            <p className="text-gray-400">
                                              Evidence
                                            </p>
                                            <ul className="mt-1 list-disc space-y-1 pl-4">
                                              {audit.metadata.evidence.map(
                                                (item: string, index: number) => (
                                                  <li
                                                    key={`${audit.id}-evidence-${index}`}
                                                  >
                                                    {item}
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        ) : null}
                                        {Array.isArray(audit.metadata?.missing) &&
                                        audit.metadata?.missing?.length ? (
                                          <div className="mt-2">
                                            <p className="text-gray-400">Missing</p>
                                            <ul className="mt-1 list-disc space-y-1 pl-4">
                                              {audit.metadata.missing.map(
                                                (item: string, index: number) => (
                                                  <li
                                                    key={`${audit.id}-missing-${index}`}
                                                  >
                                                    {item}
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        ) : null}
                                        {typeof audit.metadata?.followUp === "string" &&
                                        audit.metadata.followUp.trim() ? (
                                          <p className="mt-2 text-gray-400">
                                            Follow-up: {audit.metadata.followUp}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : null}
                            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                              {agentRunAudits.length === 0 ? (
                                <p className="text-gray-500">No steps yet.</p>
                              ) : (
                                agentRunAudits.map((step) => (
                                  <div
                                    key={step.id}
                                    className="rounded-md border border-gray-800 px-2 py-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                      <span className="uppercase tracking-wide">
                                        {step.level}
                                      </span>
                                      <span>
                                        {new Date(step.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-gray-200">
                                      {step.message}
                                    </p>
                                    {step.metadata ? (
                                      <div className="mt-2">
                                        <button
                                          type="button"
                                          className="text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-200"
                                          onClick={() =>
                                            setExpandedRunAuditIds((prev) => ({
                                              ...prev,
                                              [step.id]: !prev[step.id],
                                            }))
                                          }
                                        >
                                          {expandedRunAuditIds[step.id]
                                            ? "Hide metadata"
                                            : "Show metadata"}
                                        </button>
                                        {expandedRunAuditIds[step.id] ? (
                                          <pre className="mt-2 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900 p-2 text-[10px] text-gray-300">
                                            {JSON.stringify(step.metadata, null, 2)}
                                          </pre>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="timeline" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">
                              Tool call timeline
                            </p>
                            {toolTimeline.length === 0 ? (
                              <p className="mt-2 text-gray-500">
                                No tool calls logged yet.
                              </p>
                            ) : (
                              <ol className="mt-2 space-y-2">
                                {toolTimeline.map((entry) => (
                                  <li
                                    key={entry.id}
                                    className="rounded-md border border-gray-800 bg-gray-900/70 px-2 py-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                      <span className="uppercase">
                                        {entry.source}
                                        {entry.level ? ` · ${entry.level}` : ""}
                                      </span>
                                      <span>
                                        {new Date(entry.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-gray-200">
                                      {entry.message}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="logs" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">Logs</p>
                            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                              {agentRunLogs.length === 0 ? (
                                <p className="text-gray-500">No logs yet.</p>
                              ) : (
                                agentRunLogs.map((log) => (
                                  <p key={log.id}>
                                    [{log.level}] {log.message}
                                  </p>
                                ))
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="context" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">
                              Session context
                            </p>
                            {latestSessionContext ? (
                              <div className="mt-2 space-y-3">
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Cookies
                                  </p>
                                  <div className="mt-1 max-h-36 overflow-y-auto">
                                    {(latestSessionContext.cookies as Array<{
                                      name: string;
                                      domain: string;
                                      path: string;
                                      expires: number;
                                      httpOnly: boolean;
                                      secure: boolean;
                                      sameSite: string;
                                      valueLength: number;
                                    }> | undefined)?.map((cookie, index) => (
                                      <div key={`${cookie.name}-${index}`} className="mt-1">
                                        <span className="text-slate-100">
                                          {cookie.name}
                                        </span>{" "}
                                        <span className="text-gray-500">
                                          {cookie.domain}
                                        </span>
                                        <span className="ml-2 text-gray-500">
                                          len {cookie.valueLength}
                                        </span>
                                      </div>
                                    )) ?? (
                                      <p className="text-gray-500">
                                        No cookies captured.
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Storage keys
                                  </p>
                                  <div className="mt-1 text-gray-300">
                                    <p>
                                      Local:{" "}
                                      {(latestSessionContext.storage as {
                                        localCount?: number;
                                      })?.localCount ?? 0}
                                      {" · "}
                                      Session:{" "}
                                      {(latestSessionContext.storage as {
                                        sessionCount?: number;
                                      })?.sessionCount ?? 0}
                                    </p>
                                    <div className="mt-1 max-h-20 overflow-y-auto text-[10px] text-gray-400">
                                      {(latestSessionContext.storage as {
                                        localKeys?: string[];
                                        sessionKeys?: string[];
                                      })?.localKeys?.join(", ") ||
                                        "No localStorage keys."}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-gray-500">
                                No session context captured yet.
                              </p>
                            )}
                          </div>
                          {agentRunAudits.some(
                            (audit) => audit.metadata?.type === "planner-context"
                          ) ? (
                            <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                              <p className="text-[11px] text-gray-500">
                                Planner debug
                              </p>
                              <div className="mt-2 space-y-2">
                                {agentRunAudits
                                  .filter(
                                    (audit) =>
                                      audit.metadata?.type === "planner-context"
                                  )
                                  .slice(0, 2)
                                  .map((audit) => (
                                    <pre
                                      key={audit.id}
                                      className="whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900 p-2 text-[10px] text-gray-300"
                                    >
                                      {JSON.stringify(audit.metadata, null, 2)}
                                    </pre>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                        </TabsContent>
                        <TabsContent value="elements" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">
                              Login candidates
                            </p>
                            {latestLoginCandidates ? (
                              <div className="mt-2 grid gap-3 md:grid-cols-2">
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Inputs
                                  </p>
                                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                                    {(latestLoginCandidates.inputs as Array<{
                                      tag: string;
                                      id: string | null;
                                      name: string | null;
                                      type: string | null;
                                      placeholder: string | null;
                                      ariaLabel: string | null;
                                      score: number;
                                    }> | undefined)?.map((input, index) => (
                                      <div key={`${input.name}-${index}`}>
                                        <span className="text-slate-100">
                                          {input.name ||
                                            input.id ||
                                            input.type ||
                                            "input"}
                                        </span>{" "}
                                        <span className="text-gray-500">
                                          score {input.score}
                                        </span>
                                      </div>
                                    )) ?? (
                                      <p className="text-gray-500">
                                        No inputs captured.
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Buttons
                                  </p>
                                  <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                                    {(latestLoginCandidates.buttons as Array<{
                                      tag: string;
                                      id: string | null;
                                      name: string | null;
                                      type: string | null;
                                      text: string | null;
                                      score: number;
                                    }> | undefined)?.map((button, index) => (
                                      <div key={`${button.text}-${index}`}>
                                        <span className="text-slate-100">
                                          {button.text ||
                                            button.id ||
                                            button.name ||
                                            "button"}
                                        </span>{" "}
                                        <span className="text-gray-500">
                                          score {button.score}
                                        </span>
                                      </div>
                                    )) ?? (
                                      <p className="text-gray-500">
                                        No buttons captured.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-gray-500">
                                No candidate elements captured yet.
                              </p>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="ui" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">
                              UI inventory
                            </p>
                            {latestUiInventory ? (
                              <div className="mt-2 space-y-3">
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Counts
                                  </p>
                                  <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                                    {Object.entries(
                                      (latestUiInventory.counts as Record<string, number>) || {}
                                    ).map(([key, value]) => (
                                      <span key={key}>
                                        {key}: {value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  {(
                                    [
                                      "inputs",
                                      "buttons",
                                      "links",
                                      "headings",
                                      "forms",
                                    ] as const
                                  ).map((section) => (
                                    <div
                                      key={section}
                                      className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200"
                                    >
                                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                        {section}
                                      </p>
                                      <div className="mt-1 max-h-32 space-y-1 overflow-y-auto text-[10px] text-gray-400">
                                        {(
                                          (latestUiInventory as Record<string, unknown>)[
                                            section
                                          ] as Array<{
                                            selector?: string | null;
                                            text?: string | null;
                                            name?: string | null;
                                            id?: string | null;
                                            type?: string | null;
                                          }> | undefined
                                        )?.map((item, index) => (
                                          <div key={`${section}-${index}`}>
                                            <span className="text-slate-100">
                                              {item.text ||
                                                item.name ||
                                                item.id ||
                                                item.type ||
                                                "item"}
                                            </span>
                                            {item.selector ? (
                                              <span className="ml-2 text-gray-500">
                                                {item.selector}
                                              </span>
                                            ) : null}
                                          </div>
                                        )) ?? (
                                          <span>No {section} captured.</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-gray-500">
                                No UI inventory captured yet.
                              </p>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="debug" className="mt-4">
                          <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <p className="text-[11px] text-gray-500">Agent debug</p>
                            <div className="mt-2 space-y-3">
                              {agentRunDetails?.planState ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Settings
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(agentRunDetails.planState, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestPlannerContext ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Planner context
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(latestPlannerContext.metadata, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestPlanReplan ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Latest replan
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(latestPlanReplan.metadata, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestPlanAdapt ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Latest adaptation
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(latestPlanAdapt.metadata, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestSelfCheckReplan ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Latest self-check replan
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(latestSelfCheckReplan.metadata, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestLoopGuard ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Loop guard
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(latestLoopGuard.metadata, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {latestSelfImprovementContext ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Self-improvement context
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(
                                      latestSelfImprovementContext.metadata,
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              ) : null}
                              {latestSelfImprovementPlaybook ? (
                                <div className="rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                    Self-improvement playbook
                                  </p>
                                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-gray-300">
                                    {JSON.stringify(
                                      latestSelfImprovementPlaybook.metadata,
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              ) : null}
                              {!agentRunDetails?.planState &&
                              !latestPlannerContext &&
                              !latestPlanReplan &&
                              !latestPlanAdapt &&
                              !latestSelfCheckReplan &&
                              !latestLoopGuard &&
                              !latestSelfImprovementContext &&
                              !latestSelfImprovementPlaybook ? (
                                <p className="text-gray-500">
                                  No debug data captured yet.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </ModalShell>
                </div>
              </div>
            ) : null}
            {latestAgentRunId ? (
              <div className="rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Live browser</span>
                  <span>
                    {agentPreviewStatus === "live"
                      ? "Live"
                      : agentPreviewStatus === "connecting"
                        ? "Connecting..."
                        : agentPreviewStatus === "error"
                          ? "Error"
                          : "Idle"}
                  </span>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-[11px] text-slate-200 hover:border-slate-700"
                  onClick={() => setAgentProgressOpen((prev) => !prev)}
                >
                  <span className="text-slate-400">Agent progress:</span>{" "}
                  {latestAgentRunStatus
                    ? latestAgentRunStatus.replace("_", " ")
                    : "unknown"}{" "}
                  ·{" "}
                  {currentPlanStep
                    ? `Current: ${currentPlanStep.title}`
                    : "No active step"}
                </button>
                <div className="mt-2 text-[10px] text-slate-400">
                  Robots:{" "}
                  {latestAgentIgnoreRobots
                    ? "Ignored"
                    : robotsStatus || "Unknown"}
                </div>
                {latestAgentRunStatus === "waiting_human" &&
                (resolveApprovalStepId(agentRunDetails?.planState ?? null) ||
                  latestApprovalStepId) ? (
                  <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Approval required:{" "}
                        {agentPlanSteps.find(
                          (step) =>
                            step.id ===
                            (resolveApprovalStepId(agentRunDetails?.planState ?? null) ||
                              latestApprovalStepId)
                        )?.title || "Unknown step"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={agentStepActionBusyId !== null}
                        onClick={() =>
                          approveAgentStep(
                            (resolveApprovalStepId(agentRunDetails?.planState ?? null) ||
                              latestApprovalStepId)!
                          )
                        }
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex items-start justify-center gap-4">
                  <div
                    className={`w-full max-w-[520px] max-h-[360px] overflow-hidden rounded-md border bg-slate-900 ${
                      highlightedSnapshotId &&
                      highlightedSnapshotId === agentPreviewSnapshot?.id
                        ? "border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)]"
                        : "border-slate-800"
                    }`}
                  >
                    {agentPreviewSnapshot?.screenshotPath ||
                    agentPreviewSnapshot?.screenshotData ? (
                      <img
                        src={
                          agentPreviewSnapshot.screenshotPath
                            ? `/api/chatbot/agent/${latestAgentRunId}/assets/${agentPreviewSnapshot.screenshotPath}`
                            : agentPreviewSnapshot.screenshotData ?? ""
                        }
                        alt="Agent preview"
                        className="h-auto w-full object-contain"
                      />
                    ) : (
                      <div className="flex min-h-[180px] items-center justify-center text-xs text-slate-500">
                        No preview available yet.
                      </div>
                    )}
                  </div>
                  {agentProgressOpen ? (
                    <div className="w-full max-w-[320px] max-h-[360px] overflow-y-auto rounded-md border border-slate-800 bg-slate-900/70 p-3 text-[11px] text-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Agent progress
                      </p>
                      {renderPlannerNotes(agentPlanMeta)}
                      {agentPlanSteps.length === 0 ? (
                        <p className="mt-2 text-slate-500">No steps yet.</p>
                      ) : (
                        <ol className="mt-2 space-y-2">
                          {agentPlanSteps.map((step) => (
                            <li
                              key={step.id}
                              className="rounded-md border border-slate-800 px-2 py-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span
                                  className={`rounded-full px-2 py-[1px] text-[9px] uppercase tracking-wide ${
                                    step.status === "completed"
                                      ? "bg-emerald-500/15 text-emerald-200"
                                      : step.status === "running"
                                        ? "bg-blue-500/15 text-blue-200"
                                        : step.status === "failed"
                                          ? "bg-rose-500/15 text-rose-200"
                                          : "bg-slate-700/40 text-slate-300"
                                  }`}
                                >
                                  {step.status}
                                </span>
                                {step.snapshotId ? (
                                  <button
                                    type="button"
                                    className="text-[10px] text-emerald-200 hover:text-emerald-100"
                                    onClick={() => openSnapshotLightbox(step)}
                                  >
                                    Snapshot
                                  </button>
                                ) : null}
                              </div>
                              <p className="mt-1 text-slate-100">{step.title}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="text-[10px] uppercase tracking-wide text-slate-300 hover:text-white"
                                  onClick={() => openStepDetails(step)}
                                >
                                  View details
                                </button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    latestAgentRunStatus === "running" ||
                                    agentStepActionBusyId === step.id
                                  }
                                  onClick={() => retryAgentStep(step.id)}
                                >
                                  Retry
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    latestAgentRunStatus === "running" ||
                                    agentStepActionBusyId === step.id
                                  }
                                  onClick={() => overrideAgentStep(step.id, "completed")}
                                >
                                  Mark done
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    latestAgentRunStatus === "running" ||
                                    agentStepActionBusyId === step.id
                                  }
                                  onClick={() => overrideAgentStep(step.id, "failed")}
                                >
                                  Mark failed
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={agentControlUrl}
                    onChange={(event) => setAgentControlUrl(event.target.value)}
                    placeholder="https://example.com"
                    className="h-8 w-full min-w-[220px] flex-1 text-xs"
                    disabled={agentControlBusy}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={() => runAgentControl("goto", agentControlUrl)}
                    disabled={agentControlBusy}
                  >
                    Go
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => runAgentControl("reload")}
                    disabled={agentControlBusy}
                  >
                    Reload
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => runAgentControl("snapshot")}
                    disabled={agentControlBusy}
                  >
                    Snapshot
                  </Button>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
          <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
            <div className="rounded-md border border-gray-800 bg-gray-950/70 p-3">
              <Textarea
                placeholder="Ask the assistant..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={3}
                disabled={!sessionReady}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={sendMessage}
                  disabled={isSending || !sessionReady}
                  className={isSending ? "opacity-60" : undefined}
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-200">
                {webSearchEnabled ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-100"
                    onClick={() => setWebSearchEnabled(false)}
                  >
                    Web search
                    <span className="text-blue-200">×</span>
                  </button>
                ) : null}
                {useGlobalContext ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-100"
                    onClick={() => setUseGlobalContext(false)}
                  >
                    Global context
                    <span className="text-blue-200">×</span>
                  </button>
                ) : null}
                {useLocalContext ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-100"
                    onClick={() => setUseLocalContext(false)}
                  >
                    Local context
                    <span className="text-blue-200">×</span>
                  </button>
                ) : null}
                {agentModeEnabled ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-100"
                    onClick={() => setAgentModeEnabled(false)}
                  >
                    Agent mode
                    <span className="text-blue-200">×</span>
                  </button>
                ) : null}
                {!webSearchEnabled &&
                !useGlobalContext &&
                !useLocalContext &&
                !agentModeEnabled ? (
                  <span className="text-gray-500">No tools enabled.</span>
                ) : null}
              </div>
              <div className="mt-2 w-48">
                <Select
                  value={toolSelectValue}
                  onValueChange={(value) => {
                    if (value === "websearch") {
                      setWebSearchEnabled(true);
                    }
                    if (value === "global-context") {
                      setUseGlobalContext(true);
                    }
                    if (value === "local-context") {
                      setUseLocalContext(true);
                    }
                    if (value === "agent-mode") {
                      setAgentModeEnabled(true);
                    }
                    setToolSelectValue("add");
                  }}
                  disabled={isSending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Select tool</SelectItem>
                    {!webSearchEnabled ? (
                      <SelectItem value="websearch">Web search</SelectItem>
                    ) : null}
                    {!useGlobalContext ? (
                      <SelectItem value="global-context">Global context</SelectItem>
                    ) : null}
                    {!useLocalContext ? (
                      <SelectItem value="local-context">Local context</SelectItem>
                    ) : null}
                    {!agentModeEnabled ? (
                      <SelectItem value="agent-mode">Agent mode</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {webSearchEnabled || agentModeEnabled ? (
                  <div className="w-48">
                    <label className="text-xs text-gray-400">Search provider</label>
                    <Select
                      value={searchProvider}
                      onValueChange={(value) => setSearchProvider(value)}
                      disabled={isSending}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brave">Brave</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="serpapi">SerpApi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {agentModeEnabled ? (
                  <div className="w-48">
                    <label className="text-xs text-gray-400">Agent browser</label>
                    <Select
                      value={agentBrowser}
                      onValueChange={(value) => setAgentBrowser(value)}
                      disabled={isSending}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Browser" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chromium">Chromium</SelectItem>
                        <SelectItem value="firefox">Firefox</SelectItem>
                        <SelectItem value="webkit">WebKit</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                      <input
                        type="checkbox"
                        checked={agentRunHeadless}
                        onChange={(event) =>
                          setAgentRunHeadless(event.target.checked)
                        }
                        disabled={isSending}
                      />
                      Run headless
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                      <input
                        type="checkbox"
                        checked={agentIgnoreRobotsTxt}
                        onChange={(event) =>
                          setAgentIgnoreRobotsTxt(event.target.checked)
                        }
                        disabled={isSending}
                      />
                      Ignore robots.txt
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                      <input
                        type="checkbox"
                        checked={agentRequireHumanApproval}
                        onChange={(event) =>
                          setAgentRequireHumanApproval(event.target.checked)
                        }
                        disabled={isSending}
                      />
                      Require human approval for risky steps
                    </label>
                  </div>
                ) : null}
                {agentModeEnabled ? (
                  <div className="w-full max-w-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">Agent settings</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAgentBrowser(DEFAULT_AGENT_SETTINGS.agentBrowser);
                          setAgentRunHeadless(DEFAULT_AGENT_SETTINGS.runHeadless);
                          setAgentIgnoreRobotsTxt(
                            DEFAULT_AGENT_SETTINGS.ignoreRobotsTxt
                          );
                          setAgentRequireHumanApproval(
                            DEFAULT_AGENT_SETTINGS.requireHumanApproval
                          );
                          setAgentMaxSteps(DEFAULT_AGENT_SETTINGS.maxSteps);
                          setAgentMaxStepAttempts(
                            DEFAULT_AGENT_SETTINGS.maxStepAttempts
                          );
                          setAgentMaxReplanCalls(
                            DEFAULT_AGENT_SETTINGS.maxReplanCalls
                          );
                          setAgentReplanEverySteps(
                            DEFAULT_AGENT_SETTINGS.replanEverySteps
                          );
                          setAgentMaxSelfChecks(DEFAULT_AGENT_SETTINGS.maxSelfChecks);
                        }}
                        disabled={isSending}
                      >
                        Reset defaults
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] text-gray-400">
                          Max steps
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={agentMaxSteps}
                          onChange={(event) =>
                            setAgentMaxSteps(Number(event.target.value))
                          }
                          disabled={isSending}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">
                          Max step attempts
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={agentMaxStepAttempts}
                          onChange={(event) =>
                            setAgentMaxStepAttempts(Number(event.target.value))
                          }
                          disabled={isSending}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">
                          Replan every N steps
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={agentReplanEverySteps}
                          onChange={(event) =>
                            setAgentReplanEverySteps(Number(event.target.value))
                          }
                          disabled={isSending}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">
                          Max replan calls
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={6}
                          value={agentMaxReplanCalls}
                          onChange={(event) =>
                            setAgentMaxReplanCalls(Number(event.target.value))
                          }
                          disabled={isSending}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">
                          Max self-checks
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          value={agentMaxSelfChecks}
                          onChange={(event) =>
                            setAgentMaxSelfChecks(Number(event.target.value))
                          }
                          disabled={isSending}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-400">Model</label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-48">
                    <Select
                      value={model}
                      onValueChange={(value) => setModel(value)}
                      disabled={isSending || modelLoading || modelOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setModelLoading(true);
                      try {
                        const res = await fetchWithTimeout("/api/chatbot");
                        if (!res.ok) {
                          const error = (await res.json()) as {
                            error?: string;
                            errorId?: string;
                          };
                          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
                          throw new Error(
                            `${error.error || "Failed to load models."}${suffix}`
                          );
                        }
                        const data = (await res.json()) as { models?: string[] };
                        const models = (data.models || []).filter(Boolean);
                        setModelOptions(models);
                        if (models.length > 0 && !models.includes(model)) {
                          setModel(models[0]);
                        }
                        toast("Model list refreshed", { variant: "success" });
                      } catch (error) {
                        const message = isAbortError(error)
                          ? "Loading models timed out."
                          : error instanceof Error
                            ? error.message
                            : "Failed to load models.";
                        toast(message, { variant: "error" });
                      } finally {
                        setModelLoading(false);
                      }
                    }}
                    disabled={isSending || modelLoading}
                  >
                    Refresh
                  </Button>
                </div>
                {modelOptions.length === 0 && !modelLoading ? (
                  <p className="mt-2 text-xs text-gray-500">
                    No models found. Pull one with `ollama pull llama3`.
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Attachments</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttachments([])}
                  disabled={attachments.length === 0}
                >
                  Clear attachments
                </Button>
              </div>
              <input
                type="file"
                multiple
                className="mt-2 block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-200 hover:file:bg-gray-700"
                onChange={(event) => {
                  const next = Array.from(event.target.files ?? []);
                  if (next.length > 0) {
                    setAttachments((prev) => [...prev, ...next]);
                  }
                  event.target.value = "";
                }}
              />
              {attachments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <button
                      key={`${file.name}-${file.lastModified}`}
                      type="button"
                      className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-200 hover:border-gray-500"
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((item) => item !== file)
                        )
                      }
                    >
                      {file.name}
                      <span className="ml-1 text-gray-500">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Add multiple files if needed.
                </p>
              )}
            </div>
            {useLocalContext ? (
              <div>
                <Label className="text-xs text-gray-200">Conversation context</Label>
                <p className="text-[11px] text-gray-500">
                  Choose whether local context overrides or appends the global context.
                </p>
                <div className="mt-2 w-40">
                  <Select
                    value={localContextMode}
                    onValueChange={(value) =>
                      setLocalContextMode(value as "override" | "append")
                    }
                    disabled={isSending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Context mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="override">Override</SelectItem>
                      <SelectItem value="append">Append</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  className="mt-2"
                  placeholder="Provide context for this conversation..."
                  value={localContext}
                  onChange={(event) => setLocalContext(event.target.value)}
                  rows={3}
                  disabled={isSending}
                />
              </div>
            ) : null}
            <div className="rounded-md border border-gray-800 bg-gray-950/70 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-200">Debugging</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-[11px] text-gray-400">
                    <input
                      type="checkbox"
                      checked={debugEnabled}
                      onChange={(event) => setDebugEnabled(event.target.checked)}
                    />
                    Enable debugging
                  </label>
                  {debugEnabled && (debugState.lastRequest || debugState.lastResponse) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDebugState({})}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
              {!debugEnabled ? (
                <p className="mt-2 text-xs text-gray-500">
                  Enable to capture request and response metadata.
                </p>
              ) : (
                <div className="mt-3 space-y-3 text-xs text-gray-300">
                  <div>
                    <p className="text-[11px] uppercase text-gray-500">Last request</p>
                    {debugState.lastRequest ? (
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] text-gray-500">Model</dt>
                          <dd>{debugState.lastRequest.model}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Tools</dt>
                          <dd>
                            {debugState.lastRequest.tools.length > 0
                              ? debugState.lastRequest.tools.join(", ")
                              : "None"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Search provider</dt>
                          <dd>{debugState.lastRequest.searchProvider || "Default"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Agent browser</dt>
                          <dd>{debugState.lastRequest.agentBrowser || "Default"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Ignore robots</dt>
                          <dd>{debugState.lastRequest.ignoreRobotsTxt ? "Yes" : "No"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">
                            Human approval
                          </dt>
                          <dd>
                            {debugState.lastRequest.requireHumanApproval ? "Yes" : "No"}
                          </dd>
                        </div>
                        {debugState.lastRequest.agentPlanSettings ? (
                          <div>
                            <dt className="text-[11px] text-gray-500">
                              Agent settings
                            </dt>
                            <dd>
                              {`steps ${debugState.lastRequest.agentPlanSettings.maxSteps}, attempts ${debugState.lastRequest.agentPlanSettings.maxStepAttempts}, replan every ${debugState.lastRequest.agentPlanSettings.replanEverySteps}, replans ${debugState.lastRequest.agentPlanSettings.maxReplanCalls}, self-checks ${debugState.lastRequest.agentPlanSettings.maxSelfChecks}`}
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="text-[11px] text-gray-500">Messages</dt>
                          <dd>{debugState.lastRequest.messageCount}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Attachments</dt>
                          <dd>{debugState.lastRequest.attachmentCount}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Global context</dt>
                          <dd>{debugState.lastRequest.hasGlobalContext ? "Yes" : "No"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Local context</dt>
                          <dd>
                            {debugState.lastRequest.hasLocalContext
                              ? `Yes (${debugState.lastRequest.localContextMode})`
                              : "No"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Search used</dt>
                          <dd>{debugState.lastRequest.searchUsed ? "Yes" : "No"}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-2 text-gray-500">No request sent yet.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-gray-500">Last response</p>
                    {debugState.lastResponse ? (
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] text-gray-500">Status</dt>
                          <dd>{debugState.lastResponse.ok ? "Success" : "Error"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-gray-500">Duration</dt>
                          <dd>{debugState.lastResponse.durationMs} ms</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-[11px] text-gray-500">Error</dt>
                          <dd>{debugState.lastResponse.error || "None"}</dd>
                        </div>
                        {debugState.lastResponse.errorId ? (
                          <div className="sm:col-span-2">
                            <dt className="text-[11px] text-gray-500">Error ID</dt>
                            <dd>{debugState.lastResponse.errorId}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-2 text-gray-500">No response captured yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
