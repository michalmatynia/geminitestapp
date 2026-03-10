'use client';

import { createContext, useContext, Dispatch } from 'react';

import type { PageBuilderAction } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

export const PageDispatchContext = createContext<Dispatch<PageBuilderAction> | undefined>(
  undefined
);

export function usePageBuilderDispatch(): Dispatch<PageBuilderAction> {
  const context = useContext(PageDispatchContext);
  if (!context) {
    throw internalError('usePageBuilderDispatch must be used within PageBuilderProvider');
  }
  return context;
}
