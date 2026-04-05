'use client';

import React from 'react';

import type { LayoutMode } from '@/features/ai/image-studio/utils/version-graph';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { VersionNode } from '../context/VersionGraphContext';

type VersionGraphControlsContextValue = {
  nodeCount: number;
  allNodeCount: number;
  mergeMode: boolean;
  mergeSelectedIds: string[];
  mergeBusy: boolean;
  onToggleMergeMode: () => void;
  onClearMergeSelection: () => void;
  onExecuteMerge: () => void;
  compositeMode: boolean;
  compositeSelectedIds: string[];
  compositeBusy: boolean;
  onToggleCompositeMode: () => void;
  onClearCompositeSelection: () => void;
  onExecuteComposite: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  layoutMode: LayoutMode;
  onSetLayoutMode: (mode: LayoutMode) => void;
  zoom: number;
  onSetZoom: React.Dispatch<React.SetStateAction<number>>;
  onFitToView: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  showMinimapButton: boolean;
  exporting: boolean;
  onExportPng: () => void;
  filterQuery: string;
  filterTypes: Set<VersionNode['type']>;
  filterHasMask: boolean | null;
  filterLeafOnly: boolean;
  hasActiveFilters: boolean;
  onSetFilterQuery: (query: string) => void;
  onToggleFilterType: (type: VersionNode['type']) => void;
  onSetFilterHasMask: (value: boolean | null) => void;
  onToggleLeafOnly: () => void;
  onClearFilters: () => void;
};

const { Context: VersionGraphControlsContext, useStrictContext: useVersionGraphControlsContext } =
  createStrictContext<VersionGraphControlsContextValue>({
    hookName: 'useVersionGraphControlsContext',
    providerName: 'VersionGraphControlsProvider',
    displayName: 'VersionGraphControlsContext',
    errorFactory: () =>
      internalError(
        'useVersionGraphControlsContext must be used inside VersionGraphControlsProvider'
      ),
  });

export function VersionGraphControlsProvider({
  value,
  children,
}: {
  value: VersionGraphControlsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <VersionGraphControlsContext.Provider value={value}>
      {children}
    </VersionGraphControlsContext.Provider>
  );
}
export { useVersionGraphControlsContext };
