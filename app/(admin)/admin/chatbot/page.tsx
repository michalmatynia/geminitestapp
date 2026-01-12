"use client";

import { useEffect, useState } from "react";

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
  };
  lastResponse?: {
    ok: boolean;
    durationMs: number;
    error?: string;
    errorId?: string;
  };
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
  const [toolSelectValue, setToolSelectValue] = useState("add");
  const [globalContext, setGlobalContext] = useState("");
  const [localContext, setLocalContext] = useState("");
  const [localContextMode, setLocalContextMode] = useState<"override" | "append">(
    "override"
  );
  const [contextLoading, setContextLoading] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({});

  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      setModelLoading(true);
      try {
        const res = await fetch("/api/chatbot");
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
        const message = error instanceof Error ? error.message : "Failed to load models.";
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
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) {
          const error = (await res.json()) as { error?: string };
          throw new Error(error.error || "Failed to load context.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const stored = data.find((item) => item.key === "chatbot_global_context");
        if (isMounted) {
          setGlobalContext(stored?.value || "");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load context.";
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

  const sendMessage = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isSending) {
      return;
    }

    let searchNote = "";
    if (webSearchEnabled && trimmed) {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, limit: 5 }),
        });
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
        const message =
          error instanceof Error ? error.message : "Web search failed.";
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
    setIsSending(true);

    try {
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
          },
        });
      }
      const startedAt = Date.now();
      const res = hasFiles
        ? await fetch("/api/chatbot", {
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
          })
        : await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: payloadMessages, model }),
          });

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

      const data = (await res.json()) as { message: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
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
      const message = error instanceof Error ? error.message : "Chatbot error.";
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
        <div className="flex min-h-[420px] flex-col rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.length === 0 ? (
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
                  {message.role === "assistant"
                    ? renderFormattedMessage(message.content)
                    : message.content}
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
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={sendMessage} disabled={isSending}>
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
                {!webSearchEnabled && !useGlobalContext && !useLocalContext ? (
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
                    setToolSelectValue("add");
                  }}
                  disabled={isSending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Select tool</SelectItem>
                    <SelectItem value="websearch">Web search</SelectItem>
                    <SelectItem value="global-context">Global context</SelectItem>
                    <SelectItem value="local-context">Local context</SelectItem>
                  </SelectContent>
                </Select>
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
                        const res = await fetch("/api/chatbot");
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
                        const message =
                          error instanceof Error
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
