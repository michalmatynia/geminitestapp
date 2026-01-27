import { useState, useMemo } from "react";
import { useToast } from "@/shared/ui/toast";
import type { TagRecord } from "@/shared/types/notes";

// Why: Tag selection has complex state:
// - Input filtering against available tags
// - Dropdown visibility
// - Creating new tags with API call
// - Adding/removing tags from note
// Extracting prevents form bloat and makes tag logic testable.
export function useNoteTags(
  initialTagIds: string[] = [],
  availableTags: TagRecord[] = [],
  notebookId?: string | null,
  noteNotebookId?: string | null,
  onTagCreated?: () => void
) {
  const { toast } = useToast();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const filteredTags = useMemo(() => 
    availableTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTagIds.includes(tag.id)
    ), 
    [availableTags, tagInput, selectedTagIds]
  );

  const handleAddTag = (tag: TagRecord) => {
    setSelectedTagIds([...selectedTagIds, tag.id]);
    setTagInput("");
    setIsTagDropdownOpen(false);
  };

  const handleCreateTag = async () => {
    if (!tagInput.trim()) return;

    const existingTag = availableTags.find(
      (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        handleAddTag(existingTag);
      } else {
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagInput.trim(),
          notebookId: notebookId ?? noteNotebookId ?? null,
        }),
      });

      if (response.ok) {
        const newTag = (await response.json()) as TagRecord;
        onTagCreated?.();
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast("Failed to create tag", { variant: "error" });
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
  };

  return {
    selectedTagIds,
    setSelectedTagIds,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleRemoveTag,
  };
}
