'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useOptionalCmsPageContext } from '../CmsPageContext';

import type { ColorSchemeColors } from '../theme-styles';

interface SectionData {
  settings: Record<string, unknown>;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
}

const SectionDataContext = createContext<SectionData | null>(null);

export function SectionDataProvider({
  settings,
  colorSchemes: propColorSchemes,
  children,
}: SectionData & { children: React.ReactNode }): React.ReactNode {
  const pageContext = useOptionalCmsPageContext();
  const colorSchemes = propColorSchemes ?? pageContext?.colorSchemes;

  return (
    <SectionDataContext.Provider value={{ settings, colorSchemes }}>
      {children}
    </SectionDataContext.Provider>
  );
}

export function useSectionData(): SectionData {
  const context = useContext(SectionDataContext);
  if (!context) {
    throw internalError('useSectionData must be used within a SectionDataProvider');
  }
  return context;
}
