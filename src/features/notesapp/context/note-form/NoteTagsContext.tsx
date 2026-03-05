'use client';

import { createContext } from 'react';
import type { TagRecord } from '@/shared/contracts/notes';

export interface NoteTagsData {
  selectedTagIds: string[];
  tagInput: string;
  setTagInput: (input: string) => void;
  isTagDropdownOpen: boolean;
  setIsTagDropdownOpen: (open: boolean) => void;
  filteredTags: TagRecord[];
  handleAddTag: (tag: TagRecord) => void;
  handleCreateTag: () => Promise<void>;
  handleRemoveTag: (tagId: string) => void;
  availableTags: TagRecord[];
  handleFilterByTag: (tagId: string) => void;
}

export const NoteTagsContext = createContext<NoteTagsData | null>(null);
