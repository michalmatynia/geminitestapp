'use client';

import React, { useMemo } from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type CaseResolverRichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
  appearance?: 'default' | 'document-preview' | undefined;
};

type CaseResolverRichTextEditorRuntimeValue = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
  appearance: 'default' | 'document-preview';
};

const {
  Context: CaseResolverRichTextEditorRuntimeContext,
  useStrictContext: useCaseResolverRichTextEditorRuntime,
} = createStrictContext<CaseResolverRichTextEditorRuntimeValue>({
  hookName: 'useCaseResolverRichTextEditorRuntime',
  providerName: 'CaseResolverRichTextEditorRuntimeProvider',
  displayName: 'CaseResolverRichTextEditorRuntimeContext',
});

function CaseResolverRichTextEditorRuntime(): React.JSX.Element {
  const { value, onChange, placeholder, appearance } = useCaseResolverRichTextEditorRuntime();
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

export function CaseResolverRichTextEditor({
  value,
  onChange,
  placeholder,
  appearance = 'default',
}: CaseResolverRichTextEditorProps): React.JSX.Element {
  const runtimeValue = useMemo(
    () => ({
      value,
      onChange,
      placeholder,
      appearance,
    }),
    [appearance, onChange, placeholder, value]
  );

  return (
    <CaseResolverRichTextEditorRuntimeContext.Provider value={runtimeValue}>
      <CaseResolverRichTextEditorRuntime />
    </CaseResolverRichTextEditorRuntimeContext.Provider>
  );
}
