'use client';

import React from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverRelationGraph,
} from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface CaseResolverRelationsWorkspaceContextValue {
  relationGraph: CaseResolverRelationGraph;
  workspaceSnapshot: {
    relationGraphSource: unknown;
    folders: string[];
    files: CaseResolverFile[];
    assets: CaseResolverAssetFile[];
  };
}

const {
  Context: CaseResolverRelationsWorkspaceContext,
  useStrictContext: useCaseResolverRelationsWorkspaceContext,
} = createStrictContext<CaseResolverRelationsWorkspaceContextValue>({
  hookName: 'useCaseResolverRelationsWorkspaceContext',
  providerName: 'CaseResolverRelationsWorkspaceProvider',
  displayName: 'CaseResolverRelationsWorkspaceContext',
  errorFactory: internalError,
});

export { useCaseResolverRelationsWorkspaceContext };

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
