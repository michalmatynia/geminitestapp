'use client';

import React, { createContext, useContext } from 'react';

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

export const MarkdownSplitEditorContext = createContext<MarkdownSplitEditorContextValue | null>(
  null
);

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

export function useMarkdownSplitEditorContext() {
  const context = useContext(MarkdownSplitEditorContext);
  if (!context) {
    throw new Error(
      'useMarkdownSplitEditorContext must be used within MarkdownSplitEditorProvider'
    );
  }
  return context;
}

export function useOptionalMarkdownSplitEditorContext() {
  return useContext(MarkdownSplitEditorContext);
}
