'use client';

import { createContext, useContext } from 'react';
import type {
  PromptExploderParamEntry,
  PromptExploderParamEntriesState,
} from '@/shared/contracts/prompt-exploder';

export interface DocumentParamsState {
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamOptions: Array<{ value: string; label: string }>;
  listParamEntryByPath: Map<string, PromptExploderParamEntry>;
}

export const DocumentParamsContext = createContext<DocumentParamsState | null>(null);

export function useDocumentParams(): DocumentParamsState {
  const context = useContext(DocumentParamsContext);
  if (!context) throw new Error('useDocumentParams must be used within DocumentProvider');
  return context;
}
