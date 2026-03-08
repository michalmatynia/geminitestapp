'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type {
  CaseResolverFolderTreeDataContextValue,
  CaseResolverFolderTreeUiActionsContextValue,
  CaseResolverFolderTreeUiContextValue,
  CaseResolverFolderTreeUiStateContextValue,
} from './CaseResolverFolderTreeContext.types';
import {
  isCaseResolverVirtualSectionNode,
  isChildCaseStructureFolderPath,
  isChildCaseStructureNode,
  isUnassignedFolderPath,
  isUnassignedNode,
  resolveCaseResolverRootTreeNodes,
} from './case-resolver-folder-tree-utils';
import { useCaseResolverFolderTreeRuntime } from './useCaseResolverFolderTreeRuntime';

export type {
  CaseResolverFolderTreeDataContextValue,
  CaseResolverFolderTreeRuntimeResult,
  CaseResolverFolderTreeUiActionsContextValue,
  CaseResolverFolderTreeUiContextValue,
  CaseResolverFolderTreeUiStateContextValue,
} from './CaseResolverFolderTreeContext.types';
export {
  isCaseResolverVirtualSectionNode,
  isChildCaseStructureFolderPath,
  isChildCaseStructureNode,
  isUnassignedFolderPath,
  isUnassignedNode,
  resolveCaseResolverRootTreeNodes,
} from './case-resolver-folder-tree-utils';

const CaseResolverFolderTreeDataContext =
  createContext<CaseResolverFolderTreeDataContextValue | null>(null);
const CaseResolverFolderTreeUiStateContext =
  createContext<CaseResolverFolderTreeUiStateContextValue | null>(null);
const CaseResolverFolderTreeUiActionsContext =
  createContext<CaseResolverFolderTreeUiActionsContextValue | null>(null);

export function useCaseResolverFolderTreeDataContext(): CaseResolverFolderTreeDataContextValue {
  const context = useContext(CaseResolverFolderTreeDataContext);
  if (!context) {
    throw internalError(
      'useCaseResolverFolderTreeDataContext must be used within CaseResolverFolderTreeProvider'
    );
  }
  return context;
}

export function useCaseResolverFolderTreeUiStateContext(): CaseResolverFolderTreeUiStateContextValue {
  const context = useContext(CaseResolverFolderTreeUiStateContext);
  if (!context) {
    throw internalError(
      'useCaseResolverFolderTreeUiStateContext must be used within CaseResolverFolderTreeProvider'
    );
  }
  return context;
}

export function useCaseResolverFolderTreeUiActionsContext(): CaseResolverFolderTreeUiActionsContextValue {
  const context = useContext(CaseResolverFolderTreeUiActionsContext);
  if (!context) {
    throw internalError(
      'useCaseResolverFolderTreeUiActionsContext must be used within CaseResolverFolderTreeProvider'
    );
  }
  return context;
}

export function useCaseResolverFolderTreeUiContext(): CaseResolverFolderTreeUiContextValue {
  const state = useCaseResolverFolderTreeUiStateContext();
  const actions = useCaseResolverFolderTreeUiActionsContext();
  return { ...state, ...actions };
}

export function CaseResolverFolderTreeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [showChildCaseFolders, setShowChildCaseFolders] = useState(true);
  const [highlightedNodeFileAssetIds, setHighlightedNodeFileAssetIds] = useState<string[]>([]);

  const { dataValue, uiStateValue } = useCaseResolverFolderTreeRuntime({
    showChildCaseFolders,
    highlightedNodeFileAssetIds,
    setShowChildCaseFolders,
    setHighlightedNodeFileAssetIds,
  });

  const uiActionsValue = useMemo(
    (): CaseResolverFolderTreeUiActionsContextValue => ({
      setShowChildCaseFolders,
      setHighlightedNodeFileAssetIds,
    }),
    []
  );

  return (
    <CaseResolverFolderTreeDataContext.Provider value={dataValue}>
      <CaseResolverFolderTreeUiStateContext.Provider value={uiStateValue}>
        <CaseResolverFolderTreeUiActionsContext.Provider value={uiActionsValue}>
          {children}
        </CaseResolverFolderTreeUiActionsContext.Provider>
      </CaseResolverFolderTreeUiStateContext.Provider>
    </CaseResolverFolderTreeDataContext.Provider>
  );
}
