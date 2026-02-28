'use client';

import React from 'react';

import { MarkdownSplitEditor } from '@/shared/lib/document-editor';
import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';
import { useToast } from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { renderMarkdownToHtml } from '../../utils';

interface MarkdownEditorProps {
  isCodeMode?: boolean | undefined;
}

export function MarkdownEditor({ isCodeMode = false }: MarkdownEditorProps): React.JSX.Element {
  const {
    content,
    setContent,
    showPreview,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorSplitRef,
    contentRef,
    isPasting,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
    handlePaste,
    setLightboxImage,
  } = useNoteFormContext();

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
