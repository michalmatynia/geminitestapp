'use client';

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import { useKangurRouting } from './KangurRoutingContext';

type KangurRouteTransitionState = {
  href: string | null;
  pageKey: string | null;
};

type KangurRouteTransitionContextValue = {
  isRoutePending: boolean;
  pendingPageKey: string | null;
  startRouteTransition: (input?: { href?: string | null; pageKey?: string | null }) => void;
};

type KangurRouteTransitionStateContextValue = Pick<
  KangurRouteTransitionContextValue,
  'isRoutePending' | 'pendingPageKey'
>;

type KangurRouteTransitionActionsContextValue = Pick<
  KangurRouteTransitionContextValue,
  'startRouteTransition'
>;

const ROUTE_TRANSITION_TIMEOUT_MS = 4_000;

const KangurRouteTransitionStateContext =
  createContext<KangurRouteTransitionStateContextValue | null>(null);
const KangurRouteTransitionActionsContext =
  createContext<KangurRouteTransitionActionsContextValue | null>(null);

export function KangurRouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { pageKey, requestedPath } = useKangurRouting();
  const [transitionState, setTransitionState] = useState<KangurRouteTransitionState | null>(null);
  const previousRequestedPathRef = useRef<string | undefined>(requestedPath);

  useEffect(() => {
    const previousRequestedPath = previousRequestedPathRef.current;

    if (
      transitionState &&
      previousRequestedPath !== undefined &&
      requestedPath !== previousRequestedPath
    ) {
      setTransitionState(null);
    }

    previousRequestedPathRef.current = requestedPath;
  }, [requestedPath, transitionState]);

  useEffect(() => {
    if (!transitionState || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTransitionState(null);
    }, ROUTE_TRANSITION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [transitionState]);

  const startRouteTransition = useCallback(
    (input: { href?: string | null; pageKey?: string | null } = {}): void => {
      const normalizedHref =
        typeof input.href === 'string' && input.href.trim().length > 0 ? input.href.trim() : null;
      const nextPageKey = input.pageKey?.trim() || null;

      if (
        (normalizedHref && normalizedHref === requestedPath) ||
        (!normalizedHref && nextPageKey !== null && nextPageKey === pageKey)
      ) {
        return;
      }

      startTransition(() => {
        setTransitionState({
          href: normalizedHref,
          pageKey: nextPageKey,
        });
      });
    },
    [pageKey, requestedPath]
  );

  const stateValue = useMemo<KangurRouteTransitionStateContextValue>(
    () => ({
      isRoutePending: transitionState !== null,
      pendingPageKey: transitionState?.pageKey ?? null,
    }),
    [transitionState]
  );
  const actionsValue = useMemo<KangurRouteTransitionActionsContextValue>(
    () => ({
      startRouteTransition,
    }),
    [startRouteTransition]
  );

  return (
    <KangurRouteTransitionActionsContext.Provider value={actionsValue}>
      <KangurRouteTransitionStateContext.Provider value={stateValue}>
        {children}
      </KangurRouteTransitionStateContext.Provider>
    </KangurRouteTransitionActionsContext.Provider>
  );
}

export const useKangurRouteTransitionState = (): KangurRouteTransitionStateContextValue => {
  const context = useContext(KangurRouteTransitionStateContext);
  if (!context) {
    throw internalError(
      'useKangurRouteTransitionState must be used within a KangurRouteTransitionProvider'
    );
  }
  return context;
};

export const useKangurRouteTransitionActions =
  (): KangurRouteTransitionActionsContextValue => {
  const context = useContext(KangurRouteTransitionActionsContext);
  if (!context) {
    throw internalError(
      'useKangurRouteTransitionActions must be used within a KangurRouteTransitionProvider'
    );
  }
  return context;
};

export const useKangurRouteTransition = (): KangurRouteTransitionContextValue => {
  const state = useContext(KangurRouteTransitionStateContext);
  const actions = useContext(KangurRouteTransitionActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useKangurRouteTransition must be used within a KangurRouteTransitionProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

export const useOptionalKangurRouteTransition = (): KangurRouteTransitionContextValue | null => {
  const state = useContext(KangurRouteTransitionStateContext);
  const actions = useContext(KangurRouteTransitionActionsContext);
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
};
