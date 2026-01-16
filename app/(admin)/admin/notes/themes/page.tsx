"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import type { ThemeRecord } from "@/types/notes";

const defaultTheme: Omit<ThemeRecord, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  notebookId: null,
  textColor: "#e2e8f0",
  backgroundColor: "#0f172a",
  markdownHeadingColor: "#f8fafc",
  markdownLinkColor: "#38bdf8",
  markdownCodeBackground: "#0b1220",
  markdownCodeText: "#e2e8f0",
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: "#34d399",
  relatedNoteBackgroundColor: "#0f3a2f",
  relatedNoteTextColor: "#ecfdf5",
};

export default function NoteThemesPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultTheme);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState(defaultTheme);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchThemes = async () => {
    setLoading(true);
    try {
      if (!selectedNotebookId) {
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ notebookId: selectedNotebookId });
      const response = await fetch(`/api/notes/themes?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        toast("Failed to load themes", { variant: "error" });
        return;
      }
      const data = (await response.json()) as ThemeRecord[];
      setThemes(data);
    } catch (error) {
      console.error("Failed to load themes:", error);
      toast("Failed to load themes", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchThemes();
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
    if (!form.name.trim()) {
      toast("Theme name is required", { variant: "error" });
      return;
    }
    setIsSaving(true);
    try {
      if (!selectedNotebookId) return;
      const response = await fetch("/api/notes/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.name.trim(), notebookId: selectedNotebookId }),
      });
      if (!response.ok) {
        toast("Failed to create theme", { variant: "error" });
        return;
      }
      setForm(defaultTheme);
      await fetchThemes();
      toast("Theme created", { variant: "success" });
    } catch (error) {
      console.error("Failed to create theme:", error);
      toast("Failed to create theme", { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (themeId: string) => {
    if (!confirm("Delete this theme?")) return;
    try {
      const response = await fetch(`/api/notes/themes/${themeId}`, { method: "DELETE" });
      if (!response.ok) {
        toast("Failed to delete theme", { variant: "error" });
        return;
      }
      setThemes((prev) => prev.filter((theme) => theme.id !== themeId));
      toast("Theme deleted", { variant: "success" });
    } catch (error) {
      console.error("Failed to delete theme:", error);
      toast("Failed to delete theme", { variant: "error" });
    }
  };

  const handleEditStart = (theme: ThemeRecord) => {
    setEditingId(theme.id);
    setEditingForm({
      name: theme.name,
      notebookId: theme.notebookId ?? null,
      textColor: theme.textColor,
      backgroundColor: theme.backgroundColor,
      markdownHeadingColor: theme.markdownHeadingColor,
      markdownLinkColor: theme.markdownLinkColor,
      markdownCodeBackground: theme.markdownCodeBackground,
      markdownCodeText: theme.markdownCodeText,
      relatedNoteBorderWidth: theme.relatedNoteBorderWidth,
      relatedNoteBorderColor: theme.relatedNoteBorderColor,
      relatedNoteBackgroundColor: theme.relatedNoteBackgroundColor,
      relatedNoteTextColor: theme.relatedNoteTextColor,
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingForm(defaultTheme);
  };

  const handleUpdate = async (themeId: string) => {
    if (!editingForm.name.trim()) {
      toast("Theme name is required", { variant: "error" });
      return;
    }
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/notes/themes/${themeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingForm, name: editingForm.name.trim() }),
      });
      if (!response.ok) {
        toast("Failed to update theme", { variant: "error" });
        return;
      }
      const updated = (await response.json()) as ThemeRecord;
      setThemes((prev) => prev.map((theme) => (theme.id === themeId ? updated : theme)));
      toast("Theme updated", { variant: "success" });
      handleEditCancel();
    } catch (error) {
      console.error("Failed to update theme:", error);
      toast("Failed to update theme", { variant: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Note Themes</h1>
        <p className="text-sm text-gray-400">
          Create and manage themes for your notes.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Create Theme</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Theme Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                placeholder="Enter theme name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Text Color
              </label>
              <input
                type="color"
                value={form.textColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, textColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Background Color
              </label>
              <input
                type="color"
                value={form.backgroundColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, backgroundColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Markdown Heading
              </label>
              <input
                type="color"
                value={form.markdownHeadingColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, markdownHeadingColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Markdown Link
              </label>
              <input
                type="color"
                value={form.markdownLinkColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, markdownLinkColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Code Background
              </label>
              <input
                type="color"
                value={form.markdownCodeBackground}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, markdownCodeBackground: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Code Text
              </label>
              <input
                type="color"
                value={form.markdownCodeText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, markdownCodeText: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Related Border Width
              </label>
              <input
                type="number"
                min={0}
                max={8}
                value={form.relatedNoteBorderWidth}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteBorderWidth: Number(event.target.value),
                  }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800 px-3 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Related Border Color
              </label>
              <input
                type="color"
                value={form.relatedNoteBorderColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relatedNoteBorderColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Related Background
              </label>
              <input
                type="color"
                value={form.relatedNoteBackgroundColor}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteBackgroundColor: event.target.value,
                  }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Related Text Color
              </label>
              <input
                type="color"
                value={form.relatedNoteTextColor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relatedNoteTextColor: event.target.value }))
                }
                className="h-10 w-full rounded border border-gray-700 bg-gray-800"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Existing Themes</h2>
            <Button variant="outline" onClick={fetchThemes}>
              Refresh
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading themes...</p>
          ) : themes.length === 0 ? (
            <p className="text-sm text-gray-400">No themes created yet.</p>
          ) : (
            <div className="space-y-4">
              {themes.map((theme) => {
                const isEditing = editingId === theme.id;
                const values = isEditing ? editingForm : theme;
                return (
                  <div
                    key={theme.id}
                    className="rounded-lg border border-gray-800 bg-gray-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{theme.name}</div>
                        <div className="text-xs text-gray-500">
                          Updated {new Date(theme.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={() => handleUpdate(theme.id)}
                              disabled={isUpdating}
                              size="sm"
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </Button>
                            <Button onClick={handleEditCancel} variant="outline" size="sm">
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => handleEditStart(theme)} variant="outline" size="sm">
                            Edit
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(theme.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500/40 text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Theme Name</label>
                        <input
                          type="text"
                          value={values.name}
                          disabled={!isEditing}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Text</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.textColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({ ...prev, textColor: event.target.value }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Background</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.backgroundColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              backgroundColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Heading</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.markdownHeadingColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownHeadingColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Link</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.markdownLinkColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownLinkColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Code Bg</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.markdownCodeBackground}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownCodeBackground: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">Code Text</label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.markdownCodeText}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownCodeText: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">
                          Related Border Width
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={8}
                          disabled={!isEditing}
                          value={values.relatedNoteBorderWidth}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              relatedNoteBorderWidth: Number(event.target.value),
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 px-3 text-sm text-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">
                          Related Border Color
                        </label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.relatedNoteBorderColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              relatedNoteBorderColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">
                          Related Background
                        </label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.relatedNoteBackgroundColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              relatedNoteBackgroundColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-gray-400">
                          Related Text Color
                        </label>
                        <input
                          type="color"
                          disabled={!isEditing}
                          value={values.relatedNoteTextColor}
                          onChange={(event) =>
                            isEditing &&
                            setEditingForm((prev) => ({
                              ...prev,
                              relatedNoteTextColor: event.target.value,
                            }))
                          }
                          className="h-9 w-full rounded border border-gray-700 bg-gray-800 disabled:opacity-60"
                        />
                      </div>
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
