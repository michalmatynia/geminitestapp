'use client';

import React, { useMemo } from 'react';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

const LazyDocumentWysiwygEditor = React.lazy(() =>
  import('@/features/document-editor').then((mod) => ({
    default: mod.DocumentWysiwygEditor,
  }))
);

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
    <React.Suspense
      fallback={
        <div className='min-h-[220px] rounded-lg border border-border/40 bg-card/20 p-4 text-sm text-muted-foreground'>
          Loading editor...
        </div>
      }
    >
      <LazyDocumentWysiwygEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        appearance={appearance}
        allowFontFamily
        allowTextAlign
        enableAdvancedTools
      />
    </React.Suspense>
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
