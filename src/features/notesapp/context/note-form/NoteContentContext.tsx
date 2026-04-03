import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

export interface NoteContentData {
  content: string;
  setContent: (content: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const { Context: NoteContentContext, useStrictContext: useNoteContentContext } =
  createStrictContext<NoteContentData>({
    hookName: 'useNoteContentContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteContentContext',
    errorFactory: internalError,
  });

export { NoteContentContext, useNoteContentContext };
