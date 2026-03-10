'use client';

import { createContext, useContext } from 'react';

import type {
  PromptExploderParamEntry,
  PromptExploderParamEntriesState,
} from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';

export interface DocumentParamsState {
  selectedParamEntriesState: PromptExploderParamEntriesState | null;
  listParamOptions: Array<{ value: string; label: string }>;
  listParamEntryByPath: Map<string, PromptExploderParamEntry>;
}

export const DocumentParamsContext = createContext<DocumentParamsState | null>(null);

export function useDocumentParams(): DocumentParamsState {
  const context = useContext(DocumentParamsContext);
  if (!context) throw internalError('useDocumentParams must be used within DocumentProvider');
  return context;
}
