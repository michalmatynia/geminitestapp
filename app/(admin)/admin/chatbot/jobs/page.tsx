"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

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

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) =>
      [job.id, job.sessionId, job.status, job.model ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [jobs, query]);

  const cancelJob = async (job: ChatbotJob) => {
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
          <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}>
            Refresh
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
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
                    {job.errorMessage ? (
                      <p className="mt-1 text-xs text-red-300">{job.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
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
                        onClick={() => void cancelJob(job)}
                      >
                        {cancelingId === job.id ? "Canceling..." : "Cancel"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
