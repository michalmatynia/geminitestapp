'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { NoteWithRelations } from '@/shared/contracts/notes';
import { internalError } from '@/shared/errors/app-error';

export interface NoteFormRuntimeData {
  note: NoteWithRelations | null;
  setIsCreating: (val: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const { Context: NoteFormRuntimeContext, useStrictContext: useNoteFormRuntime } =
  createStrictContext<NoteFormRuntimeData>({
    hookName: 'useNoteFormRuntime',
    providerName: 'NoteFormProvider',
    displayName: 'NoteFormRuntimeContext',
    errorFactory: internalError,
  });

export { NoteFormRuntimeContext, useNoteFormRuntime };
