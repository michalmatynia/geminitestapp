"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import type { TagRecord } from "@/types/notes";

export default function NoteTagsPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#3b82f6");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    try {
      if (!selectedNotebookId) {
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/tags?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        toast("Failed to load tags", { variant: "error" });
        return;
      }
      const data = (await response.json()) as TagRecord[];
      setTags(data);
    } catch (error) {
      console.error("Failed to load tags:", error);
      toast("Failed to load tags", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTags();
  }, [selectedNotebookId]);

  useEffect(() => {
    if (selectedNotebookId) return;
    let isActive = true;
    const loadNotebooks = async () => {
      try {
        const response = await fetch("/api/notes/notebooks", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Array<{ id: string }>;
        const firstId = data[0]?.id;
        if (isActive && firstId) {
          updateSettings({ selectedNotebookId: firstId });
        }
      } catch (error) {
        console.error("Failed to load notebooks:", error);
      }
    };
    void loadNotebooks();
    return () => {
      isActive = false;
    };
  }, [selectedNotebookId, updateSettings]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast("Tag name is required", { variant: "error" });
      return;
    }
    setIsSaving(true);
    try {
      if (!selectedNotebookId) return;
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, notebookId: selectedNotebookId }),
      });
      if (!response.ok) {
        toast("Failed to create tag", { variant: "error" });
        return;
      }
      setName("");
      await fetchTags();
      toast("Tag created", { variant: "success" });
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast("Failed to create tag", { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm("Delete this tag? It will be removed from all notes.")) return;
    try {
      const response = await fetch(`/api/notes/tags/${tagId}`, { method: "DELETE" });
      if (!response.ok) {
        toast("Failed to delete tag", { variant: "error" });
        return;
      }
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      toast("Tag deleted", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast("Failed to delete tag", { variant: "error" });
    }
  };

  const handleEditStart = (tag: TagRecord) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color || "#3b82f6");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("#3b82f6");
  };

  const handleUpdate = async (tagId: string) => {
    if (!editingName.trim()) {
      toast("Tag name is required", { variant: "error" });
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/notes/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
          color: editingColor,
        }),
      });
      if (!response.ok) {
        toast("Failed to update tag", { variant: "error" });
        return;
      }
      const updated = (await response.json()) as TagRecord;
      setTags((prev) => prev.map((tag) => (tag.id === tagId ? updated : tag)));
      toast("Tag updated", { variant: "success" });
      handleEditCancel();
    } catch (error) {
      console.error("Failed to update tag:", error);
      toast("Failed to update tag", { variant: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Note Tags</h1>
        <p className="text-sm text-gray-400">
          Create and remove tags used in the Notes app.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Search</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tags..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
          />
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Create Tag</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Tag Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-20 rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Existing Tags</h2>
            <Button variant="outline" onClick={fetchTags}>
              Refresh
            </Button>
          </div>
          {loading ? (
            <div className="text-sm text-gray-400">Loading tags...</div>
          ) : filteredTags.length === 0 ? (
            <div className="text-sm text-gray-500">No tags created yet.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTags.map((tag) => {
                const isEditing = editingId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || "#3b82f6" }}
                      />
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-white"
                          />
                          <input
                            type="color"
                            value={editingColor}
                            onChange={(event) => setEditingColor(event.target.value)}
                            className="h-8 w-14 rounded border border-gray-700 bg-gray-800"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-200">{tag.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdate(tag.id)}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStart(tag)}
                        >
                          Edit
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id)}
                        className="text-gray-400 hover:text-red-400"
                        aria-label={`Delete ${tag.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
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
