'use client';

import { createContext, useContext } from 'react';

export interface NoteMetadataData {
  title: string;
  setTitle: (title: string) => void;
  color: string;
  setColor: (color: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  isArchived: boolean;
  setIsArchived: (isArchived: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (isFavorite: boolean) => void;
  getReadableTextColor: (bgColor: string) => string;
}

export const NoteMetadataContext = createContext<NoteMetadataData | null>(null);

export function useNoteMetadataContext(): NoteMetadataData {
  const context = useContext(NoteMetadataContext);
  if (!context) throw new Error('useNoteMetadataContext must be used within NoteFormProvider');
  return context;
}
