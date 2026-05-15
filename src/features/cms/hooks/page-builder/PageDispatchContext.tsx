'use client';

import { createContext, useContext, type Dispatch } from 'react';

import type { PageBuilderAction } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const PageDispatchContext = createContext<Dispatch<PageBuilderAction> | undefined>(
  undefined
);

export function usePageBuilderDispatch(): Dispatch<PageBuilderAction> {
  const context = useContext(PageDispatchContext);
  if (!context) {
    const error = internalError('usePageBuilderDispatch must be used within PageBuilderProvider');
    logClientCatch(error, {
      source: 'cms.page-builder',
      action: 'usePageBuilderDispatch',
    });
    throw error;
  }
  return context;
}
