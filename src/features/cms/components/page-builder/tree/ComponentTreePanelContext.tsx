'use client';

import React, { createContext, useContext } from 'react';

import type { FolderTreePlaceholderClassSet } from '@/shared/utils';
import type { ClipboardData } from '@/shared/contracts/cms';

import type { PageZone } from '../../../types/page-builder';

type ComponentTreeClipboard = ClipboardData | null;

export type ComponentTreePanelContextValue = {
  currentPage: unknown;
  clipboard: ComponentTreeClipboard;
  showExtractPlaceholder: boolean;
  showSectionDropPlaceholder: boolean;
  canDropSectionsAtRoot: boolean;
  canDropBlocksAtRoot: boolean;
  treePlaceholderClasses: FolderTreePlaceholderClassSet;
  treeInlineDropLabel: string;
  treeRootDropLabel: string;
  startSectionMasterDrag: (sectionId: string) => void;
  endSectionMasterDrag: () => void;
  draggedMasterSectionId: string | null;
  moveSectionByMaster: (sectionId: string, zone: PageZone, toIndex: number) => Promise<boolean>;
};

const ComponentTreePanelContext = createContext<ComponentTreePanelContextValue | null>(null);

type ComponentTreePanelProviderProps = {
  value: ComponentTreePanelContextValue;
  children: React.ReactNode;
};

export function ComponentTreePanelProvider({
  value,
  children,
}: ComponentTreePanelProviderProps): React.JSX.Element {
  return (
    <ComponentTreePanelContext.Provider value={value}>
      {children}
    </ComponentTreePanelContext.Provider>
  );
}

export function useComponentTreePanelContext(): ComponentTreePanelContextValue {
  const context = useContext(ComponentTreePanelContext);
  if (!context) {
    throw new Error('useComponentTreePanelContext must be used within ComponentTreePanelProvider');
  }
  return context;
}
