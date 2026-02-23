'use client';

import React, { createContext, useContext } from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverRelationGraph,
} from '@/shared/contracts/case-resolver';

export interface CaseResolverRelationsWorkspaceContextValue {
  relationGraph: CaseResolverRelationGraph;
  focusCaseId: string | null;
  workspaceSnapshot: {
    relationGraphSource: unknown;
    folders: string[];
    files: CaseResolverFile[];
    assets: CaseResolverAssetFile[];
  };
}

const CaseResolverRelationsWorkspaceContext = createContext<CaseResolverRelationsWorkspaceContextValue | null>(null);

export function CaseResolverRelationsWorkspaceProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CaseResolverRelationsWorkspaceContextValue;
}) {
  return (
    <CaseResolverRelationsWorkspaceContext.Provider value={value}>
      {children}
    </CaseResolverRelationsWorkspaceContext.Provider>
  );
}

export function useCaseResolverRelationsWorkspaceContext() {
  const context = useContext(CaseResolverRelationsWorkspaceContext);
  if (!context) {
    throw new Error('useCaseResolverRelationsWorkspaceContext must be used within CaseResolverRelationsWorkspaceProvider');
  }
  return context;
}
