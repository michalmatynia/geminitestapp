'use client';

import React, { createContext, useContext } from 'react';

import type { BlockInstance, SectionInstance } from '@/shared/contracts/cms';

export interface PreviewSectionContextValue {
  section: SectionInstance;
  selectedRing: string;
  divider: React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  handleSelect: () => void;
  PreviewBlockItem: React.ComponentType<{ block: BlockInstance }>;
}

const PreviewSectionContext = createContext<PreviewSectionContextValue | null>(null);

export function PreviewSectionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PreviewSectionContextValue;
}) {
  return <PreviewSectionContext.Provider value={value}>{children}</PreviewSectionContext.Provider>;
}

export function usePreviewSectionContext() {
  const context = useContext(PreviewSectionContext);
  if (!context) {
    throw new Error('usePreviewSectionContext must be used within PreviewSectionProvider');
  }
  return context;
}
