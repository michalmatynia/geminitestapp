'use client';

import { createContext, useContext } from 'react';

export interface DocumentPromptState {
  promptText: string;
  returnTarget: 'image-studio' | 'case-resolver';
}

export const DocumentPromptContext = createContext<DocumentPromptState | null>(null);

export function useDocumentPrompt(): DocumentPromptState {
  const context = useContext(DocumentPromptContext);
  if (!context) throw new Error('useDocumentPrompt must be used within DocumentProvider');
  return context;
}
