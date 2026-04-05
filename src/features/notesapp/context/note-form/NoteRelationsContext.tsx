import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

import type { NoteWithRelations } from '@/shared/contracts/notes';

export interface RelatedNoteItem {
  id: string;
  title: string;
  color: string | null;
  content: string;
}

export interface NoteRelationsData {
  selectedRelatedNotes: RelatedNoteItem[];
  setSelectedRelatedNotes: React.Dispatch<React.SetStateAction<RelatedNoteItem[]>>;
  relatedNoteQuery: string;
  setRelatedNoteQuery: (query: string) => void;
  isRelatedDropdownOpen: boolean;
  setIsRelatedDropdownOpen: (open: boolean) => void;
  relatedNoteResults: NoteWithRelations[];
  isRelatedLoading: boolean;
  handleSelectRelatedNote: (noteId: string) => void;
}

const { Context: NoteRelationsContext, useStrictContext: useNoteRelationsContext } =
  createStrictContext<NoteRelationsData>({
    hookName: 'useNoteRelationsContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteRelationsContext',
    errorFactory: internalError,
  });

export { NoteRelationsContext, useNoteRelationsContext };
