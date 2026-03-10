'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { ColorSchemeColors } from './theme-styles';

interface CmsPageContextValue {
  colorSchemes: Record<string, ColorSchemeColors>;
  layout: { fullWidth?: boolean };
}

const CmsPageContext = createContext<CmsPageContextValue | null>(null);

export function CmsPageProvider({
  colorSchemes,
  layout,
  children,
}: CmsPageContextValue & { children: React.ReactNode }) {
  return (
    <CmsPageContext.Provider value={{ colorSchemes, layout }}>{children}</CmsPageContext.Provider>
  );
}

export function useCmsPageContext() {
  const context = useContext(CmsPageContext);
  if (!context) {
    throw internalError('useCmsPageContext must be used within a CmsPageProvider');
  }
  return context;
}

export function useOptionalCmsPageContext() {
  return useContext(CmsPageContext);
}
