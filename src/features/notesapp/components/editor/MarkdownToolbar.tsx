'use client';

import React from 'react';

import { MarkdownToolbar as DocumentMarkdownToolbar } from '@/features/document-editor';
import { useMarkdownToolbarActions } from '@/features/notesapp/context/MarkdownToolbarActionsContext';
import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';
import type { NoteFileDto as NoteFileRecord } from '@/shared/contracts/notes';

export function MarkdownToolbar(): React.JSX.Element {
  const {
    onApplyWrap,
    onApplyLinePrefix,
    onInsertAtCursor,
    onApplyBulletList,
    onApplyChecklist,
    onApplySpanStyle,
  } = useMarkdownToolbarActions();

  const {
    noteFiles,
    textColor,
    setTextColor,
    fontFamily,
    setFontFamily,
    showPreview,
    setShowPreview,
    insertFileReference,
    undo,
    redo,
    canUndo,
    canRedo,
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
    content,
  } = useNoteFormContext();

  const fileReferenceOptions = React.useMemo(
    () =>
      noteFiles.map((file: NoteFileRecord) => {
        const cleanedName = file.filename.replace(/^slot-\d+-\d+-/, '');
        const shortName =
          cleanedName.length > 15
            ? `${cleanedName.slice(0, 15)}...`
            : cleanedName;
        return {
          value: String(file.slotIndex),
          label: `Slot ${file.slotIndex + 1}: ${shortName}`,
        };
      }),
    [noteFiles],
  );

  return (
    <DocumentMarkdownToolbar
      mode={editorMode}
      onModeChange={setEditorMode}
      isModeLocked={isEditorModeLocked}
      isMigrating={isMigrating}
      onMigrateToWysiwyg={(): void => {
        void handleMigrateToWysiwyg(content);
      }}
      onMigrateToMarkdown={(): void => {
        void handleMigrateToMarkdown(content);
      }}
      showPreview={showPreview}
      onTogglePreview={(): void => {
        setShowPreview(!showPreview);
      }}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      textColor={textColor}
      onTextColorChange={setTextColor}
      fontFamily={fontFamily}
      onFontFamilyChange={setFontFamily}
      fileReferenceOptions={fileReferenceOptions}
      onInsertFileReference={(value: string): void => {
        const slotIndex = Number.parseInt(value, 10);
        const targetFile = noteFiles.find(
          (file: NoteFileRecord) => file.slotIndex === slotIndex,
        );
        if (!targetFile) return;
        insertFileReference(targetFile);
      }}
      onApplyWrap={onApplyWrap}
      onApplyLinePrefix={onApplyLinePrefix}
      onInsertAtCursor={onInsertAtCursor}
      onApplyBulletList={onApplyBulletList}
      onApplyChecklist={onApplyChecklist}
      onApplySpanStyle={onApplySpanStyle}
    />
  );
}
