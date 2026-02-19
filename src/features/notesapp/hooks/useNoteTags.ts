import { useState, useMemo } from 'react';

import { useCreateNoteTag } from '@/features/notesapp/api/useNoteMutations';
import { logClientError } from '@/features/observability';
import type { NoteTagDto as TagRecord } from '@/shared/contracts/notes';
import { useToast } from '@/shared/ui';

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
): {
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[]) => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  isTagDropdownOpen: boolean;
  setIsTagDropdownOpen: (isOpen: boolean) => void;
  filteredTags: TagRecord[];
  handleAddTag: (tag: TagRecord) => void;
  handleCreateTag: () => Promise<void>;
  handleRemoveTag: (tagId: string) => void;
} {
  const { toast } = useToast();
  const createTagMutation = useCreateNoteTag();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const filteredTags = useMemo((): TagRecord[] => 
    availableTags.filter(
      (tag: TagRecord) =>
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTagIds.includes(tag.id)
    ), 
  [availableTags, tagInput, selectedTagIds]
  );

  const handleAddTag = (tag: TagRecord): void => {
    setSelectedTagIds([...selectedTagIds, tag.id]);
    setTagInput('');
    setIsTagDropdownOpen(false);
  };

  const handleCreateTag = async (): Promise<void> => {
    if (!tagInput.trim()) return;

    const existingTag = availableTags.find(
      (t: TagRecord) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        handleAddTag(existingTag);
      } else {
        setTagInput('');
        setIsTagDropdownOpen(false);
      }
      return;
    }

    try {
      const newTag = await createTagMutation.mutateAsync({
        name: tagInput.trim(),
        color: null,
        notebookId: notebookId ?? noteNotebookId ?? null,
      });
      onTagCreated?.();
      setSelectedTagIds((prev: string[]) => [...prev, newTag.id]);
      setTagInput('');
      setIsTagDropdownOpen(false);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useNoteTags', action: 'createTag', name: tagInput.trim(), notebookId: notebookId ?? noteNotebookId } });
      toast('Failed to create tag', { variant: 'error' });
    }
  };

  const handleRemoveTag = (tagId: string): void => {
    setSelectedTagIds(selectedTagIds.filter((id: string) => id !== tagId));
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
