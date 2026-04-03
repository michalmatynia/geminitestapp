'use client';

import React, { useMemo, useState } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useCaseResolverFolderTreeRuntime } from './useCaseResolverFolderTreeRuntime';

import type {
  CaseResolverFolderTreeDataContextValue,
  CaseResolverFolderTreeUiActionsContextValue,
  CaseResolverFolderTreeUiContextValue,
  CaseResolverFolderTreeUiStateContextValue,
} from './CaseResolverFolderTreeContext.types';

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

const {
  Context: CaseResolverFolderTreeDataContext,
  useStrictContext: useCaseResolverFolderTreeDataContext,
} = createStrictContext<CaseResolverFolderTreeDataContextValue>({
  hookName: 'useCaseResolverFolderTreeDataContext',
  providerName: 'CaseResolverFolderTreeProvider',
  displayName: 'CaseResolverFolderTreeDataContext',
  errorFactory: internalError,
});

const {
  Context: CaseResolverFolderTreeUiStateContext,
  useStrictContext: useCaseResolverFolderTreeUiStateContext,
} = createStrictContext<CaseResolverFolderTreeUiStateContextValue>({
  hookName: 'useCaseResolverFolderTreeUiStateContext',
  providerName: 'CaseResolverFolderTreeProvider',
  displayName: 'CaseResolverFolderTreeUiStateContext',
  errorFactory: internalError,
});

const {
  Context: CaseResolverFolderTreeUiActionsContext,
  useStrictContext: useCaseResolverFolderTreeUiActionsContext,
} = createStrictContext<CaseResolverFolderTreeUiActionsContextValue>({
  hookName: 'useCaseResolverFolderTreeUiActionsContext',
  providerName: 'CaseResolverFolderTreeProvider',
  displayName: 'CaseResolverFolderTreeUiActionsContext',
  errorFactory: internalError,
});

export {
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiActionsContext,
  useCaseResolverFolderTreeUiStateContext,
};

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
