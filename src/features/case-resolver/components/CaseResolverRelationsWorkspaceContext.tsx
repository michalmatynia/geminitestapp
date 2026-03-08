'use client';

import React, { createContext, useContext } from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverRelationGraph,
} from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';

export interface CaseResolverRelationsWorkspaceContextValue {
  relationGraph: CaseResolverRelationGraph;
  workspaceSnapshot: {
    relationGraphSource: unknown;
    folders: string[];
    files: CaseResolverFile[];
    assets: CaseResolverAssetFile[];
  };
}

const CaseResolverRelationsWorkspaceContext =
  createContext<CaseResolverRelationsWorkspaceContextValue | null>(null);

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
    throw internalError(
      'useCaseResolverRelationsWorkspaceContext must be used within CaseResolverRelationsWorkspaceProvider'
    );
  }
  return context;
}
