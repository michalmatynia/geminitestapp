'use client';

import React, { createContext, useContext } from 'react';

import type { BlockInstance, SectionInstance } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

export interface PreviewSectionContextValue {
  section: SectionInstance;
  selectedRing: string;
  divider: React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  renderSelectionButton: (className?: string) => React.ReactNode;
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
}): React.JSX.Element {
  return <PreviewSectionContext.Provider value={value}>{children}</PreviewSectionContext.Provider>;
}

export function usePreviewSectionContext(): PreviewSectionContextValue {
  const context = useContext(PreviewSectionContext);
  if (!context) {
    throw internalError('usePreviewSectionContext must be used within PreviewSectionProvider');
  }
  return context;
}
