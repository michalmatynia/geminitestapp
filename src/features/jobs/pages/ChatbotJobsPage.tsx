"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useToast } from "@/shared/ui/toast";
import { SectionHeader } from "@/shared/components/section-header";
import { SectionPanel } from "@/shared/components/section-panel";

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

export default function ChatbotJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ChatbotJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeletingJobs, setBulkDeletingJobs] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot/jobs");
      if (!res.ok) {
        throw new Error("Failed to load jobs.");
      }
      const data = (await res.json()) as { jobs?: ChatbotJob[] };
      setJobs(data.jobs ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load jobs.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = [...jobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!term) return sorted;
    return sorted.filter((job) => {
      const payload = job.payload as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      const userMessage = payload?.messages
        ?.filter((msg) => msg.role === "user")
        .at(-1)?.content;
      return [
        job.id,
        job.status,
        job.model ?? "",
        job.sessionId,
        userMessage ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [jobs, query]);

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
      const message =
        error instanceof Error ? error.message : "Failed to cancel job.";
      toast(message, { variant: "error" });
    } finally {
      setCancelingId(null);
    }
  };

  const deleteJob = async (jobId: string, force = false) => {
    setDeletingId(jobId);
    try {
      const confirmed = window.confirm(
        "Delete this job permanently? This cannot be undone."
      );
      if (!confirmed) return;
      const url = force
        ? `/api/chatbot/jobs/${jobId}?force=true`
        : `/api/chatbot/jobs/${jobId}`;
      const res = await fetch(url, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete job.");
      }
      await loadJobs();
      toast("Job deleted", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete job.";
      toast(message, { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteCompletedJobs = async () => {
    setBulkDeletingJobs(true);
    try {
      const confirmed = window.confirm(
        "Delete all completed jobs? This cannot be undone."
      );
      if (!confirmed) return;
      const res = await fetch("/api/chatbot/jobs?scope=terminal", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete jobs.");
      }
      await loadJobs();
      toast("Completed jobs deleted", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete jobs.";
      toast(message, { variant: "error" });
    } finally {
      setBulkDeletingJobs(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Chatbot Jobs"
        eyebrow={(
          <Link
            href="/admin/chatbot"
            className="text-blue-300 hover:text-blue-200"
          >
            ← Back to chatbot
          </Link>
        )}
        className="mb-6"
      />
      <SectionPanel className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            className="max-w-sm h-8 text-sm"
            placeholder="Search jobs..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadJobs();
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void deleteCompletedJobs()}
              disabled={bulkDeletingJobs}
            >
              {bulkDeletingJobs ? "Deleting jobs..." : "Delete completed jobs"}
            </Button>
          </div>
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
                className="rounded-md border border-border bg-gray-900 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Chat job
                    </p>
                    <p className="text-sm text-white">
                      {job.status.toUpperCase()} · {job.model || "Default model"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    {job.payload ? (
                      <p className="mt-2 text-xs text-gray-300">
                        Prompt:{" "}
                        {(() => {
                          const payload = job.payload as {
                            messages?: Array<{
                              role?: string;
                              content?: string;
                            }>;
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
                    {job.errorMessage ? (
                      <p className="mt-1 text-xs text-red-300">
                        {job.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/chatbot?session=${job.sessionId}`}>
                      <Button variant="outline" size="sm">
                        Open session
                      </Button>
                    </Link>
                    {(["pending", "running"] as const).includes(job.status) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelingId === job.id}
                        onClick={() => void cancelJob(job.id)}
                      >
                        {cancelingId === job.id ? "Canceling..." : "Cancel"}
                      </Button>
                    ) : null}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === job.id}
                      onClick={() => void deleteJob(job.id)}
                    >
                      {deletingId === job.id ? "Deleting..." : "Delete"}
                    </Button>
                    {job.status === "running" ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === job.id}
                        onClick={() => void deleteJob(job.id, true)}
                      >
                        {deletingId === job.id
                          ? "Deleting..."
                          : "Force delete"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
