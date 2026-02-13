'use client';

import React from 'react';

import { RichTextEditor } from '@/features/document-editor';
import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';

export function WysiwygEditor(): React.JSX.Element {
  const {
    content,
    setContent,
    contentBackground,
    contentTextColor,
  } = useNoteFormContext();

  return (
    <RichTextEditor
      value={content}
      onChange={setContent}
      variant='full'
      headingLevels={[1, 2, 3]}
      allowImage
      allowTable
      allowTaskList
      loadingLabel='Loading editor...'
      surfaceClassName='w-full min-h-[250px] rounded-lg border border-border/60'
      surfaceStyle={{
        backgroundColor: contentBackground,
        color: contentTextColor,
      }}
    />
  );
}
