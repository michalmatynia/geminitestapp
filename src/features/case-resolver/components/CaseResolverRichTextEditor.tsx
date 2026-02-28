'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor';

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
  return (
    <DocumentWysiwygEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      appearance={appearance}
      allowFontFamily
      allowTextAlign
      enableAdvancedTools
    />
  );
}
