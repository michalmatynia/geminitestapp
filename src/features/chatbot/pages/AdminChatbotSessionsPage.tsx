"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useToast } from "@/shared/ui/toast";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { ListPanel } from "@/shared/ui/list-panel";
import type { ChatbotSessionListItem } from "../types";
import * as chatbotApi from "../api";

export default function ChatbotSessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatbotSessionListItem[]>([]);
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
        const data = await chatbotApi.fetchChatbotSessions<ChatbotSessionListItem>();
        if (isMounted) {
          setSessions(data.sessions || []);
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error ? error.message : "Failed to load sessions.";
          setError(message);
          toast(message, { variant: "error" });
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
  }, [toast]);

  const filteredSessions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) => {
      const title = session.title?.toLowerCase() || "";
      return title.includes(term) || session.id.toLowerCase().includes(term);
    });
  }, [query, sessions]);

  const startEditing = (session: ChatbotSessionListItem) => {
    setEditingId(session.id);
    setDraftTitle(session.title || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const saveTitle = async (sessionId: string) => {
    try {
      const updatedSession = await chatbotApi.updateChatbotSessionTitle(
        sessionId,
        draftTitle
      );
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? updatedSession : session
        )
      );
      cancelEditing();
      toast("Session title updated", { variant: "success" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update session title.";
      setError(message);
      toast(message, { variant: "error" });
    }
  };

  const deleteSession = async (session: ChatbotSessionListItem) => {
    const confirmed = window.confirm(
      `Delete "${session.title || `Session ${session.id.slice(0, 6)}`}"?`
    );
    if (!confirmed) return;
    setDeletingId(session.id);
    try {
      await chatbotApi.deleteChatbotSession(session.id);
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
    toast(
      filteredSessions.length
        ? `Selected ${filteredSessions.length} visible sessions`
        : "No visible sessions to select"
    );
  };

  const selectAllMatching = async () => {
    if (selectingAll) return;
    setSelectingAll(true);
    try {
      const term = query.trim();
      const ids = await chatbotApi.fetchChatbotSessionIds(
        term || undefined
      );
      setSelectedIds(new Set(ids));
      toast(
        ids.length
          ? `Selected ${ids.length} sessions`
          : "No matching sessions found"
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
      await chatbotApi.deleteChatbotSessions(Array.from(selectedIds));
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

  const showList = !loading && !error && sessions.length > 0;

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <div>
            <Link
              href="/admin/chatbot"
              className="text-sm text-blue-300 hover:text-blue-200"
            >
              ← Back to chatbot
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-white">Chat Sessions</h1>
          </div>
        }
        alerts={
          error ? <p className="text-sm text-red-400">{error}</p> : null
        }
        filters={
          showList ? (
            <div className="max-w-sm">
              <Input
                placeholder="Search sessions..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const value = query.trim();
                    if (!value) {
                      toast("Search cleared");
                    } else {
                      toast(`Searching “${value}”`);
                    }
                  }
                }}
              />
            </div>
          ) : null
        }
        actions={
          showList ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>Selected: {selectedIds.size}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                disabled={
                  filteredSessions.length === 0 || bulkDeleting || selectingAll
                }
              >
                Select all visible
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void selectAllMatching()}
                disabled={bulkDeleting || selectingAll}
              >
                {selectingAll ? "Selecting..." : "Select all (all pages)"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={
                  selectedIds.size === 0 || bulkDeleting || selectingAll
                }
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void bulkDelete()}
                disabled={
                  selectedIds.size === 0 || bulkDeleting || selectingAll
                }
              >
                {bulkDeleting ? "Removing..." : "Remove selected"}
              </Button>
              <Label className="flex items-center gap-2 text-[11px] text-gray-500">
                <Checkbox
                  checked={skipBulkConfirm}
                  onCheckedChange={(checked) =>
                    setSkipBulkConfirm(Boolean(checked))
                  }
                  disabled={bulkDeleting || selectingAll}
                />
                Skip confirmation
              </Label>
            </div>
          ) : null
        }
      >
        {loading ? (
          <p className="text-sm text-gray-400">Loading sessions...</p>
        ) : error ? null : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(session.id)}
                    onCheckedChange={() => toggleSelected(session.id)}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                      >
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
                    onClick={() => toast("Opening session...")}
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
        )}
      </ListPanel>
    </div>
  );
}
