'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { useNoteContentContext } from '@/features/notesapp/context/NoteFormContext';

export function WysiwygEditor(): React.JSX.Element {
  const { content, setContent } = useNoteContentContext();

  return (
    <DocumentWysiwygEditor
      engineInstance='notes_app'
      showBrand
      value={content}
      onChange={setContent}
    />
  );
}
