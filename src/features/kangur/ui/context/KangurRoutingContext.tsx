'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { KANGUR_BASE_PATH, normalizeKangurBasePath } from '@/shared/contracts/kangur';

type KangurRoutingContextValue = {
  pageKey?: string | null;
  requestedPath?: string;
  basePath: string;
  embedded: boolean;
};

const KangurRoutingContext = createContext<KangurRoutingContextValue | null>(null);

type KangurRoutingProviderProps = {
  pageKey?: string | null;
  requestedPath?: string;
  basePath?: string;
  embedded?: boolean;
  children: ReactNode;
};

export const KangurRoutingProvider = ({
  pageKey,
  requestedPath,
  basePath = KANGUR_BASE_PATH,
  embedded = false,
  children,
}: KangurRoutingProviderProps): React.JSX.Element => {
  const resolvedBasePath = normalizeKangurBasePath(basePath);
  const value = useMemo(
    () => ({
      pageKey,
      requestedPath,
      basePath: resolvedBasePath,
      embedded,
    }),
    [embedded, pageKey, requestedPath, resolvedBasePath]
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

export const useOptionalKangurRouting = (): KangurRoutingContextValue | null =>
  useContext(KangurRoutingContext);
