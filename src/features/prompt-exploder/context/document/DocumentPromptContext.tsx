'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

export interface DocumentPromptState {
  promptText: string;
  returnTarget: 'image-studio' | 'case-resolver';
}

export const DocumentPromptContext = createContext<DocumentPromptState | null>(null);

export function useDocumentPrompt(): DocumentPromptState {
  const context = useContext(DocumentPromptContext);
  if (!context) throw internalError('useDocumentPrompt must be used within DocumentProvider');
  return context;
}
