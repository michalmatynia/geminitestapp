"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MemoryItem = {
  id: string;
  memoryKey: string;
  runId: string | null;
  content: string;
  summary: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  importance: number | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AgentMemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryKey, setMemoryKey] = useState("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (memoryKey.trim()) params.set("memoryKey", memoryKey.trim());
    if (tag.trim()) params.set("tag", tag.trim());
    if (query.trim()) params.set("q", query.trim());
    if (limit) params.set("limit", String(limit));
    return params.toString();
  }, [memoryKey, tag, query, limit]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/chatbot/memory?${queryString}`);
        if (!res.ok) {
          const data = (await res.json()) as { error?: string; errorId?: string };
          const suffix = data.errorId ? ` (Error ID: ${data.errorId})` : "";
          throw new Error(`${data.error || "Failed to load memory."}${suffix}`);
        }
        const data = (await res.json()) as { items?: MemoryItem[] };
        if (isMounted) {
          setItems(data.items ?? []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load memory.";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [queryString]);

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Agent Long-Term Memory</h1>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href="/admin/chatbot">Back to chatbot</Link>
          </Button>
        </div>
        <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-gray-400">Memory key</label>
              <Input
                value={memoryKey}
                onChange={(event) => setMemoryKey(event.target.value)}
                placeholder="run-id or tenant key"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Tag</label>
              <Input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder="problem-solution"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Search</label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="query text"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Limit</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          {loading ? (
            <p className="text-gray-400">Loading memory…</p>
          ) : error ? (
            <p className="text-rose-300">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-gray-400">No memory entries found.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-gray-800 bg-gray-950 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <span>Key: {item.memoryKey}</span>
                    <span>Updated: {formatDate(item.updatedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">
                    {item.summary || item.content.slice(0, 240)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                    {item.tags?.length ? (
                      item.tags.map((tagValue) => (
                        <span
                          key={`${item.id}-${tagValue}`}
                          className="rounded-full border border-gray-800 bg-gray-900 px-2 py-[1px]"
                        >
                          {tagValue}
                        </span>
                      ))
                    ) : (
                      <span>No tags</span>
                    )}
                    <span>Importance: {item.importance ?? "—"}</span>
                    <span>Run: {item.runId ?? "—"}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Created: {formatDate(item.createdAt)} · Last accessed:{" "}
                    {formatDate(item.lastAccessedAt)}
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-[11px] uppercase tracking-wide text-gray-400 hover:text-gray-200"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                    >
                      {expanded[item.id] ? "Hide details" : "Show details"}
                    </button>
                  </div>
                  {expanded[item.id] ? (
                    <div className="mt-2 space-y-2 text-[11px] text-gray-200">
                      <div>
                        <p className="text-[10px] uppercase text-gray-500">
                          Content
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900 p-2 text-[10px] text-gray-200">
                          {item.content}
                        </pre>
                      </div>
                      {item.metadata ? (
                        <div>
                          <p className="text-[10px] uppercase text-gray-500">
                            Metadata
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900 p-2 text-[10px] text-gray-200">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
