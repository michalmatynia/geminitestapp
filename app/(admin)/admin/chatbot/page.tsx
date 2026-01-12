"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
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
  };
  lastResponse?: {
    ok: boolean;
    durationMs: number;
    error?: string;
    errorId?: string;
  };
};

type AgentRunSummary = {
  id: string;
  prompt: string;
  model: string | null;
  status: string;
  requiresHumanIntervention: boolean;
  searchProvider?: string | null;
  agentBrowser?: string | null;
  createdAt: string;
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

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

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
  const [toolSelectValue, setToolSelectValue] = useState("add");
  const [globalContext, setGlobalContext] = useState("");
  const [localContext, setLocalContext] = useState("");
  const [localContextMode, setLocalContextMode] = useState<"override" | "append">(
    "override"
  );
  const [contextLoading, setContextLoading] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({});
  const [agentRuns, setAgentRuns] = useState<AgentRunSummary[]>([]);
  const [agentRunsLoading, setAgentRunsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const initStartedRef = useRef(false);
  const sessionReady = Boolean(sessionId) && !initError;

  const loadAgentRuns = async () => {
    setAgentRunsLoading(true);
    try {
      const res = await fetchWithTimeout("/api/chatbot/agent");
      if (!res.ok) {
        throw new Error("Failed to load agent runs.");
      }
      const data = (await res.json()) as { runs?: AgentRunSummary[] };
      setAgentRuns(data.runs ?? []);
    } catch (error) {
      const message = isAbortError(error)
        ? "Loading agent runs timed out."
        : error instanceof Error
          ? error.message
          : "Failed to load agent runs.";
      toast(message, { variant: "error" });
    } finally {
      setAgentRunsLoading(false);
    }
  };

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
            }
            await fetchMessages(activeSessionId);
            if (!isMounted) return;
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
    void loadAgentRuns();
  }, []);

  const sendMessage = async () => {
    if (!sessionReady) {
      toast("Chat session is not ready yet.", { variant: "error" });
      return;
    }
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isSending) {
      return;
    }
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
    const nextMessages = [
      ...messages,
      { role: "user", content: `${trimmed}${searchNote}${attachmentNote}`.trim() },
    ];
    setMessages(nextMessages);
    setInput("");

    try {
      if (sessionId) {
        await fetchWithTimeout(
          `/api/chatbot/sessions/${sessionId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "user",
              content: `${trimmed}${searchNote}${attachmentNote}`.trim(),
            }),
          },
          12000
        );
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
          },
        });
      }
      const startedAt = Date.now();
      const res = agentModeEnabled
        ? await fetchWithTimeout(
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
              }),
            },
            20000
          )
        : hasFiles
          ? await fetchWithTimeout(
              "/api/chatbot",
              {
                method: "POST",
                body: (() => {
                  const formData = new FormData();
                  formData.append("messages", JSON.stringify(payloadMessages));
                  formData.append("model", model);
                  attachments.forEach((file) => {
                    formData.append("files", file, file.name);
                  });
                  return formData;
                })(),
              },
              20000
            )
          : await fetchWithTimeout(
              "/api/chatbot",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: payloadMessages, model }),
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

      if (agentModeEnabled) {
        const data = (await res.json()) as { runId: string; status: string };
        const agentReply = `Agent mode queued a run (${data.runId}). Check the run queue for progress.`;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: agentReply,
          },
        ]);
        if (sessionId) {
          await fetchWithTimeout(
            `/api/chatbot/sessions/${sessionId}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "assistant", content: agentReply }),
            },
            12000
          );
        }
        void loadAgentRuns();
      } else {
        const data = (await res.json()) as { message: string };
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        if (sessionId) {
          await fetchWithTimeout(
            `/api/chatbot/sessions/${sessionId}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "assistant", content: data.message }),
            },
            12000
          );
        }
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
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white">Chatbot</h1>
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
        <div className="flex min-h-[420px] flex-col rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
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
                <Label className="text-xs text-gray-200">Agent runs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadAgentRuns()}
                  disabled={agentRunsLoading}
                >
                  {agentRunsLoading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              {agentRuns.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  No agent runs yet. Enable Agent mode to queue one.
                </p>
              ) : (
                <div className="mt-3 space-y-2 text-xs text-gray-300">
                  {agentRuns.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-gray-800 bg-gray-900 px-3 py-2"
                    >
                      <div>
                        <p className="text-[11px] text-gray-500">
                          {run.status.replace("_", " ")}
                          {run.requiresHumanIntervention ? " · needs input" : ""}
                        </p>
                        <p className="text-gray-200 line-clamp-2">{run.prompt}</p>
                        {(run.searchProvider || run.agentBrowser) ? (
                          <p className="text-[11px] text-gray-500">
                            {run.searchProvider ? `Search: ${run.searchProvider}` : ""}
                            {run.searchProvider && run.agentBrowser ? " · " : ""}
                            {run.agentBrowser ? `Browser: ${run.agentBrowser}` : ""}
                          </p>
                        ) : null}
                      </div>
                      {["queued", "running", "waiting_human"].includes(run.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetchWithTimeout(
                                `/api/chatbot/agent/${run.id}`,
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "stop" }),
                                },
                                12000
                              );
                              if (!res.ok) {
                                throw new Error("Failed to stop agent run.");
                              }
                              void loadAgentRuns();
                            } catch (error) {
                              const message = isAbortError(error)
                                ? "Stopping agent run timed out."
                                : error instanceof Error
                                  ? error.message
                                  : "Failed to stop agent run.";
                              toast(message, { variant: "error" });
                            }
                          }}
                        >
                          Stop
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
