'use client';

import { createContext, useContext } from 'react';
import type { NoteWithRelationsDto as NoteWithRelations } from '@/shared/contracts/notes';

export interface RelatedNoteItem {
  id: string;
  title: string;
  color: string | null;
  content: string;
}

export interface NoteRelationsData {
  selectedRelatedNotes: RelatedNoteItem[];
  setSelectedRelatedNotes: React.Dispatch<
    React.SetStateAction<RelatedNoteItem[]>
  >;
  relatedNoteQuery: string;
  setRelatedNoteQuery: (query: string) => void;
  isRelatedDropdownOpen: boolean;
  setIsRelatedDropdownOpen: (open: boolean) => void;
  relatedNoteResults: NoteWithRelations[];
  isRelatedLoading: boolean;
  handleSelectRelatedNote: (noteId: string) => void;
}

export const NoteRelationsContext = createContext<NoteRelationsData | null>(
  null,
);

export function useNoteRelations(): NoteRelationsData {
  const context = useContext(NoteRelationsContext);
  if (!context)
    throw new Error('useNoteRelations must be used within NoteFormProvider');
  return context;
}
