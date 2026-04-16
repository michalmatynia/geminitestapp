'use client';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { MarkdownSplitEditorOptions } from '@/shared/contracts/document-editor';

export type MarkdownSplitEditorContextValue = Required<
  Pick<MarkdownSplitEditorOptions, 'value' | 'onChange' | 'showPreview' | 'renderPreviewHtml'>
> &
  MarkdownSplitEditorOptions;

export const {
  Context: MarkdownSplitEditorContextInternal,
  useStrictContext: useMarkdownSplitEditorContext,
  useOptionalContext: useOptionalMarkdownSplitEditorContext,
} = createStrictContext<MarkdownSplitEditorContextValue>({
  hookName: 'useMarkdownSplitEditorContext',
  providerName: 'MarkdownSplitEditorProvider',
  displayName: 'MarkdownSplitEditorContext',
  errorFactory: internalError,
});

export const MarkdownSplitEditorContextProvider = MarkdownSplitEditorContextInternal.Provider;
export const MarkdownSplitEditorProvider = MarkdownSplitEditorContextProvider;
