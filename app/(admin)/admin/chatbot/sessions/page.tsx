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
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-4 py-3"
                >
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
