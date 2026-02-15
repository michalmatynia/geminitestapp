'use client';

import React from 'react';

import { RichTextEditor } from '@/features/document-editor';

type CaseResolverRichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
};

export function CaseResolverRichTextEditor({
  value,
  onChange,
  placeholder,
}: CaseResolverRichTextEditorProps): React.JSX.Element {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      variant='full'
      headingLevels={[1, 2, 3]}
      allowImage
      allowTable
      allowTaskList
      allowFontFamily
      loadingLabel='Loading editor...'
      surfaceClassName='w-full min-h-[300px] rounded-lg border border-border/60 bg-card/20'
    />
  );
}
