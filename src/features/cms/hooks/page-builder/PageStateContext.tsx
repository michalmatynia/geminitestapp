'use client';

import { createContext, useContext } from 'react';
import type { PageBuilderState } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

export const PageStateContext = createContext<PageBuilderState | undefined>(undefined);

export function usePageBuilderState(): PageBuilderState {
  const context = useContext(PageStateContext);
  if (!context) {
    throw internalError('usePageBuilderState must be used within PageBuilderProvider');
  }
  return context;
}
