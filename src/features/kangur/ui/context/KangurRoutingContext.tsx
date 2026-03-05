'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { KANGUR_BASE_PATH, normalizeKangurBasePath } from '@/features/kangur/config/routing';

type KangurRoutingContextValue = {
  pageKey?: string | null;
  requestedPath?: string;
  basePath: string;
};

const KangurRoutingContext = createContext<KangurRoutingContextValue | null>(null);

type KangurRoutingProviderProps = {
  pageKey?: string | null;
  requestedPath?: string;
  basePath?: string;
  children: ReactNode;
};

export const KangurRoutingProvider = ({
  pageKey,
  requestedPath,
  basePath = KANGUR_BASE_PATH,
  children,
}: KangurRoutingProviderProps): React.JSX.Element => {
  const resolvedBasePath = normalizeKangurBasePath(basePath);
  const value = useMemo(
    () => ({
      pageKey,
      requestedPath,
      basePath: resolvedBasePath,
    }),
    [pageKey, requestedPath, resolvedBasePath]
  );

  return <KangurRoutingContext.Provider value={value}>{children}</KangurRoutingContext.Provider>;
};

export const useKangurRouting = (): KangurRoutingContextValue => {
  const context = useContext(KangurRoutingContext);
  if (!context) {
    throw new Error('useKangurRouting must be used within a KangurRoutingProvider');
  }
  return context;
};
