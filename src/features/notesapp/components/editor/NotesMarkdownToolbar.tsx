'use client';

import React from 'react';

import {
  MarkdownToolbar as DocumentMarkdownToolbar,
  MarkdownToolbarProvider,
} from '@/shared/lib/document-editor/public';
import {
  useNoteContentContext,
  useNoteEditorContext,
  useNoteFilesContext,
} from '@/features/notesapp/context/NoteFormContext';
import { useMarkdownEditor } from '@/features/notesapp/hooks/useMarkdownEditor';
import type { NoteFileRecord } from '@/shared/contracts/notes';


export function NotesMarkdownToolbar(): React.JSX.Element {
  const { content, setContent, undo, redo, canUndo, canRedo } = useNoteContentContext();
  const {
    textColor,
    setTextColor,
    fontFamily,
    setFontFamily,
    showPreview,
    setShowPreview,
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
    contentRef,
  } = useNoteEditorContext();
  const { noteFiles, insertFileReference } = useNoteFilesContext();
  const markdownToolbarActions = useMarkdownEditor({
    content,
    setContent,
    contentRef,
  });

  const fileReferenceOptions = React.useMemo(
    () =>
      noteFiles.map((file: NoteFileRecord) => {
        const cleanedName = file.filename.replace(/^slot-\d+-\d+-/, '');
        const shortName = cleanedName.length > 15 ? `${cleanedName.slice(0, 15)}...` : cleanedName;
        return {
          value: String(file.slotIndex),
          label: `Slot ${file.slotIndex + 1}: ${shortName}`,
        };
      }),
    [noteFiles]
  );
  const toolbarContextValue = React.useMemo(
    () => ({
      mode: editorMode,
      onModeChange: setEditorMode,
      isModeLocked: isEditorModeLocked,
      isMigrating,
      onMigrateToWysiwyg: (): void => {
        void handleMigrateToWysiwyg(content);
      },
      onMigrateToMarkdown: (): void => {
        void handleMigrateToMarkdown(content);
      },
      showPreview,
      onTogglePreview: (): void => {
        setShowPreview(!showPreview);
      },
      onUndo: undo,
      onRedo: redo,
      canUndo,
      canRedo,
      textColor,
      onTextColorChange: setTextColor,
      fontFamily,
      onFontFamilyChange: setFontFamily,
      fileReferenceOptions,
      onInsertFileReference: (value: string): void => {
        const slotIndex = Number.parseInt(value, 10);
        const targetFile = noteFiles.find((file: NoteFileRecord) => file.slotIndex === slotIndex);
        if (!targetFile) return;
        insertFileReference(targetFile);
      },
      ...markdownToolbarActions,
    }),
    [
      canRedo,
      canUndo,
      content,
      editorMode,
      fileReferenceOptions,
      fontFamily,
      handleMigrateToMarkdown,
      handleMigrateToWysiwyg,
      insertFileReference,
      isEditorModeLocked,
      isMigrating,
      markdownToolbarActions,
      noteFiles,
      redo,
      setEditorMode,
      setFontFamily,
      setShowPreview,
      setTextColor,
      showPreview,
      textColor,
      undo,
    ]
  );

  return (
    <MarkdownToolbarProvider value={toolbarContextValue}>
      <DocumentMarkdownToolbar />
    </MarkdownToolbarProvider>
  );
}
