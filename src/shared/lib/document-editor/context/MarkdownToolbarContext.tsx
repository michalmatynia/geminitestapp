'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { DocumentEditorMode } from '../types';

export type MarkdownToolbarActionHandlers = {
  onApplyWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onApplyLinePrefix: (prefix: string) => void;
  onInsertAtCursor: (value: string) => void;
  onApplyBulletList: () => void;
  onApplyChecklist: () => void;
  onApplySpanStyle: (colorValue: string, fontValue: string) => void;
};

export type MarkdownToolbarContextValue = MarkdownToolbarActionHandlers & {
  mode: DocumentEditorMode;
  onModeChange: (mode: DocumentEditorMode) => void;
  isModeLocked?: boolean;
  isMigrating?: boolean;
  onMigrateToWysiwyg?: () => void;
  onMigrateToMarkdown?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  textColor: string;
  onTextColorChange: (next: string) => void;
  fontFamily: string;
  onFontFamilyChange: (next: string) => void;
  fileReferenceOptions?: Array<LabeledOptionDto<string>>;
  onInsertFileReference?: (value: string) => void;
};

export const {
  Context: MarkdownToolbarContextInternal,
  useStrictContext: useMarkdownToolbarContext,
  useOptionalContext: useOptionalMarkdownToolbarContext,
} = createStrictContext<MarkdownToolbarContextValue>({
  hookName: 'useMarkdownToolbarContext',
  providerName: 'MarkdownToolbarProvider',
  displayName: 'MarkdownToolbarContext',
  errorFactory: internalError,
});

export const MarkdownToolbarContext =
  MarkdownToolbarContextInternal as React.Context<MarkdownToolbarContextValue | null>;

type MarkdownToolbarProviderProps = {
  value: MarkdownToolbarContextValue;
  children: React.ReactNode;
};

export function MarkdownToolbarProvider({
  value,
  children,
}: MarkdownToolbarProviderProps): React.JSX.Element {
  return (
    <MarkdownToolbarContext.Provider value={value}>{children}</MarkdownToolbarContext.Provider>
  );
}
