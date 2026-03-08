'use client';

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

const ROUTE_TRANSITION_TIMEOUT_MS = 4_000;

const KangurRouteTransitionContext = createContext<KangurRouteTransitionContextValue | null>(null);

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

  const value = useMemo<KangurRouteTransitionContextValue>(
    () => ({
      isRoutePending: transitionState !== null,
      pendingPageKey: transitionState?.pageKey ?? null,
      startRouteTransition: (input = {}): void => {
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
    }),
    [pageKey, requestedPath, transitionState]
  );

  return (
    <KangurRouteTransitionContext.Provider value={value}>
      {children}
    </KangurRouteTransitionContext.Provider>
  );
}

export const useKangurRouteTransition = (): KangurRouteTransitionContextValue => {
  const context = useContext(KangurRouteTransitionContext);
  if (!context) {
    throw new Error(
      'useKangurRouteTransition must be used within a KangurRouteTransitionProvider'
    );
  }
  return context;
};

export const useOptionalKangurRouteTransition = (): KangurRouteTransitionContextValue | null =>
  useContext(KangurRouteTransitionContext);

