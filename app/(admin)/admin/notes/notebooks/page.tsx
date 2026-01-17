"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import type { NotebookRecord } from "@/types/notes";
import { useRouter } from "next/navigation";

export default function NotebooksPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<NotebookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [menuNotebookId, setMenuNotebookId] = useState<string | null>(null);

  const fetchNotebooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
      if (!response.ok) {
        toast("Failed to load notebooks", { variant: "error" });
        return;
      }
      const data = (await response.json()) as NotebookRecord[];
      setNotebooks(data);
      if (!selectedNotebookId && data[0]?.id) {
        updateSettings({ selectedNotebookId: data[0].id });
      }
    } catch (error) {
      console.error("Failed to load notebooks:", error);
      toast("Failed to load notebooks", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedNotebookId, toast, updateSettings]);

  useEffect(() => {
    void fetchNotebooks();
  }, [fetchNotebooks]);

  useEffect(() => {
    if (!selectedNotebookId && notebooks.length > 0) {
      updateSettings({ selectedNotebookId: notebooks[0].id });
    }
  }, [selectedNotebookId, notebooks, updateSettings]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast("Notebook name is required", { variant: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) {
        toast("Failed to create notebook", { variant: "error" });
        return;
      }
      setName("");
      await fetchNotebooks();
      toast("Notebook created", { variant: "success" });
    } catch (error) {
      console.error("Failed to create notebook:", error);
      toast("Failed to create notebook", { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStart = (notebook: NotebookRecord) => {
    setEditingId(notebook.id);
    setEditingName(notebook.name);
    setMenuNotebookId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) {
      toast("Notebook name is required", { variant: "error" });
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/notes/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!response.ok) {
        toast("Failed to update notebook", { variant: "error" });
        return;
      }
      const updated = (await response.json()) as NotebookRecord;
      setNotebooks((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast("Notebook updated", { variant: "success" });
      handleEditCancel();
    } catch (error) {
      console.error("Failed to update notebook:", error);
      toast("Failed to update notebook", { variant: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notebook and all its notes/tags/folders?")) return;
    try {
      const response = await fetch(`/api/notes/notebooks/${id}`, { method: "DELETE" });
      if (!response.ok) {
        toast("Failed to delete notebook", { variant: "error" });
        return;
      }
      setNotebooks((prev) => prev.filter((item) => item.id !== id));
      if (selectedNotebookId === id) {
        updateSettings({ selectedNotebookId: null });
      }
      toast("Notebook deleted", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      toast("Failed to delete notebook", { variant: "error" });
    }
  };

  const handleDuplicate = async (notebook: NotebookRecord) => {
    const baseName = notebook.name.trim();
    const existing = notebooks
      .filter((item) => item.name.startsWith(baseName))
      .map((item) => {
        const match = item.name.match(/\((\d+)\)$/);
        return match ? Number(match[1]) : 0;
      });
    const nextNumber = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const newName = `${baseName} (${nextNumber})`;
    try {
      const response = await fetch("/api/notes/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
        }),
      });
      if (!response.ok) {
        toast("Failed to duplicate notebook", { variant: "error" });
        return;
      }
      await fetchNotebooks();
      toast("Notebook duplicated", { variant: "success" });
    } catch (error) {
      console.error("Failed to duplicate notebook:", error);
      toast("Failed to duplicate notebook", { variant: "error" });
    } finally {
      setMenuNotebookId(null);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Notebooks</h1>
        <p className="text-sm text-gray-400">
          Create and manage notebooks. Notes, folders, and tags are scoped per notebook.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Create Notebook</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Notebook Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                placeholder="Enter notebook name"
              />
            </div>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Notebooks</h2>
            <Button variant="outline" onClick={fetchNotebooks}>
              Refresh
            </Button>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400">Loading notebooks...</div>
          ) : notebooks.length === 0 ? (
            <div className="text-sm text-gray-500">No notebooks created yet.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {notebooks.map((notebook) => {
                const isEditing = editingId === notebook.id;
                const isActive = selectedNotebookId === notebook.id;
                return (
                  <div
                    key={notebook.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 cursor-pointer transition hover:border-gray-700 hover:bg-gray-800/20"
                    onClick={() => {
                      updateSettings({ selectedNotebookId: notebook.id });
                      router.push("/admin/notes");
                    }}
                  >
                    <div className="flex flex-1 items-center gap-3">
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-white"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleEditStart(notebook)}
                            className="text-left text-sm text-gray-200 hover:text-white"
                          >
                            {notebook.name}
                          </button>
                          {isActive && (
                            <span className="text-[11px] text-blue-300">Active</span>
                          )}
                        </div>
                      )}
                    </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdate(notebook.id)}
                            disabled={isUpdating}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <></>
                      )}
                      {!isEditing && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuNotebookId((prev) =>
                                prev === notebook.id ? null : notebook.id
                              );
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            aria-label={`Notebook actions for ${notebook.name}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuNotebookId === notebook.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setMenuNotebookId(null)}
                              />
                              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-gray-700 bg-gray-900 p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEditStart(notebook);
                                    setMenuNotebookId(null);
                                  }}
                                  onClickCapture={(event) => event.stopPropagation()}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(notebook)}
                                  onClickCapture={(event) => event.stopPropagation()}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(notebook.id)}
                                  onClickCapture={(event) => event.stopPropagation()}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-red-300 hover:bg-gray-800"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
