'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { PromptExploderSegment } from '../../types';

export interface DocumentSelectionState {
  selectedSegmentId: string | null;
  selectedSegment: PromptExploderSegment | null;
}

export const DocumentSelectionContext = createContext<DocumentSelectionState | null>(null);

export function useDocumentSelection(): DocumentSelectionState {
  const context = useContext(DocumentSelectionContext);
  if (!context) throw internalError('useDocumentSelection must be used within DocumentProvider');
  return context;
}
