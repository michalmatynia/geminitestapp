'use client';

import React, { createContext, useContext } from 'react';

import type { BlockInstance } from '@/features/cms/types/page-builder';

type SectionBlockData = {
  sectionId?: string | undefined;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
};

const SectionBlockContext = createContext<SectionBlockData | null>(null);

export function SectionBlockProvider({
  sectionId,
  settings,
  blocks,
  children,
}: SectionBlockData & { children: React.ReactNode }): React.ReactNode {
  return (
    <SectionBlockContext.Provider value={{ sectionId, settings, blocks }}>
      {children}
    </SectionBlockContext.Provider>
  );
}

export function useSectionBlockData(): SectionBlockData {
  const context = useContext(SectionBlockContext);
  if (!context) {
    throw new Error('useSectionBlockData must be used within a SectionBlockProvider');
  }
  return context;
}
