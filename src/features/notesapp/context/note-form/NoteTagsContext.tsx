import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

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

const { Context: NoteTagsContext, useStrictContext: useNoteTagsContext } =
  createStrictContext<NoteTagsData>({
    hookName: 'useNoteTagsContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteTagsContext',
    errorFactory: internalError,
  });

export { NoteTagsContext, useNoteTagsContext };
