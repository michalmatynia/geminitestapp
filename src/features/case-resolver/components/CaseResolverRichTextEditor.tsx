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
      variant='compact'
      headingLevels={[2]}
      allowImage={false}
      allowTable={false}
      allowTaskList={false}
      loadingLabel='Loading editor...'
      surfaceClassName='rounded border border-border/60 bg-card/20'
      editorContentClassName='[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border/70 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold'
    />
  );
}
