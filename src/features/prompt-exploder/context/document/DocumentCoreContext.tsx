'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type {
  PromptExploderDocument,
  PromptExploderBinding,
  PromptExploderSegment,
} from '../../types';

export interface DocumentCoreState {
  documentState: PromptExploderDocument | null;
  manualBindings: PromptExploderBinding[];
  segmentById: Map<string, PromptExploderSegment>;
  segmentOptions: Array<{ value: string; label: string }>;
}

export const DocumentCoreContext = createContext<DocumentCoreState | null>(null);

export function useDocumentCore(): DocumentCoreState {
  const context = useContext(DocumentCoreContext);
  if (!context) throw internalError('useDocumentCore must be used within DocumentProvider');
  return context;
}
