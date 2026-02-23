'use client';

import { createContext, useContext } from 'react';
import type { PageBuilderState } from '@/shared/contracts/cms';

export const PageStateContext = createContext<PageBuilderState | undefined>(undefined);

export function usePageBuilderState(): PageBuilderState {
  const context = useContext(PageStateContext);
  if (!context) {
    throw new Error('usePageBuilderState must be used within PageBuilderProvider');
  }
  return context;
}
