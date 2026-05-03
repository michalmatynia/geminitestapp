// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RichTextEditorProps } from '@/shared/lib/document-editor/components/RichTextEditorTypes';

const setContentMock = vi.fn();
const setEditorWidthMock = vi.fn();
const setIsDraggingSplitterMock = vi.fn();
const setLightboxImageMock = vi.fn();
const toastMock = vi.fn();

const capturedDocumentEditorPropsRef = {
  current: null as Record<string, unknown> | null,
};
const capturedMarkdownProviderValueRef = {
  current: null as Record<string, unknown> | null,
};

vi.mock('@/features/notesapp/context/NoteFormContext', () => ({
  useNoteContentContext: () => ({
    content: 'Example note content',
    setContent: setContentMock,
  }),
  useNoteEditorContext: () => ({
    editorMode: 'markdown',
    showPreview: false,
    editorWidth: null,
    setEditorWidth: setEditorWidthMock,
    isDraggingSplitter: false,
    setIsDraggingSplitter: setIsDraggingSplitterMock,
    editorSplitRef: { current: null },
    contentRef: { current: null },
    contentBackground: '#ffffff',
    contentTextColor: '#111827',
    previewTypographyStyle: 'prose',
  }),
  useNoteFilesContext: () => ({
    isPasting: false,
    handlePaste: vi.fn(),
    setLightboxImage: setLightboxImageMock,
  }),
}));

vi.mock('@/shared/lib/document-editor/public', () => ({
  DocumentWysiwygEditor: (props: RichTextEditorProps & Record<string, unknown>) => {
    capturedDocumentEditorPropsRef.current = props;
    return <div data-testid='mock-note-wysiwyg-editor' />;
  },
  MarkdownSplitEditorProvider: ({
    value,
    children,
  }: {
    value: Record<string, unknown>;
    children: React.ReactNode;
  }) => {
    capturedMarkdownProviderValueRef.current = value;
    return <div data-testid='mock-markdown-provider'>{children}</div>;
  },
  MarkdownSplitEditor: () => <div data-testid='mock-markdown-split-editor' />,
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { MarkdownEditor } from '@/features/notesapp/components/editor/MarkdownEditor';
import { WysiwygEditor } from '@/features/notesapp/components/editor/WysiwygEditor';

describe('Notes editor branding', () => {
  beforeEach(() => {
    capturedDocumentEditorPropsRef.current = null;
    capturedMarkdownProviderValueRef.current = null;
    setContentMock.mockReset();
    setEditorWidthMock.mockReset();
    setIsDraggingSplitterMock.mockReset();
    setLightboxImageMock.mockReset();
    toastMock.mockReset();
  });

  it('wires the notes WYSIWYG editor to the shared engine instance', () => {
    render(<WysiwygEditor />);

    expect(screen.getByTestId('mock-note-wysiwyg-editor')).toBeInTheDocument();
    expect(capturedDocumentEditorPropsRef.current).toMatchObject({
      engineInstance: 'notes_app',
      showBrand: true,
      value: 'Example note content',
      onChange: setContentMock,
    });
  });

  it('renders the notes markdown editor with the engine settings brand link', () => {
    render(<MarkdownEditor />);

    expect(screen.getByTestId('mock-markdown-provider')).toBeInTheDocument();
    expect(screen.getByTestId('mock-markdown-split-editor')).toBeInTheDocument();
    expect(capturedMarkdownProviderValueRef.current).toMatchObject({
      value: 'Example note content',
      onChange: setContentMock,
      showPreview: false,
      editorWidth: null,
      isDraggingSplitter: false,
    });
    expect(
      screen.getByRole('link', {
        name: 'Open Notes App text editor settings',
      })
    ).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-notes_app'
    );
  });
});
