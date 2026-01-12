"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import ModalShell from "@/components/ui/modal-shell";
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
  createdAt: string;
};

type AgentPlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  snapshotId?: string | null;
  logCount?: number | null;
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
  const [agentControlUrl, setAgentControlUrl] = useState("");
  const [agentControlBusy, setAgentControlBusy] = useState(false);
  const [agentPlanSteps, setAgentPlanSteps] = useState<AgentPlanStep[]>([]);
  const [stepDetailsOpen, setStepDetailsOpen] = useState(false);
  const [stepDetailsLoading, setStepDetailsLoading] = useState(false);
  const [stepDetailsTitle, setStepDetailsTitle] = useState("");
  const [stepDetailsSnapshot, setStepDetailsSnapshot] =
    useState<AgentSnapshot | null>(null);
  const [stepDetailsLogs, setStepDetailsLogs] = useState<AgentBrowserLog[]>([]);
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [pollingReply, setPollingReply] = useState(false);
  const sessionReady = Boolean(sessionId) && !initError;

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
        const data = (await res.json()) as { run?: { status?: string } };
        if (isMounted) {
          setLatestAgentRunStatus(data.run?.status ?? null);
        }
      } catch {
        if (isMounted) {
          setLatestAgentRunStatus("unknown");
        }
      }
    };
    void pollStatus();
    const timer = setInterval(pollStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [latestAgentRunId]);

  useEffect(() => {
    if (!latestAgentRunId) {
      setAgentPreviewSnapshot(null);
      setAgentPreviewStatus("idle");
      setAgentPlanSteps([]);
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
        const normalizedSteps = steps.map((step, index) => ({
          ...step,
          id: step.id || `${latestAgentRunId}-${index}`,
        }));
        if (isMounted) {
          setAgentPlanSteps(normalizedSteps);
        }
      } catch {
        if (isMounted) {
          setAgentPlanSteps([]);
        }
      }
    };
    void loadPlan();
    return () => {
      isMounted = false;
    };
  }, [latestAgentRunId]);

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

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Chatbot</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/admin/chatbot/jobs">Jobs</Link>
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
                  <Link
                    href="/admin/chatbot/jobs"
                    className="text-[11px] text-blue-200 underline-offset-2 hover:underline"
                  >
                    View job details
                  </Link>
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
                {agentPlanSteps.length > 0 ? (
                  <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/80 p-2">
                    <p className="text-[11px] text-slate-400">Agent plan</p>
                    <ol className="mt-2 space-y-1 text-[11px] text-slate-200">
                      {agentPlanSteps.map((step) => (
                        <li
                          key={step.id}
                          className="flex items-start gap-2 rounded-md border border-slate-800 px-2 py-1"
                        >
                          <span className="mt-[2px] size-2 rounded-full bg-slate-600" />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-100">
                                {step.title}
                              </span>
                              <span
                                className={`rounded-full px-2 py-[2px] text-[10px] uppercase tracking-wide ${
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
                                <span className="rounded-full bg-slate-700/40 px-2 py-[2px] text-[10px] text-slate-300">
                                  Snapshot
                                </span>
                              ) : null}
                              {typeof step.logCount === "number" ? (
                                <span className="rounded-full bg-slate-700/40 px-2 py-[2px] text-[10px] text-slate-300">
                                  Logs: {step.logCount}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                className="text-[10px] uppercase tracking-wide text-emerald-200 hover:text-emerald-100"
                                onClick={() => openStepDetails(step)}
                              >
                                View details
                              </button>
                              <button
                                type="button"
                                className="text-[10px] uppercase tracking-wide text-blue-200 hover:text-blue-100"
                                onClick={() => jumpToStepSnapshot(step)}
                              >
                                Jump to snapshot
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <div
                  className={`mt-3 overflow-hidden rounded-md border bg-slate-900 ${
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
                      className="h-auto w-full"
                    />
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center text-xs text-slate-500">
                      No preview available yet.
                    </div>
                  )}
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
