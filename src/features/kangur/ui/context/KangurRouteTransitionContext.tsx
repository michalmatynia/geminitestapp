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
  sourceId: string | null;
  startedAt: number;
  phase: 'acknowledging' | 'pending' | 'revealing';
};

type KangurRouteTransitionStartInput = {
  href?: string | null;
  pageKey?: string | null;
  sourceId?: string | null;
  acknowledgeMs?: number;
};

type KangurRouteTransitionStartResult = {
  started: boolean;
  acknowledgeMs: number;
};

type KangurRouteTransitionContextValue = {
  isRouteAcknowledging: boolean;
  isRoutePending: boolean;
  isRouteRevealing: boolean;
  transitionPhase: 'idle' | KangurRouteTransitionState['phase'];
  activeTransitionSourceId: string | null;
  activeTransitionPageKey: string | null;
  pendingPageKey: string | null;
  startRouteTransition: (input?: KangurRouteTransitionStartInput) => KangurRouteTransitionStartResult;
};

type KangurRouteTransitionStateContextValue = Pick<
  KangurRouteTransitionContextValue,
  | 'isRouteAcknowledging'
  | 'isRoutePending'
  | 'isRouteRevealing'
  | 'transitionPhase'
  | 'activeTransitionSourceId'
  | 'activeTransitionPageKey'
  | 'pendingPageKey'
>;

type KangurRouteTransitionActionsContextValue = Pick<
  KangurRouteTransitionContextValue,
  'startRouteTransition'
>;

const ROUTE_TRANSITION_MAX_ACKNOWLEDGE_MS = 400;
const ROUTE_TRANSITION_TIMEOUT_MS = 4_000;
const ROUTE_TRANSITION_REVEAL_MS = 220;
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
  const transitionStateRef = useRef<KangurRouteTransitionState | null>(null);
  const previousRequestedPathRef = useRef<string | undefined>(requestedPath);
  const shouldResetScrollOnCommitRef = useRef(false);
  const acknowledgementTimeoutRef = useRef<number | null>(null);

  const clearAcknowledgementTimeout = useCallback((): void => {
    if (acknowledgementTimeoutRef.current === null || typeof window === 'undefined') {
      return;
    }

    window.clearTimeout(acknowledgementTimeoutRef.current);
    acknowledgementTimeoutRef.current = null;
  }, []);

  const setNextTransitionState = useCallback((nextState: KangurRouteTransitionState | null): void => {
    transitionStateRef.current = nextState;
    setTransitionState(nextState);
  }, []);

  const updateTransitionState = useCallback(
    (
      updater: (currentState: KangurRouteTransitionState | null) => KangurRouteTransitionState | null
    ): void => {
      setTransitionState((currentState) => {
        const nextState = updater(currentState);
        transitionStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  useEffect(() => {
    transitionStateRef.current = transitionState;
  }, [transitionState]);

  useEffect(() => {
    return () => {
      clearAcknowledgementTimeout();
    };
  }, [clearAcknowledgementTimeout]);

  useEffect(() => {
    const previousRequestedPath = previousRequestedPathRef.current;
    let animationFrameId: number | null = null;
    let remainingFrameCount = ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT;

    const commitTransition = (): void => {
      clearAcknowledgementTimeout();

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
      updateTransitionState((currentState) =>
        currentState
          ? {
            ...currentState,
            phase: 'revealing',
          }
          : null
      );
    };

    if (
      (transitionState?.phase === 'acknowledging' || transitionState?.phase === 'pending') &&
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
    };
  }, [clearAcknowledgementTimeout, requestedPath, transitionState, updateTransitionState]);

  useEffect(() => {
    if (transitionState?.phase !== 'pending' || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      shouldResetScrollOnCommitRef.current = false;
      setNextTransitionState(null);
    }, ROUTE_TRANSITION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [setNextTransitionState, transitionState]);

  useEffect(() => {
    if (transitionState?.phase !== 'revealing' || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updateTransitionState((currentState) =>
        currentState?.phase === 'revealing' ? null : currentState
      );
    }, ROUTE_TRANSITION_REVEAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [transitionState, updateTransitionState]);

  const startRouteTransition = useCallback(
    (input: KangurRouteTransitionStartInput = {}): KangurRouteTransitionStartResult => {
      const normalizedHref =
        typeof input.href === 'string' && input.href.trim().length > 0 ? input.href.trim() : null;
      const nextPageKey = input.pageKey?.trim() || null;
      const nextSourceId = input.sourceId?.trim() || null;
      const requestedAcknowledgeMs = Number.isFinite(input.acknowledgeMs)
        ? Math.max(
            0,
            Math.min(Math.round(input.acknowledgeMs ?? 0), ROUTE_TRANSITION_MAX_ACKNOWLEDGE_MS)
          )
        : 0;

      if (
        (normalizedHref && normalizedHref === requestedPath) ||
        (!normalizedHref && nextPageKey !== null && nextPageKey === pageKey)
      ) {
        return {
          started: false,
          acknowledgeMs: 0,
        };
      }

      if (transitionStateRef.current) {
        return {
          started: false,
          acknowledgeMs: 0,
        };
      }

      shouldResetScrollOnCommitRef.current = true;
      clearAcknowledgementTimeout();

      const nextState: KangurRouteTransitionState = {
        href: normalizedHref,
        pageKey: nextPageKey,
        sourceId: nextSourceId,
        startedAt: Date.now(),
        phase: requestedAcknowledgeMs > 0 ? 'acknowledging' : 'pending',
      };

      transitionStateRef.current = nextState;
      startTransition(() => {
        setTransitionState(nextState);
      });

      if (requestedAcknowledgeMs > 0 && typeof window !== 'undefined') {
        acknowledgementTimeoutRef.current = window.setTimeout(() => {
          acknowledgementTimeoutRef.current = null;
          updateTransitionState((currentState) =>
            currentState?.phase === 'acknowledging'
              ? {
                  ...currentState,
                  phase: 'pending',
                }
              : currentState
          );
        }, requestedAcknowledgeMs);
      }

      return {
        started: true,
        acknowledgeMs: requestedAcknowledgeMs,
      };
    },
    [clearAcknowledgementTimeout, pageKey, requestedPath, setNextTransitionState, updateTransitionState]
  );

  const stateValue = useMemo<KangurRouteTransitionStateContextValue>(
    () => ({
      isRouteAcknowledging: transitionState?.phase === 'acknowledging',
      isRoutePending: transitionState?.phase === 'pending',
      isRouteRevealing: transitionState?.phase === 'revealing',
      transitionPhase: transitionState?.phase ?? 'idle',
      activeTransitionSourceId: transitionState?.sourceId ?? null,
      activeTransitionPageKey: transitionState?.pageKey ?? null,
      pendingPageKey: transitionState?.phase === 'pending' ? transitionState.pageKey ?? null : null,
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

export const useOptionalKangurRouteTransitionState =
  (): KangurRouteTransitionStateContextValue | null => {
    return useContext(KangurRouteTransitionStateContext);
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

export const useOptionalKangurRouteTransitionActions =
  (): KangurRouteTransitionActionsContextValue | null => {
    return useContext(KangurRouteTransitionActionsContext);
  };
