'use client';

import React from 'react';

import { RichTextEditor } from '@/features/document-editor';

type CaseResolverRichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
  appearance?: 'default' | 'document-preview' | undefined;
};

export function CaseResolverRichTextEditor({
  value,
  onChange,
  placeholder,
  appearance = 'default',
}: CaseResolverRichTextEditorProps): React.JSX.Element {
  const isDocumentPreview = appearance === 'document-preview';

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
      toolbarClassName={isDocumentPreview ? 'border-slate-300 bg-slate-50' : undefined}
      surfaceClassName={
        isDocumentPreview
          ? 'w-full min-h-[300px] rounded-lg border border-slate-300 bg-white shadow-sm'
          : 'w-full min-h-[300px] rounded-lg border border-border/60 bg-card/20'
      }
      editorContentClassName={
        isDocumentPreview
          ? '[&_.ProseMirror]:!bg-white [&_.ProseMirror]:!text-slate-900 [&_.ProseMirror]:text-[12pt] [&_.ProseMirror]:leading-[1.5] [&_.ProseMirror]:[font-family:"Times_New_Roman",Georgia,serif] [&_.ProseMirror]:p-8 [&_.ProseMirror]:min-h-[620px] [&_.ProseMirror_blockquote]:!border-l-slate-400 [&_.ProseMirror_code]:!bg-slate-100 [&_.ProseMirror_pre]:!bg-slate-100 [&_.ProseMirror_th]:!bg-slate-100 [&_.ProseMirror_a]:!text-blue-700'
          : undefined
      }
    />
  );
}
