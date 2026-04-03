import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

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

const { Context: NoteMetadataContext, useStrictContext: useNoteMetadataContext } =
  createStrictContext<NoteMetadataData>({
    hookName: 'useNoteMetadataContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteMetadataContext',
    errorFactory: internalError,
  });

export { NoteMetadataContext, useNoteMetadataContext };
