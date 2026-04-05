'use client';

import React from 'react';

import { MarkdownSplitEditor } from '@/shared/lib/document-editor/public';
import { MarkdownSplitEditorProvider } from '@/shared/lib/document-editor/public';
import {
  useNoteContentContext,
  useNoteEditorContext,
  useNoteFilesContext,
} from '@/features/notesapp/context/NoteFormContext';
import { TextEditorEngineBrandButton } from '@/shared/ui/navigation-and-layout.public';
import { useToast } from '@/shared/ui/primitives.public';
import { sanitizeHtml } from '@/shared/utils/sanitization';

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
  const { isPasting, handlePaste, setLightboxImage } = useNoteFilesContext();
  const isCodeMode = editorMode === 'code';

  const { toast } = useToast();

  const editorContextValue = React.useMemo(
    () => ({
      value: content,
      onChange: setContent,
      showPreview,
      renderPreviewHtml: renderMarkdownToHtml,
      sanitizePreviewHtml: sanitizeHtml,
      isCodeMode,
      isPasting,
      onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
        void handlePaste(event);
      },
      textareaRef: contentRef,
      splitRef: editorSplitRef,
      editorWidth,
      onEditorWidthChange: setEditorWidth,
      isDraggingSplitter,
      onDraggingSplitterChange: setIsDraggingSplitter,
      contentBackground,
      contentTextColor,
      previewTypographyStyle,
      onPreviewImageClick: setLightboxImage,
      onCopyCodeFailure: (): void => {
        toast('Failed to copy code');
      },
      placeholder: isCodeMode
        ? 'Enter code snippets using ```language blocks (e.g., ```javascript)'
        : 'Enter note content (paste images directly!)',
      textareaClassName: 'w-full rounded-lg border px-4 py-2 font-mono',
    }),
    [
      content,
      setContent,
      showPreview,
      isCodeMode,
      isPasting,
      handlePaste,
      contentRef,
      editorSplitRef,
      editorWidth,
      setEditorWidth,
      isDraggingSplitter,
      setIsDraggingSplitter,
      contentBackground,
      contentTextColor,
      previewTypographyStyle,
      setLightboxImage,
      toast,
    ]
  );

  return (
    <div className='relative'>
      <MarkdownSplitEditorProvider value={editorContextValue}>
        <MarkdownSplitEditor />
      </MarkdownSplitEditorProvider>
      <TextEditorEngineBrandButton instance='notes_app' />
    </div>
  );
}
