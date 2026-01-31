"use client";

import { Button, useToast, Input, Label, SectionHeader, SectionPanel } from "@/shared/ui";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";


import { useNoteSettings } from "@/features/notesapp/hooks/NoteSettingsContext";
import { useNotebooks, useNoteTags } from "@/features/notesapp/api/useNoteQueries";
import { useCreateNoteTag, useDeleteNoteTag, useUpdateNoteTag } from "@/features/notesapp/api/useNoteMutations";
import type { TagRecord } from "@/shared/types/notes";




export function AdminNotesTagsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#3b82f6");
  const notebooksQuery = useNotebooks();
  const tagsQuery = useNoteTags(selectedNotebookId ?? undefined);
  const createTag = useCreateNoteTag();
  const updateTag = useUpdateNoteTag();
  const deleteTag = useDeleteNoteTag();

  const tags = useMemo((): TagRecord[] => tagsQuery.data ?? [], [tagsQuery.data]);
  const loading = tagsQuery.isPending;

  // Query handles tag loading

  useEffect((): void => {
    if (selectedNotebookId) return;
    const firstId = notebooksQuery.data?.[0]?.id;
    if (firstId) {
      updateSettings({ selectedNotebookId: firstId });
    }
  }, [selectedNotebookId, updateSettings, notebooksQuery.data]);

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) {
      toast("Tag name is required", { variant: "error" });
      return;
    }
    try {
      if (!selectedNotebookId) return;
      await createTag.mutateAsync({ name: name.trim(), color, notebookId: selectedNotebookId });
      setName("");
      toast("Tag created", { variant: "success" });
    } catch (error: unknown) {
      console.error("Failed to create tag:", error);
      toast("Failed to create tag", { variant: "error" });
    }
  };

  const handleDelete = async (tagId: string): Promise<void> => {
    if (!confirm("Delete this tag? It will be removed from all notes.")) return;
    try {
      await deleteTag.mutateAsync(tagId);
      toast("Tag deleted", { variant: "success" });
    } catch (error: unknown) {
      console.error("Failed to delete tag:", error);
      toast("Failed to delete tag", { variant: "error" });
    }
  };

  const handleEditStart = (tag: TagRecord): void => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color || "#3b82f6");
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("#3b82f6");
  };

  const handleUpdate = async (tagId: string): Promise<void> => {
    if (!editingName.trim()) {
      toast("Tag name is required", { variant: "error" });
      return;
    }
    try {
      await updateTag.mutateAsync({
        id: tagId,
        data: { name: editingName.trim(), color: editingColor },
      });
      toast("Tag updated", { variant: "success" });
      handleEditCancel();
    } catch (error: unknown) {
      console.error("Failed to update tag:", error);
      toast("Failed to update tag", { variant: "error" });
    }
  };

  const filteredTags = useMemo(
    (): TagRecord[] => tags.filter((tag: TagRecord) => tag.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [tags, searchQuery]
  );

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Note Tags"
        description="Create and remove tags used in the Notes app."
        className="mb-6"
      />

      <div className="max-w-3xl space-y-6">
        <SectionPanel className="p-6">
          <SectionHeader title="Search" size="sm" className="mb-4" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(event.target.value)}
            placeholder="Search tags..."
            className="w-full"
          />
        </SectionPanel>
        <SectionPanel className="p-6">
          <SectionHeader title="Create Tag" size="sm" className="mb-4" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="mb-2 block text-sm font-medium text-gray-200">
                Tag Name
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setName(event.target.value)}
                className="w-full"
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-200">
                Color
              </Label>
              <Input
                type="color"
                value={color}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setColor(event.target.value)}
                className="h-10 w-20"
              />
            </div>
            <Button onClick={(): void => { void handleCreate(); }} disabled={createTag.isPending}>
              {createTag.isPending ? "Saving..." : "Create"}
            </Button>
          </div>
        </SectionPanel>

        <SectionPanel className="p-6">
          <SectionHeader
            title="Existing Tags"
            size="sm"
            className="mb-4"
            actions={(
              <Button variant="outline" onClick={(): void => { void tagsQuery.refetch(); }}>
                Refresh
              </Button>
            )}
          />
          {loading ? (
            <div className="text-sm text-gray-400">Loading tags...</div>
          ) : filteredTags.length === 0 ? (
            <div className="text-sm text-gray-500">No tags created yet.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTags.map((tag: TagRecord) => {
                const isEditing = editingId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || "#3b82f6" }}
                      />
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setEditingName(event.target.value)}
                            className="w-full"
                          />
                          <Input
                            type="color"
                            value={editingColor}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setEditingColor(event.target.value)}
                            className="h-8 w-14"
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
                            onClick={(): void => { void handleUpdate(tag.id); }}
                            disabled={updateTag.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(): void => handleEditCancel()}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(): void => handleEditStart(tag)}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={(): void => { void handleDelete(tag.id); }}
                        className="text-gray-400 hover:text-red-400"
                        aria-label={`Delete ${tag.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
