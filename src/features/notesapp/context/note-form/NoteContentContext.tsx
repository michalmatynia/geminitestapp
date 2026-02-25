'use client';

import { createContext, useContext } from 'react';

export interface NoteContentData {
  content: string;
  setContent: (content: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const NoteContentContext = createContext<NoteContentData | null>(null);

export function useNoteContent(): NoteContentData {
  const context = useContext(NoteContentContext);
  if (!context) throw new Error('useNoteContent must be used within NoteFormProvider');
  return context;
}
