'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { UnknownRecord } from '@/shared/contracts/base';

import type { CmsRuntimeContextValue } from './CmsRuntimeShared';

export {
  isCmsNodeVisible,
  resolveCmsConnectedSettings,
  resolveCmsRuntimeAction,
  resolveCmsRuntimeCollection,
  resolveCmsRuntimeValue,
  type CmsRuntimeAction,
  type CmsRuntimeContextValue,
} from './CmsRuntimeShared';

const CmsRuntimeContext = createContext<CmsRuntimeContextValue | null>(null);

export function CmsRuntimeProvider({
  sources,
  children,
}: {
  sources: UnknownRecord;
  children: React.ReactNode;
}): React.ReactNode {
  const value = useMemo<CmsRuntimeContextValue>(() => ({ sources }), [sources]);

  return <CmsRuntimeContext.Provider value={value}>{children}</CmsRuntimeContext.Provider>;
}

export function CmsRuntimeScopeProvider({
  sources,
  children,
}: {
  sources: UnknownRecord;
  children: React.ReactNode;
}): React.ReactNode {
  const parentRuntime = useContext(CmsRuntimeContext);
  const value = useMemo<CmsRuntimeContextValue>(
    () => ({
      sources: {
        ...(parentRuntime?.sources ?? {}),
        ...sources,
      },
    }),
    [parentRuntime, sources]
  );

  return <CmsRuntimeContext.Provider value={value}>{children}</CmsRuntimeContext.Provider>;
}

export function useOptionalCmsRuntime(): CmsRuntimeContextValue | null {
  return useContext(CmsRuntimeContext);
}
