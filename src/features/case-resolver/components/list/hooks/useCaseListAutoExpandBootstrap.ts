'use client';

import { useEffect, useRef } from 'react';

type UseCaseListAutoExpandBootstrapOptions = {
  isUiStateReady: boolean;
  hasPersistedUiState: boolean;
  isCaseSubsetVisible: boolean;
  autoExpandedNodeIds: string[];
  setExpandedNodeIds: (nodeIds: string[]) => void;
};

export function useCaseListAutoExpandBootstrap({
  isUiStateReady,
  hasPersistedUiState,
  isCaseSubsetVisible,
  autoExpandedNodeIds,
  setExpandedNodeIds,
}: UseCaseListAutoExpandBootstrapOptions): void {
  const hasBootstrappedRef = useRef<boolean>(false);

  useEffect((): void => {
    if (hasBootstrappedRef.current) return;
    if (!isUiStateReady) return;
    if (hasPersistedUiState) {
      hasBootstrappedRef.current = true;
      return;
    }
    if (!isCaseSubsetVisible || autoExpandedNodeIds.length === 0) return;

    hasBootstrappedRef.current = true;
    setExpandedNodeIds(autoExpandedNodeIds);
  }, [
    autoExpandedNodeIds,
    hasPersistedUiState,
    isCaseSubsetVisible,
    isUiStateReady,
    setExpandedNodeIds,
  ]);
}
