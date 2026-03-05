'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

type KangurRoutingContextValue = {
  pageKey?: string | null;
  requestedPath?: string;
};

const KangurRoutingContext = createContext<KangurRoutingContextValue | null>(null);

type KangurRoutingProviderProps = {
  pageKey?: string | null;
  requestedPath?: string;
  children: ReactNode;
};

export const KangurRoutingProvider = ({
  pageKey,
  requestedPath,
  children,
}: KangurRoutingProviderProps): React.JSX.Element => {
  const value = useMemo(
    () => ({
      pageKey,
      requestedPath,
    }),
    [pageKey, requestedPath]
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
