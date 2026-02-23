'use client';

import { createContext, useContext, Dispatch } from 'react';
import type { PageBuilderAction } from '@/shared/contracts/cms';

export const PageDispatchContext = createContext<Dispatch<PageBuilderAction> | undefined>(undefined);

export function usePageBuilderDispatch(): Dispatch<PageBuilderAction> {
  const context = useContext(PageDispatchContext);
  if (!context) {
    throw new Error('usePageBuilderDispatch must be used within PageBuilderProvider');
  }
  return context;
}
