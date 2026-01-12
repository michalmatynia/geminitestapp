"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import ModalShell from "@/components/ui/modal-shell";

type ChatbotJob = {
  id: string;
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  model: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  payload?: unknown;
};

type UnifiedJob =
  | {
      kind: "chat";
      id: string;
      createdAt: string;
      status: ChatbotJob["status"];
      model: string | null;
      sessionId: string;
      errorMessage: string | null;
      payload?: unknown;
    }
  | {
      kind: "agent";
      id: string;
      createdAt: string;
      status: string;
      model: string | null;
      prompt: string;
      errorMessage?: string | null;
      requiresHumanIntervention: boolean;
      snapshotCount: number;
      logCount: number;
    };

type AgentRun = {
  id: string;
  prompt: string;
  model: string | null;
  status: string;
  requiresHumanIntervention: boolean;
  searchProvider?: string | null;
  agentBrowser?: string | null;
  runHeadless?: boolean | null;
  errorMessage?: string | null;
  logLines: string[];
  recordingPath?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    browserSnapshots: number;
    browserLogs: number;
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

type AgentBrowserLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type AgentAuditLog = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export default function ChatbotJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ChatbotJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [selectedAgentRunId, setSelectedAgentRunId] = useState<string | null>(null);
  const [agentSnapshot, setAgentSnapshot] = useState<AgentSnapshot | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentBrowserLog[]>([]);
  const [agentAudits, setAgentAudits] = useState<AgentAuditLog[]>([]);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>(
    {}
  );
  const [agentStreamStatus, setAgentStreamStatus] = useState<
    "idle" | "connecting" | "live" | "error"
  >("idle");

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot/jobs");
      if (!res.ok) {
        throw new Error("Failed to load jobs.");
      }
      const data = (await res.json()) as { jobs?: ChatbotJob[] };
      setJobs(data.jobs ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load jobs.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const loadAgentRuns = async () => {
    setAgentLoading(true);
    try {
      const res = await fetch("/api/chatbot/agent");
      if (!res.ok) {
        throw new Error("Failed to load agent runs.");
      }
      const data = (await res.json()) as { runs?: AgentRun[] };
      setAgentRuns(data.runs ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load agent runs.";
      toast(message, { variant: "error" });
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    void loadAgentRuns();
  }, []);

  useEffect(() => {
    if (!selectedAgentRunId) return;
    setExpandedAuditIds({});
    let isMounted = true;
    setAgentStreamStatus("connecting");
    const source = new EventSource(
      `/api/chatbot/agent/${selectedAgentRunId}/stream`
    );
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { snapshot?: AgentSnapshot | null };
        if (payload.snapshot) {
          setAgentSnapshot(payload.snapshot);
        }
        setAgentStreamStatus("live");
      } catch {
        setAgentStreamStatus("error");
      }
    };
    source.onerror = () => {
      setAgentStreamStatus("error");
      source.close();
    };

    const loadSnapshot = async () => {
      try {
        const res = await fetch(`/api/chatbot/agent/${selectedAgentRunId}/snapshots`);
        if (!res.ok) {
          throw new Error("Failed to load agent snapshots.");
        }
        const data = (await res.json()) as { snapshots?: AgentSnapshot[] };
        if (isMounted) {
          setAgentSnapshot(data.snapshots?.[0] ?? null);
        }
      } catch {
        // ignore
      }
    };

    const loadLogs = async () => {
      try {
        const res = await fetch(`/api/chatbot/agent/${selectedAgentRunId}/logs`);
        if (!res.ok) {
          throw new Error("Failed to load agent logs.");
        }
        const data = (await res.json()) as { logs?: AgentBrowserLog[] };
        if (isMounted) {
          setAgentLogs(data.logs ?? []);
        }
      } catch {
        // ignore
      }
    };

    const loadAudits = async () => {
      try {
        const res = await fetch(`/api/chatbot/agent/${selectedAgentRunId}/audits`);
        if (!res.ok) {
          throw new Error("Failed to load agent steps.");
        }
        const data = (await res.json()) as { audits?: AgentAuditLog[] };
        if (isMounted) {
          setAgentAudits(data.audits ?? []);
        }
      } catch {
        // ignore
      }
    };

    void loadSnapshot();
    void loadLogs();
    void loadAudits();
    const logTimer = setInterval(() => {
      void loadLogs();
      void loadAudits();
    }, 5000);

    return () => {
      isMounted = false;
      source.close();
      clearInterval(logTimer);
    };
  }, [selectedAgentRunId]);

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    const combined: UnifiedJob[] = [
      ...jobs.map((job) => ({
        kind: "chat" as const,
        id: job.id,
        createdAt: job.createdAt,
        status: job.status,
        model: job.model,
        sessionId: job.sessionId,
        errorMessage: job.errorMessage,
        payload: job.payload,
      })),
      ...agentRuns.map((run) => ({
        kind: "agent" as const,
        id: run.id,
        createdAt: run.createdAt,
        status: run.status,
        model: run.model,
        prompt: run.prompt,
        errorMessage: run.errorMessage,
        requiresHumanIntervention: run.requiresHumanIntervention,
        snapshotCount: run._count.browserSnapshots,
        logCount: run._count.browserLogs,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!term) return combined;
    return combined.filter((job) =>
      [
        job.id,
        job.status,
        job.model ?? "",
        job.kind === "chat" ? job.sessionId : job.prompt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, agentRuns, query]);

  const cancelJob = async (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      toast("Job not found.", { variant: "error" });
      return;
    }
    setCancelingId(job.id);
    try {
      const res = await fetch(`/api/chatbot/jobs/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        throw new Error("Failed to cancel job.");
      }
      await loadJobs();
      toast("Job canceled", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel job.";
      toast(message, { variant: "error" });
    } finally {
      setCancelingId(null);
    }
  };

  const selectedAgentRun = useMemo(
    () => agentRuns.find((run) => run.id === selectedAgentRunId) ?? null,
    [agentRuns, selectedAgentRunId]
  );

  const closeAgentModal = () => {
    setSelectedAgentRunId(null);
    setAgentSnapshot(null);
    setAgentLogs([]);
    setAgentAudits([]);
    setAgentStreamStatus("idle");
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/admin/chatbot" className="text-sm text-blue-300 hover:text-blue-200">
          ← Back to chatbot
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Chatbot Jobs</h1>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            className="max-w-sm"
            placeholder="Search jobs..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadJobs();
              void loadAgentRuns();
            }}
            disabled={loading || agentLoading}
          >
            {loading || agentLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading jobs...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : filteredJobs.length === 0 ? (
          <p className="text-sm text-gray-400">No jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-md border border-gray-800 bg-gray-900 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {job.kind === "agent" ? "Agent job" : "Chat job"}
                    </p>
                    <p className="text-sm text-white">
                      {job.status.toUpperCase()} · {job.model || "Default model"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    {job.kind === "chat" && job.payload ? (
                      <p className="mt-2 text-xs text-gray-300">
                        Prompt:{" "}
                        {(() => {
                          const payload = job.payload as {
                            messages?: Array<{ role?: string; content?: string }>;
                          };
                          const userMessage = payload.messages
                            ?.filter((msg) => msg.role === "user")
                            .at(-1)?.content;
                          return userMessage
                            ? userMessage.slice(0, 160)
                            : "Unavailable";
                        })()}
                      </p>
                    ) : null}
                    {job.kind === "agent" ? (
                      <div className="mt-2 text-xs text-gray-400">
                        <p className="text-xs text-gray-300 line-clamp-2">
                          Prompt: {job.prompt}
                        </p>
                        Snapshots: {job.snapshotCount} · Logs: {job.logCount}
                        {job.requiresHumanIntervention ? " · needs input" : ""}
                      </div>
                    ) : null}
                    {job.errorMessage ? (
                      <p className="mt-1 text-xs text-red-300">{job.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.kind === "chat" ? (
                      <>
                        <Link href={`/admin/chatbot?session=${job.sessionId}`}>
                          <Button variant="outline" size="sm">
                            Open session
                          </Button>
                        </Link>
                        {["pending", "running"].includes(job.status) ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancelingId === job.id}
                            onClick={() => void cancelJob(job.id)}
                          >
                            {cancelingId === job.id ? "Canceling..." : "Cancel"}
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAgentRunId(job.id)}
                      >
                        View details
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedAgentRunId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeAgentModal}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <ModalShell
              title="Agent job details"
              onClose={closeAgentModal}
              size="xl"
            >
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="dom">DOM</TabsTrigger>
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-4 space-y-3">
                  {selectedAgentRun ? (
                    <div className="rounded-md border border-gray-800 bg-gray-900 p-3 text-xs text-gray-300">
                      <p className="text-[11px] text-gray-500">Run summary</p>
                      <p className="mt-1 text-sm text-white">
                        {selectedAgentRun.prompt}
                      </p>
                      <div className="mt-2 text-xs text-gray-400">
                        Status: {selectedAgentRun.status.replace("_", " ")} · Model:{" "}
                        {selectedAgentRun.model || "Default"}
                        {selectedAgentRun.requiresHumanIntervention
                          ? " · needs input"
                          : ""}
                      </div>
                      {selectedAgentRun.recordingPath ? (
                        <div className="mt-2 text-xs text-gray-400">
                          Recording:{" "}
                          <a
                            className="text-emerald-300 hover:text-emerald-200"
                            href={`/api/chatbot/agent/${selectedAgentRun.id}/assets/${selectedAgentRun.recordingPath}`}
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
                        {agentStreamStatus === "live"
                          ? "Live"
                          : agentStreamStatus === "connecting"
                            ? "Connecting..."
                            : agentStreamStatus === "error"
                              ? "Fallback"
                              : "Idle"}
                      </span>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-md border border-gray-800 bg-gray-900">
                      {agentSnapshot?.screenshotPath ||
                      agentSnapshot?.screenshotData ? (
                        <div className="relative">
                          <img
                            src={
                              agentSnapshot.screenshotPath
                                ? `/api/chatbot/agent/${selectedAgentRunId}/assets/${agentSnapshot.screenshotPath}`
                                : agentSnapshot.screenshotData ?? ""
                            }
                            alt="Agent preview"
                            className="h-auto w-full"
                          />
                          {agentSnapshot.mouseX !== null &&
                          agentSnapshot.mouseY !== null &&
                          agentSnapshot.viewportWidth &&
                          agentSnapshot.viewportHeight ? (
                            <div
                              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                              style={{
                                left: `${
                                  (agentSnapshot.mouseX / agentSnapshot.viewportWidth) *
                                  100
                                }%`,
                                top: `${
                                  (agentSnapshot.mouseY / agentSnapshot.viewportHeight) *
                                  100
                                }%`,
                              }}
                            />
                          ) : null}
                        </div>
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
                      {agentSnapshot?.domText || "No DOM captured yet."}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="steps" className="mt-4">
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    <p className="text-[11px] text-gray-500">Agent steps</p>
                    <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                      {agentAudits.length === 0 ? (
                        <p className="text-gray-500">No steps yet.</p>
                      ) : (
                        agentAudits.map((step) => (
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
                            <p className="mt-1 text-gray-200">{step.message}</p>
                            {step.metadata ? (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className="text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-200"
                                  onClick={() =>
                                    setExpandedAuditIds((prev) => ({
                                      ...prev,
                                      [step.id]: !prev[step.id],
                                    }))
                                  }
                                >
                                  {expandedAuditIds[step.id]
                                    ? "Hide metadata"
                                    : "Show metadata"}
                                </button>
                                {expandedAuditIds[step.id] ? (
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
                <TabsContent value="logs" className="mt-4">
                  <div className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                    <p className="text-[11px] text-gray-500">Logs</p>
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-800 bg-gray-900 p-2 text-[11px] text-gray-200">
                      {agentLogs.length === 0 ? (
                        <p className="text-gray-500">No logs yet.</p>
                      ) : (
                        agentLogs.map((log) => (
                          <p key={log.id}>
                            [{log.level}] {log.message}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ModalShell>
          </div>
        </div>
      ) : null}
    </div>
  );
}
