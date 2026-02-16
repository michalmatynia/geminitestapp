'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { RichTextEditor } from './RichTextEditor';

export type DocumentWysiwygEditorAppearance = 'default' | 'document-preview';

export interface DocumentWysiwygEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
  appearance?: DocumentWysiwygEditorAppearance | undefined;
  allowFontFamily?: boolean | undefined;
  allowTextAlign?: boolean | undefined;
  loadingLabel?: string | undefined;
  toolbarClassName?: string | undefined;
  surfaceClassName?: string | undefined;
  editorContentClassName?: string | undefined;
}

export function DocumentWysiwygEditor({
  value,
  onChange,
  placeholder,
  appearance = 'default',
  allowFontFamily = false,
  allowTextAlign = false,
  loadingLabel = 'Loading editor...',
  toolbarClassName,
  surfaceClassName,
  editorContentClassName,
}: DocumentWysiwygEditorProps): React.JSX.Element {
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
      allowFontFamily={allowFontFamily}
      allowTextAlign={allowTextAlign}
      loadingLabel={loadingLabel}
      toolbarClassName={cn('border-slate-300 bg-slate-50', toolbarClassName)}
      surfaceClassName={cn(
        isDocumentPreview
          ? 'w-full min-h-[300px] rounded-lg border border-slate-300 bg-white shadow-sm'
          : 'w-full min-h-[250px] rounded-lg border border-slate-300 bg-white',
        surfaceClassName
      )}
      editorContentClassName={cn(
        isDocumentPreview
          ? '[&_.ProseMirror]:!bg-white [&_.ProseMirror]:!text-slate-900 [&_.ProseMirror]:text-[12pt] [&_.ProseMirror]:leading-[1.5] [&_.ProseMirror]:[font-family:"Times_New_Roman",Georgia,serif] [&_.ProseMirror]:p-8 [&_.ProseMirror]:min-h-[620px] [&_.ProseMirror_blockquote]:!border-l-slate-400 [&_.ProseMirror_code]:!bg-slate-100 [&_.ProseMirror_pre]:!bg-slate-100 [&_.ProseMirror_th]:!bg-slate-100 [&_.ProseMirror_a]:!text-blue-700'
          : '[&_.ProseMirror]:!bg-white [&_.ProseMirror]:!text-slate-900 [&_.ProseMirror_blockquote]:!border-l-slate-300 [&_.ProseMirror_code]:!bg-slate-100 [&_.ProseMirror_pre]:!bg-slate-100 [&_.ProseMirror_th]:!bg-slate-100 [&_.ProseMirror_a]:!text-blue-700',
        editorContentClassName
      )}
    />
  );
}
