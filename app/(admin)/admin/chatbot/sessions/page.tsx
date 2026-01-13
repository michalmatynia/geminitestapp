"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type ChatbotSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ChatbotSessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [skipBulkConfirm, setSkipBulkConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/chatbot/sessions");
        if (!res.ok) {
          throw new Error("Failed to load sessions.");
        }
        const data = (await res.json()) as { sessions: ChatbotSession[] };
        if (isMounted) {
          setSessions(data.sessions || []);
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Failed to load sessions.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSessions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) => {
      const title = session.title?.toLowerCase() || "";
      return title.includes(term) || session.id.toLowerCase().includes(term);
    });
  }, [query, sessions]);

  const startEditing = (session: ChatbotSession) => {
    setEditingId(session.id);
    setDraftTitle(session.title || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const saveTitle = async (sessionId: string) => {
    try {
      const res = await fetch("/api/chatbot/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: draftTitle }),
      });
      if (!res.ok) {
        throw new Error("Failed to update session title.");
      }
      const data = (await res.json()) as { session: ChatbotSession };
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? data.session : session
        )
      );
      cancelEditing();
      toast("Session title updated", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update session title.";
      setError(message);
      toast(message, { variant: "error" });
    }
  };

  const deleteSession = async (session: ChatbotSession) => {
    const confirmed = window.confirm(
      `Delete "${session.title || `Session ${session.id.slice(0, 6)}`}"?`
    );
    if (!confirmed) return;
    setDeletingId(session.id);
    try {
      const res = await fetch("/api/chatbot/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      if (!res.ok) {
        throw new Error("Failed to delete session.");
      }
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      if (editingId === session.id) {
        cancelEditing();
      }
      setSelectedIds((prev) => {
        if (!prev.has(session.id)) return prev;
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
      toast("Session deleted", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete session.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelected = (sessionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredSessions.map((session) => session.id)));
  };

  const selectAllMatching = async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    try {
      const params = new URLSearchParams({ scope: "ids" });
      const term = query.trim();
      if (term) params.set("query", term);
      const res = await fetch(`/api/chatbot/sessions?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load session ids.");
      }
      const data = (await res.json()) as { ids?: string[] };
      const ids = Array.isArray(data.ids) ? data.ids : [];
      setSelectedIds(new Set(ids));
      toast(
        ids.length
          ? `Selected ${ids.length} sessions`
          : "No matching sessions found",
        { variant: "default" }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to select sessions.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setSelectingAll(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!skipBulkConfirm) {
      const confirmed = window.confirm(
        `Delete ${selectedIds.size} selected session${
          selectedIds.size === 1 ? "" : "s"
        }?`
      );
      if (!confirmed) return;
    }
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/chatbot/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        throw new Error("Failed to delete sessions.");
      }
      setSessions((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      clearSelection();
      toast("Selected sessions deleted", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete sessions.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/admin/chatbot" className="text-sm text-blue-300 hover:text-blue-200">
          ← Back to chatbot
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Chat Sessions</h1>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading sessions...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="max-w-sm">
              <Input
                placeholder="Search sessions..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const value = query.trim();
                    if (!value) {
                      toast("Search cleared", { variant: "default" });
                    } else {
                      toast(`Searching “${value}”`, { variant: "default" });
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>
                Selected: {selectedIds.size}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                disabled={filteredSessions.length === 0 || bulkDeleting || selectingAll}
              >
                Select all visible
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllMatching}
                disabled={bulkDeleting || selectingAll}
              >
                {selectingAll ? "Selecting..." : "Select all (all pages)"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedIds.size === 0 || bulkDeleting || selectingAll}
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting || selectingAll}
              >
                {bulkDeleting ? "Removing..." : "Remove selected"}
              </Button>
              <label className="flex items-center gap-2 text-[11px] text-gray-500">
                <input
                  type="checkbox"
                  checked={skipBulkConfirm}
                  onChange={(event) => setSkipBulkConfirm(event.target.checked)}
                  disabled={bulkDeleting || selectingAll}
                />
                Skip confirmation
              </label>
            </div>
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(session.id)}
                      onChange={() => toggleSelected(session.id)}
                      aria-label={`Select session ${session.title || session.id}`}
                      className="mt-1"
                    />
                    <div>
                    {editingId === session.id ? (
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="max-w-xs"
                        placeholder="Session title"
                      />
                    ) : (
                      <p className="text-sm text-white">
                        {session.title || `Session ${session.id.slice(0, 6)}`}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Updated {new Date(session.updatedAt).toLocaleString()}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === session.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void saveTitle(session.id)}
                        >
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(session)}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === session.id}
                      onClick={() => void deleteSession(session)}
                    >
                      {deletingId === session.id ? "Removing..." : "Remove"}
                    </Button>
                    <Link
                      href={`/admin/chatbot?session=${session.id}`}
                      onClick={() =>
                        toast("Opening session...", { variant: "default" })
                      }
                    >
                      <Button variant="outline" size="sm">
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {filteredSessions.length === 0 ? (
                <p className="text-sm text-gray-500">No matching sessions.</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
