'use client';

import React, { createContext, useContext } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';

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

export const MarkdownToolbarContext = createContext<MarkdownToolbarContextValue | null>(null);

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

export function useMarkdownToolbarContext(): MarkdownToolbarContextValue {
  const context = useContext(MarkdownToolbarContext);
  if (!context) {
    throw internalError('useMarkdownToolbarContext must be used within MarkdownToolbarProvider');
  }
  return context;
}

export function useOptionalMarkdownToolbarContext(): MarkdownToolbarContextValue | null {
  return useContext(MarkdownToolbarContext);
}
