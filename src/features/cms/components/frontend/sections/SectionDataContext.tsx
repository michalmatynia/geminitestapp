'use client';

import React, { createContext, useContext } from 'react';

import type { ColorSchemeColors } from '../theme-styles';

interface SectionData {
  settings: Record<string, unknown>;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
}

const SectionDataContext = createContext<SectionData | null>(null);

export function SectionDataProvider({
  settings,
  colorSchemes,
  children,
}: SectionData & { children: React.ReactNode }): React.ReactNode {
  return (
    <SectionDataContext.Provider value={{ settings, colorSchemes }}>
      {children}
    </SectionDataContext.Provider>
  );
}

export function useSectionData(): SectionData {
  const context = useContext(SectionDataContext);
  if (!context) {
    throw new Error('useSectionData must be used within a SectionDataProvider');
  }
  return context;
}
