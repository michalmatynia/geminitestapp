'use client';

import React from 'react';

import { MarkdownSplitEditor } from '@/features/document-editor';
import {
  useNoteContentContext,
  useNoteEditorContext,
  useNoteFilesContext,
} from '@/features/notesapp/context/NoteFormContext';
import { useToast } from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { renderMarkdownToHtml } from '../../utils';

export function MarkdownEditor(): React.JSX.Element {
  const { content, setContent } = useNoteContentContext();
  const {
    editorMode,
    showPreview,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorSplitRef,
    contentRef,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
  } = useNoteEditorContext();
  const {
    isPasting,
    handlePaste,
    setLightboxImage,
  } = useNoteFilesContext();
  const isCodeMode = editorMode === 'code';

  const { toast } = useToast();

  return (
    <MarkdownSplitEditor
      value={content}
      onChange={setContent}
      showPreview={showPreview}
      renderPreviewHtml={renderMarkdownToHtml}
      sanitizePreviewHtml={sanitizeHtml}
      isCodeMode={isCodeMode}
      isPasting={isPasting}
      onPaste={(event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
        void handlePaste(event);
      }}
      textareaRef={contentRef}
      splitRef={editorSplitRef}
      editorWidth={editorWidth}
      onEditorWidthChange={setEditorWidth}
      isDraggingSplitter={isDraggingSplitter}
      onDraggingSplitterChange={setIsDraggingSplitter}
      contentBackground={contentBackground}
      contentTextColor={contentTextColor}
      previewTypographyStyle={previewTypographyStyle}
      onPreviewImageClick={setLightboxImage}
      onCopyCodeFailure={(): void => {
        toast('Failed to copy code');
      }}
      placeholder={
        isCodeMode
          ? 'Enter code snippets using ```language blocks (e.g., ```javascript)'
          : 'Enter note content (paste images directly!)'
      }
      textareaClassName='w-full rounded-lg border px-4 py-2 font-mono'
    />
  );
}
