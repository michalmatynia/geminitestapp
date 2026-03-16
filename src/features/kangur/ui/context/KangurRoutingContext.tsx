'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { KANGUR_BASE_PATH, normalizeKangurBasePath } from '@/features/kangur/config/routing';
import { internalError } from '@/features/kangur/shared/errors/app-error';

type KangurRoutingContextValue = {
  pageKey?: string | null;
  requestedPath?: string;
  requestedHref?: string;
  basePath: string;
  embedded: boolean;
};

type KangurRoutingStateContextValue = KangurRoutingContextValue;
type KangurRoutingActionsContextValue = Record<string, never>;

const KangurRoutingStateContext = createContext<KangurRoutingStateContextValue | null>(null);
const KangurRoutingActionsContext = createContext<KangurRoutingActionsContextValue | null>(null);
const EMPTY_KANGUR_ROUTING_ACTIONS: KangurRoutingActionsContextValue = {};

type KangurRoutingProviderProps = {
  pageKey?: string | null;
  requestedPath?: string;
  requestedHref?: string;
  basePath?: string;
  embedded?: boolean;
  children: ReactNode;
};

export const KangurRoutingProvider = ({
  pageKey,
  requestedPath,
  requestedHref,
  basePath = KANGUR_BASE_PATH,
  embedded = false,
  children,
}: KangurRoutingProviderProps): React.JSX.Element => {
  const resolvedBasePath = normalizeKangurBasePath(basePath);
  const stateValue = useMemo<KangurRoutingStateContextValue>(
    () => ({
      pageKey,
      requestedPath,
      requestedHref: requestedHref ?? requestedPath,
      basePath: resolvedBasePath,
      embedded,
    }),
    [embedded, pageKey, requestedHref, requestedPath, resolvedBasePath]
  );

  return (
    <KangurRoutingActionsContext.Provider value={EMPTY_KANGUR_ROUTING_ACTIONS}>
      <KangurRoutingStateContext.Provider value={stateValue}>
        {children}
      </KangurRoutingStateContext.Provider>
    </KangurRoutingActionsContext.Provider>
  );
};

export const useKangurRoutingState = (): KangurRoutingStateContextValue => {
  const context = useContext(KangurRoutingStateContext);
  if (!context) {
    throw internalError('useKangurRoutingState must be used within a KangurRoutingProvider');
  }
  return context;
};

export const useKangurRoutingActions = (): KangurRoutingActionsContextValue => {
  const context = useContext(KangurRoutingActionsContext);
  if (!context) {
    throw internalError('useKangurRoutingActions must be used within a KangurRoutingProvider');
  }
  return context;
};

export const useKangurRouting = (): KangurRoutingContextValue => {
  const context = useContext(KangurRoutingStateContext);
  if (!context) {
    throw internalError('useKangurRouting must be used within a KangurRoutingProvider');
  }
  return context;
};

export const useOptionalKangurRouting = (): KangurRoutingContextValue | null =>
  useContext(KangurRoutingStateContext);
