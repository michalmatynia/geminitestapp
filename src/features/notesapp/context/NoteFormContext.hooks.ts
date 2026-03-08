'use client';

import { useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { NoteContentContext, type NoteContentData } from './note-form/NoteContentContext';
import { NoteEditorContext, type NoteEditorData } from './note-form/NoteEditorContext';
import { NoteFilesContext, type NoteFilesData } from './note-form/NoteFilesContext';
import { NoteFoldersContext, type NoteFoldersData } from './note-form/NoteFoldersContext';
import { NoteMetadataContext, type NoteMetadataData } from './note-form/NoteMetadataContext';
import {
  NoteRelationsContext,
  type NoteRelationsData,
} from './note-form/NoteRelationsContext';
import { NoteTagsContext, type NoteTagsData } from './note-form/NoteTagsContext';
import { useNoteFormRuntime } from './note-form/NoteFormRuntimeContext';

export { useNoteFormRuntime };

export function useNoteContentContext(): NoteContentData {
  const context = useContext(NoteContentContext);
  if (!context) {
    throw internalError('useNoteContentContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteMetadataContext(): NoteMetadataData {
  const context = useContext(NoteMetadataContext);
  if (!context) {
    throw internalError('useNoteMetadataContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteEditorContext(): NoteEditorData {
  const context = useContext(NoteEditorContext);
  if (!context) {
    throw internalError('useNoteEditorContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteFilesContext(): NoteFilesData {
  const context = useContext(NoteFilesContext);
  if (!context) {
    throw internalError('useNoteFilesContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteTagsContext(): NoteTagsData {
  const context = useContext(NoteTagsContext);
  if (!context) {
    throw internalError('useNoteTagsContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteFoldersContext(): NoteFoldersData {
  const context = useContext(NoteFoldersContext);
  if (!context) {
    throw internalError('useNoteFoldersContext must be used within NoteFormProvider');
  }
  return context;
}

export function useNoteRelationsContext(): NoteRelationsData {
  const context = useContext(NoteRelationsContext);
  if (!context) {
    throw internalError('useNoteRelationsContext must be used within NoteFormProvider');
  }
  return context;
}
