/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const setLightboxImageMock = vi.fn();

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/features/notesapp/context/NoteFormContext', () => ({
  NoteFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNoteEditorContext: () => ({
    editorMode: 'markdown',
  }),
  useNoteFilesContext: () => ({
    lightboxImage: '/uploads/example-note-image.png',
    setLightboxImage: setLightboxImageMock,
  }),
  useNoteFormRuntime: () => ({
    handleSubmit: vi.fn(),
    note: null,
  }),
  useNoteMetadataContext: () => ({
    setTitle: vi.fn(),
    title: 'Example note',
  }),
}));

vi.mock('@/features/notesapp/components/editor/FileAttachments', () => ({
  FileAttachments: () => <div data-testid='note-file-attachments' />,
}));

vi.mock('@/features/notesapp/components/editor/MarkdownEditor', () => ({
  MarkdownEditor: () => <div data-testid='note-markdown-editor' />,
}));

vi.mock('@/features/notesapp/components/editor/NoteMetadata', () => ({
  NoteMetadata: () => <div data-testid='note-metadata' />,
}));

vi.mock('@/features/notesapp/components/editor/NotesMarkdownToolbar', () => ({
  NotesMarkdownToolbar: () => <div data-testid='note-markdown-toolbar' />,
}));

vi.mock('@/features/notesapp/components/editor/WysiwygEditor', () => ({
  WysiwygEditor: () => <div data-testid='note-wysiwyg-editor' />,
}));

import { NoteForm } from '@/features/notesapp/components/NoteForm';

describe('NoteForm', () => {
  it('provides hidden title and description metadata for the image lightbox dialog', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<NoteForm onSuccess={vi.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Image Preview')).toBeInTheDocument();
      expect(
        screen.getByText('Full-screen preview of the selected note attachment.')
      ).toBeInTheDocument();

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
      expect(loggedOutput).not.toContain('Missing `Description`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
