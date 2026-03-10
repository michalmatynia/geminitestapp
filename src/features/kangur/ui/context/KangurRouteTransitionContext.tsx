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
  startedAt: number;
};

type KangurRouteTransitionContextValue = {
  isRoutePending: boolean;
  isRouteRevealing: boolean;
  activeTransitionPageKey: string | null;
  pendingPageKey: string | null;
  startRouteTransition: (input?: { href?: string | null; pageKey?: string | null }) => void;
};

type KangurRouteTransitionStateContextValue = Pick<
  KangurRouteTransitionContextValue,
  'isRoutePending' | 'isRouteRevealing' | 'activeTransitionPageKey' | 'pendingPageKey'
>;

type KangurRouteTransitionActionsContextValue = Pick<
  KangurRouteTransitionContextValue,
  'startRouteTransition'
>;

const ROUTE_TRANSITION_TIMEOUT_MS = 4_000;
const ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT = 2;

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
  const shouldResetScrollOnCommitRef = useRef(false);

  useEffect(() => {
    const previousRequestedPath = previousRequestedPathRef.current;
    let animationFrameId: number | null = null;
    let clearTransitionTimeoutId: number | null = null;
    let remainingFrameCount = ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT;

    const commitTransition = (): void => {
      if (shouldResetScrollOnCommitRef.current && typeof window !== 'undefined') {
        const resetScrollPosition = (): void => {
          window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
          remainingFrameCount -= 1;
          if (remainingFrameCount > 0) {
            animationFrameId = window.requestAnimationFrame(resetScrollPosition);
            return;
          }

          animationFrameId = null;
        };

        animationFrameId = window.requestAnimationFrame(resetScrollPosition);
      }

      shouldResetScrollOnCommitRef.current = false;
      setTransitionState(null);
    };

    if (
      transitionState &&
      previousRequestedPath !== undefined &&
      requestedPath !== previousRequestedPath
    ) {
      commitTransition();
    }

    previousRequestedPathRef.current = requestedPath;

    return () => {
      if (animationFrameId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (clearTransitionTimeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(clearTransitionTimeoutId);
      }
    };
  }, [requestedPath, transitionState]);

  useEffect(() => {
    if (!transitionState || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      shouldResetScrollOnCommitRef.current = false;
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

      shouldResetScrollOnCommitRef.current = true;

      startTransition(() => {
        setTransitionState({
          href: normalizedHref,
          pageKey: nextPageKey,
          startedAt: Date.now(),
        });
      });
    },
    [pageKey, requestedPath]
  );

  const stateValue = useMemo<KangurRouteTransitionStateContextValue>(
    () => ({
      isRoutePending: transitionState !== null,
      isRouteRevealing: false,
      activeTransitionPageKey: transitionState?.pageKey ?? null,
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
