'use client';

import { createContext, useContext } from 'react';

import type { NoteWithRelations } from '@/shared/contracts/notes';
import { internalError } from '@/shared/errors/app-error';

export interface NoteFormRuntimeData {
  note: NoteWithRelations | null;
  setIsCreating: (val: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const NoteFormRuntimeContext = createContext<NoteFormRuntimeData | null>(null);

export function useNoteFormRuntime(): NoteFormRuntimeData {
  const context = useContext(NoteFormRuntimeContext);
  if (!context) {
    throw internalError('useNoteFormRuntime must be used within NoteFormProvider');
  }
  return context;
}
