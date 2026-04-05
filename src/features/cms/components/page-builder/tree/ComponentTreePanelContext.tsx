'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { PageZone } from '@/features/cms/types/page-builder';
import type { ClipboardData } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils/folder-tree-profiles-v2';

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
  moveSectionByMaster: (
    sectionId: string,
    zone: PageZone,
    toIndex: number,
    toParentSectionId?: string | null
  ) => Promise<boolean>;
};

export type ComponentTreePanelStateContextValue = Omit<
  ComponentTreePanelContextValue,
  'startSectionMasterDrag' | 'endSectionMasterDrag' | 'moveSectionByMaster'
>;
export type ComponentTreePanelActionsContextValue = Pick<
  ComponentTreePanelContextValue,
  'startSectionMasterDrag' | 'endSectionMasterDrag' | 'moveSectionByMaster'
>;

const ComponentTreePanelStateContext = createContext<ComponentTreePanelStateContextValue | null>(
  null
);
const ComponentTreePanelActionsContext =
  createContext<ComponentTreePanelActionsContextValue | null>(null);

type ComponentTreePanelProviderProps = {
  value: ComponentTreePanelContextValue;
  children: React.ReactNode;
};

export function ComponentTreePanelProvider({
  value,
  children,
}: ComponentTreePanelProviderProps): React.JSX.Element {
  const stateValue = useMemo(
    (): ComponentTreePanelStateContextValue => ({
      currentPage: value.currentPage,
      clipboard: value.clipboard,
      showExtractPlaceholder: value.showExtractPlaceholder,
      showSectionDropPlaceholder: value.showSectionDropPlaceholder,
      canDropSectionsAtRoot: value.canDropSectionsAtRoot,
      canDropBlocksAtRoot: value.canDropBlocksAtRoot,
      treePlaceholderClasses: value.treePlaceholderClasses,
      treeInlineDropLabel: value.treeInlineDropLabel,
      treeRootDropLabel: value.treeRootDropLabel,
      draggedMasterSectionId: value.draggedMasterSectionId,
    }),
    [
      value.currentPage,
      value.clipboard,
      value.showExtractPlaceholder,
      value.showSectionDropPlaceholder,
      value.canDropSectionsAtRoot,
      value.canDropBlocksAtRoot,
      value.treePlaceholderClasses,
      value.treeInlineDropLabel,
      value.treeRootDropLabel,
      value.draggedMasterSectionId,
    ]
  );
  const actionsValue = useMemo(
    (): ComponentTreePanelActionsContextValue => ({
      startSectionMasterDrag: value.startSectionMasterDrag,
      endSectionMasterDrag: value.endSectionMasterDrag,
      moveSectionByMaster: value.moveSectionByMaster,
    }),
    [value.startSectionMasterDrag, value.endSectionMasterDrag, value.moveSectionByMaster]
  );

  return (
    <ComponentTreePanelActionsContext.Provider value={actionsValue}>
      <ComponentTreePanelStateContext.Provider value={stateValue}>
        {children}
      </ComponentTreePanelStateContext.Provider>
    </ComponentTreePanelActionsContext.Provider>
  );
}

export function useComponentTreePanelState(): ComponentTreePanelStateContextValue {
  const context = useContext(ComponentTreePanelStateContext);
  if (!context) {
    throw internalError('useComponentTreePanelState must be used within ComponentTreePanelProvider');
  }
  return context;
}

export function useComponentTreePanelActions(): ComponentTreePanelActionsContextValue {
  const context = useContext(ComponentTreePanelActionsContext);
  if (!context) {
    throw internalError('useComponentTreePanelActions must be used within ComponentTreePanelProvider');
  }
  return context;
}
