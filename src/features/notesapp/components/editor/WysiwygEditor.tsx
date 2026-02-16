'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor';
import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';

export function WysiwygEditor(): React.JSX.Element {
  const { content, setContent } = useNoteFormContext();

  return (
    <DocumentWysiwygEditor
      value={content}
      onChange={setContent}
    />
  );
}
