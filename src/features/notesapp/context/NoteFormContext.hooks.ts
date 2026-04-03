'use client';

import {
  useNoteContentContext,
  type NoteContentData,
} from './note-form/NoteContentContext';
import {
  useNoteEditorContext,
  type NoteEditorData,
} from './note-form/NoteEditorContext';
import {
  useNoteFilesContext,
  type NoteFilesData,
} from './note-form/NoteFilesContext';
import {
  useNoteFoldersContext,
  type NoteFoldersData,
} from './note-form/NoteFoldersContext';
import { useNoteFormRuntime } from './note-form/NoteFormRuntimeContext';
import {
  useNoteMetadataContext,
  type NoteMetadataData,
} from './note-form/NoteMetadataContext';
import {
  useNoteRelationsContext,
  type NoteRelationsData,
} from './note-form/NoteRelationsContext';
import {
  useNoteTagsContext,
  type NoteTagsData,
} from './note-form/NoteTagsContext';

export { useNoteFormRuntime };

export {
  useNoteContentContext,
  useNoteEditorContext,
  useNoteFilesContext,
  useNoteFoldersContext,
  useNoteMetadataContext,
  useNoteRelationsContext,
  useNoteTagsContext,
};
