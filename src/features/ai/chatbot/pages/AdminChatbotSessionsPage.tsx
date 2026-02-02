import { Button, Input, useToast, Label, Checkbox, ListPanel, SectionHeader, SectionPanel, ConfirmDialog, EmptyState, SearchInput } from "@/shared/ui";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";









import type { ChatbotSessionListItem } from "../types";
import * as chatbotApi from "../api";

export default function ChatbotSessionsPage(): React.JSX.Element {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatbotSessionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [skipBulkConfirm, setSkipBulkConfirm] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatbotSessionListItem | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const clearSelection = (): void => setSelectedIds(new Set());
  const selectAllVisible = (): void => setSelectedIds(new Set(filteredSessions.map((s: ChatbotSessionListItem): string => s.id)));
  const selectAllMatching = (): void => setSelectedIds(new Set(filteredSessions.map((s: ChatbotSessionListItem): string => s.id)));
  const toggleSelected = (id: string): void => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect((): (() => void) => {
    let isMounted: boolean = true;
    const loadSessions = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await chatbotApi.fetchChatbotSessions<ChatbotSessionListItem>();
        if (isMounted) {
          setSessions(data.sessions || []);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message: string =
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
    return (): void => {
      isMounted = false;
    };
  }, [toast]);

  const filteredSessions = useMemo((): ChatbotSessionListItem[] => {
    const term: string = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session: ChatbotSessionListItem): boolean => {
      const title: string = session.title?.toLowerCase() || "";
      return title.includes(term) || session.id.toLowerCase().includes(term);
    });
  }, [query, sessions]);

  const startEditing = (session: ChatbotSessionListItem): void => {
    setEditingId(session.id);
    setDraftTitle(session.title || "");
  };

  const cancelEditing = (): void => {
    setEditingId(null);
    setDraftTitle("");
  };

  const saveTitle = async (sessionId: string): Promise<void> => {
    try {
      const updatedSession = await chatbotApi.updateChatbotSessionTitle(
        sessionId,
        draftTitle
      );
      setSessions((prev: ChatbotSessionListItem[]): ChatbotSessionListItem[] =>
        prev.map((session: ChatbotSessionListItem) =>
          session.id === sessionId ? updatedSession : session
        )
      );
      cancelEditing();
      toast("Session title updated", { variant: "success" });
    } catch (error: unknown) {
      const message: string =
        error instanceof Error
          ? error.message
          : "Failed to update session title.";
      setError(message);
      toast(message, { variant: "error" });
    }
  };

  const deleteSession = async (session: ChatbotSessionListItem): Promise<void> => {
    setDeletingId(session.id);
    try {
      await chatbotApi.deleteChatbotSession(session.id);
      setSessions((prev: ChatbotSessionListItem[]): ChatbotSessionListItem[] => prev.filter((item: ChatbotSessionListItem): boolean => item.id !== session.id));
      if (editingId === session.id) {
        cancelEditing();
      }
      setSelectedIds((prev: Set<string>): Set<string> => {
        if (!prev.has(session.id)) return prev;
        const next: Set<string> = new Set(prev);
        next.delete(session.id);
        return next;
      });
      toast("Session deleted", { variant: "success" });
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : "Failed to delete session.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setDeletingId(null);
      setSessionToDelete(null);
    }
  };

  const handleBulkDeleteClick = (): void => {
    if (selectedIds.size === 0) return;
    if (skipBulkConfirm) {
      void bulkDelete();
    } else {
      setIsBulkDeleteConfirmOpen(true);
    }
  };

  const bulkDelete = async (): Promise<void> => {
    setBulkDeleting(true);
    try {
      await chatbotApi.deleteChatbotSessions(Array.from(selectedIds));
      setSessions((prev: ChatbotSessionListItem[]): ChatbotSessionListItem[] => prev.filter((item: ChatbotSessionListItem): boolean => !selectedIds.has(item.id)));
      clearSelection();
      toast("Selected sessions deleted", { variant: "success" });
    } catch (error: unknown) {
      const message: string =
        error instanceof Error ? error.message : "Failed to delete sessions.";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setBulkDeleting(false);
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const showList: boolean = !loading && !error && sessions.length > 0;

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="Chat Sessions"
            eyebrow={(
              <Link
                href="/admin/chatbot"
                className="text-blue-300 hover:text-blue-200"
              >
                ← Back to chatbot
              </Link>
            )}
          />
        }
        alerts={
          error ? <p className="text-sm text-red-400">{error}</p> : null
        }
        filters={
          showList ? (
            <SectionPanel>
              <div className="max-w-sm">
                <SearchInput
                  placeholder="Search sessions..."
                  value={query}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)}
                  onClear={() => setQuery("")}
                  className="h-8 text-sm"
                />
              </div>
            </SectionPanel>
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
                  filteredSessions.length === 0 || bulkDeleting
                }
              >
                Select all visible
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void selectAllMatching(); }}
                disabled={bulkDeleting}
              >
                Select all (all pages)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={
                  selectedIds.size === 0 || bulkDeleting
                }
              >
                Clear selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={
                  selectedIds.size === 0 || bulkDeleting
                }
              >
                {bulkDeleting ? "Removing..." : "Remove selected"}
              </Button>
              <Label className="flex items-center gap-2 text-[11px] text-gray-500">
                <Checkbox
                  checked={skipBulkConfirm}
                  onCheckedChange={(checked: boolean): void =>
                    setSkipBulkConfirm(Boolean(checked))
                  }
                  disabled={bulkDeleting}
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
          <EmptyState
            title="No sessions yet"
            description="Start a chat with an agent to see your session history here."
            action={
              <Link href="/admin/chatbot">
                <Button>Start Chatting</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session: ChatbotSessionListItem): React.JSX.Element => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border border-border bg-gray-900 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(session.id)}
                    onCheckedChange={(): void => toggleSelected(session.id)}
                    aria-label={`Select session ${session.title || session.id}`}
                    className="mt-1"
                  />
                  <div>
                    {editingId === session.id ? (
                      <Input
                        value={draftTitle}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setDraftTitle(event.target.value)}
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
                        onClick={() => { void saveTitle(session.id); }}
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
                      onClick={(): void => startEditing(session)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === session.id}
                    onClick={() => setSessionToDelete(session)}
                  >
                    {deletingId === session.id ? "Removing..." : "Remove"}
                  </Button>
                  <Link
                    href={`/admin/chatbot?session=${session.id}`}
                    onClick={(): void => toast("Opening session...")}
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

      <ConfirmDialog
        open={!!sessionToDelete}
        onOpenChange={(open: boolean) => !open && setSessionToDelete(null)}
        onConfirm={(): void => { if (sessionToDelete) { void deleteSession(sessionToDelete); } }}
        title="Delete Session"
        description={`Are you sure you want to delete session "${sessionToDelete?.title || 'this session'}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={isBulkDeleteConfirmOpen}
        onOpenChange={(open: boolean) => setIsBulkDeleteConfirmOpen(open)}
        onConfirm={(): void => { void bulkDelete(); }}
        title="Delete Sessions"
        description={`Are you sure you want to delete ${selectedIds.size} selected sessions? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
      />
    </div>
  );
}
