'use client';

import { createContext, useContext } from 'react';

import type { SectionInstance, BlockInstance } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

export interface PageSelectionValue {
  selectedSection: SectionInstance | null;
  selectedBlock: BlockInstance | null;
  selectedParentSection: SectionInstance | null;
  selectedColumn: BlockInstance | null;
  selectedColumnParentSection: SectionInstance | null;
  selectedParentColumn: BlockInstance | null;
  selectedParentRow: BlockInstance | null;
  selectedParentBlock: BlockInstance | null;
}

export const PageSelectionContext = createContext<PageSelectionValue | undefined>(undefined);

export function usePageBuilderSelection(): PageSelectionValue {
  const context = useContext(PageSelectionContext);
  if (!context) {
    throw internalError('usePageBuilderSelection must be used within PageBuilderProvider');
  }
  return context;
}
