'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { ColorSchemeColors } from './theme-styles';

interface CmsPageContextValue {
  colorSchemes: Record<string, ColorSchemeColors>;
  layout: { fullWidth?: boolean };
}

export const {
  Context: CmsPageContext,
  useStrictContext: useCmsPageContext,
  useOptionalContext: useOptionalCmsPageContext,
} = createStrictContext<CmsPageContextValue>({
  hookName: 'useCmsPageContext',
  providerName: 'a CmsPageProvider',
  displayName: 'CmsPageContext',
  errorFactory: internalError,
});

export function CmsPageProvider({
  colorSchemes,
  layout,
  children,
}: CmsPageContextValue & { children: React.ReactNode }) {
  return (
    <CmsPageContext.Provider value={{ colorSchemes, layout }}>{children}</CmsPageContext.Provider>
  );
}
