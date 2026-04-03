'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface MarkdownSplitEditorContextValue {
  value: string;
  onChange: (nextValue: string) => void;
  readOnly?: boolean;
  showPreview: boolean;
  renderPreviewHtml: (value: string) => string;
  sanitizePreviewHtml?: (value: string) => string;
  isCodeMode?: boolean;
  isPasting?: boolean;
  onPaste?: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void | Promise<void>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  splitRef?: React.RefObject<HTMLDivElement | null>;
  editorWidth?: number | null;
  onEditorWidthChange?: (next: number | null | ((prev: number | null) => number | null)) => void;
  isDraggingSplitter?: boolean;
  onDraggingSplitterChange?: (dragging: boolean) => void;
  contentBackground?: string;
  contentTextColor?: string;
  previewTypographyStyle?: React.CSSProperties;
  onPreviewImageClick?: (src: string) => void;
  onCopyCodeFailure?: () => void;
  placeholder?: string;
  debounceMs?: number;
  textareaClassName?: string;
}

export const {
  Context: MarkdownSplitEditorContextInternal,
  useStrictContext: useMarkdownSplitEditorContext,
  useOptionalContext: useOptionalMarkdownSplitEditorContext,
} = createStrictContext<MarkdownSplitEditorContextValue>({
  hookName: 'useMarkdownSplitEditorContext',
  providerName: 'MarkdownSplitEditorProvider',
  displayName: 'MarkdownSplitEditorContext',
  errorFactory: internalError,
});

export const MarkdownSplitEditorContext =
  MarkdownSplitEditorContextInternal as React.Context<MarkdownSplitEditorContextValue | null>;

export function MarkdownSplitEditorProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: MarkdownSplitEditorContextValue;
}) {
  return (
    <MarkdownSplitEditorContext.Provider value={value}>
      {children}
    </MarkdownSplitEditorContext.Provider>
  );
}
