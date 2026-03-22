'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

import { useKangurRouting } from './KangurRoutingContext';
import {
  resolveKangurRouteTransitionSkeletonVariant,
  type KangurRouteTransitionSkeletonVariant,
} from '../routing/route-transition-skeletons';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';


type KangurRouteTransitionPhase =
  | 'acknowledging'
  | 'pending'
  | 'waiting_for_ready'
  | 'revealing';

export type KangurRouteTransitionKind = 'navigation' | 'locale-switch';

type KangurRouteTransitionState = {
  href: string | null;
  pageKey: string | null;
  sourceId: string | null;
  kind: KangurRouteTransitionKind;
  skeletonVariant: KangurRouteTransitionSkeletonVariant;
  committedRequestedHref: string | null;
  startedAt: number;
  phase: KangurRouteTransitionPhase;
};

type KangurRouteTransitionStartInput = {
  href?: string | null;
  pageKey?: string | null;
  sourceId?: string | null;
  acknowledgeMs?: number;
  skeletonVariant?: KangurRouteTransitionSkeletonVariant | null;
  transitionKind?: KangurRouteTransitionKind | null;
};

type KangurRouteTransitionReadyInput = {
  pageKey?: string | null;
  requestedHref?: string | null;
};

type KangurRouteTransitionStartResult = {
  started: boolean;
  acknowledgeMs: number;
};

type KangurRouteTransitionContextValue = {
  isRouteAcknowledging: boolean;
  isRoutePending: boolean;
  isRouteWaitingForReady: boolean;
  isRouteRevealing: boolean;
  transitionPhase: 'idle' | KangurRouteTransitionState['phase'];
  activeTransitionSourceId: string | null;
  activeTransitionKind: KangurRouteTransitionKind | null;
  activeTransitionPageKey: string | null;
  activeTransitionRequestedHref: string | null;
  activeTransitionSkeletonVariant: KangurRouteTransitionSkeletonVariant | null;
  pendingPageKey: string | null;
  startRouteTransition: (input?: KangurRouteTransitionStartInput) => KangurRouteTransitionStartResult;
  markRouteTransitionReady: (input?: KangurRouteTransitionReadyInput) => void;
};

type KangurRouteTransitionStateContextValue = Pick<
  KangurRouteTransitionContextValue,
  | 'isRouteAcknowledging'
  | 'isRoutePending'
  | 'isRouteWaitingForReady'
  | 'isRouteRevealing'
  | 'transitionPhase'
  | 'activeTransitionSourceId'
  | 'activeTransitionKind'
  | 'activeTransitionPageKey'
  | 'activeTransitionRequestedHref'
  | 'activeTransitionSkeletonVariant'
  | 'pendingPageKey'
>;

type KangurRouteTransitionActionsContextValue = Pick<
  KangurRouteTransitionContextValue,
  'markRouteTransitionReady' | 'startRouteTransition'
>;

const ROUTE_TRANSITION_MAX_ACKNOWLEDGE_MS = 400;
const ROUTE_TRANSITION_TIMEOUT_MS = 2_000;
const LOCALE_SWITCH_ROUTE_TRANSITION_READY_TIMEOUT_MS = 1_200;
const ROUTE_TRANSITION_REVEAL_MS = 140;
const LOCALE_SWITCH_ROUTE_TRANSITION_REVEAL_MS = 120;
const ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT = 2;

const normalizeTransitionKind = (
  value: KangurRouteTransitionKind | null | undefined
): KangurRouteTransitionKind => (value === 'locale-switch' ? 'locale-switch' : 'navigation');

const KangurRouteTransitionStateContext =
  createContext<KangurRouteTransitionStateContextValue | null>(null);
const KangurRouteTransitionActionsContext =
  createContext<KangurRouteTransitionActionsContextValue | null>(null);

const normalizeTransitionHref = (href: string | null | undefined): string | null => {
  if (typeof href !== 'string') {
    return null;
  }

  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur-route-transition',
      action: 'normalize-href',
      description: 'Normalize the route transition href.',
      context: {
        href: trimmed,
      },
    },
    () => {
      const parsed = new URL(trimmed, 'https://kangur.local');
      const normalizedPathname = parsed.pathname.replace(/\/+$/, '') || '/';
      return `${normalizedPathname}${parsed.search}${parsed.hash}`;
    },
    { fallback: trimmed.replace(/\/+$/, '') || '/' }
  );
};

export function KangurRouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { basePath, pageKey, requestedHref, requestedPath } = useKangurRouting();
  const currentRequestedHref = normalizeTransitionHref(requestedHref ?? requestedPath);
  const [transitionState, setTransitionState] = useState<KangurRouteTransitionState | null>(null);
  const transitionStateRef = useRef<KangurRouteTransitionState | null>(null);
  const previousRequestedHrefRef = useRef<string | null>(currentRequestedHref);
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
    const previousRequestedHref = previousRequestedHrefRef.current;
    let animationFrameId: number | null = null;
    let remainingFrameCount = ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT;

    const commitTransition = (): void => {
      clearAcknowledgementTimeout();

      const currentTransitionKind =
        transitionStateRef.current?.kind ?? transitionState?.kind ?? null;
      const shouldResetScrollPosition =
        shouldResetScrollOnCommitRef.current && currentTransitionKind !== 'locale-switch';

      if (shouldResetScrollPosition && typeof window !== 'undefined') {
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
              committedRequestedHref: currentRequestedHref,
              phase: 'waiting_for_ready',
            }
          : null
      );
    };

    if (
      (transitionState?.phase === 'acknowledging' || transitionState?.phase === 'pending') &&
      previousRequestedHref !== null &&
      currentRequestedHref !== previousRequestedHref
    ) {
      commitTransition();
    }

    previousRequestedHrefRef.current = currentRequestedHref;

    return () => {
      if (animationFrameId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [clearAcknowledgementTimeout, currentRequestedHref, transitionState, updateTransitionState]);

  useEffect(() => {
    if (
      (transitionState?.phase !== 'pending' && transitionState?.phase !== 'waiting_for_ready') ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const timeoutMs =
      transitionState.phase === 'waiting_for_ready' &&
      transitionState.kind === 'locale-switch'
        ? LOCALE_SWITCH_ROUTE_TRANSITION_READY_TIMEOUT_MS
        : ROUTE_TRANSITION_TIMEOUT_MS;

    const timeoutId = window.setTimeout(() => {
      shouldResetScrollOnCommitRef.current = false;

      if (transitionState.phase === 'waiting_for_ready') {
        updateTransitionState((currentState) =>
          currentState?.phase === 'waiting_for_ready'
            ? {
                ...currentState,
                phase: 'revealing',
              }
            : currentState
        );
        return;
      }

      setNextTransitionState(null);
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [setNextTransitionState, transitionState, updateTransitionState]);

  useEffect(() => {
    if (transitionState?.phase !== 'revealing' || typeof window === 'undefined') {
      return;
    }

    const revealMs =
      transitionState.kind === 'locale-switch'
        ? LOCALE_SWITCH_ROUTE_TRANSITION_REVEAL_MS
        : ROUTE_TRANSITION_REVEAL_MS;

    const timeoutId = window.setTimeout(() => {
      updateTransitionState((currentState) =>
        currentState?.phase === 'revealing' ? null : currentState
      );
    }, revealMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [transitionState, updateTransitionState]);

  const startRouteTransition = useCallback(
    (input: KangurRouteTransitionStartInput = {}): KangurRouteTransitionStartResult => {
      const normalizedHref = normalizeTransitionHref(input.href);
      const normalizedRequestedHref = normalizeTransitionHref(currentRequestedHref);
      const nextPageKey = input.pageKey?.trim() || null;
      const nextSourceId = input.sourceId?.trim() || null;
      const nextTransitionKind = normalizeTransitionKind(input.transitionKind);
      const activeTransition = transitionStateRef.current;
      const requestedAcknowledgeMs = Number.isFinite(input.acknowledgeMs)
        ? Math.max(
            0,
            Math.min(Math.round(input.acknowledgeMs ?? 0), ROUTE_TRANSITION_MAX_ACKNOWLEDGE_MS)
          )
        : 0;

      if (
        (normalizedHref && normalizedRequestedHref && normalizedHref === normalizedRequestedHref) ||
        (!normalizedHref && nextPageKey !== null && nextPageKey === pageKey)
      ) {
        return {
          started: false,
          acknowledgeMs: 0,
        };
      }

      const canSupersedeLocaleSwitch =
        activeTransition?.kind === 'locale-switch' &&
        nextTransitionKind === 'locale-switch' &&
        activeTransition.href !== normalizedHref;
      const canSupersedeNavigation =
        activeTransition?.kind === 'navigation' &&
        nextTransitionKind === 'navigation' &&
        (activeTransition.href !== normalizedHref || activeTransition.pageKey !== nextPageKey);

      if (
        activeTransition &&
        activeTransition.phase !== 'revealing' &&
        !canSupersedeLocaleSwitch &&
        !canSupersedeNavigation
      ) {
        return {
          started: false,
          acknowledgeMs: 0,
        };
      }

      shouldResetScrollOnCommitRef.current =
        nextTransitionKind !== 'locale-switch' && nextPageKey !== pageKey;
      clearAcknowledgementTimeout();

      const nextState: KangurRouteTransitionState = {
        href: normalizedHref,
        pageKey: nextPageKey,
        sourceId: nextSourceId,
        kind: nextTransitionKind,
        skeletonVariant:
          input.skeletonVariant ??
          resolveKangurRouteTransitionSkeletonVariant({
            basePath,
            href: normalizedHref,
            pageKey: nextPageKey,
          }),
        committedRequestedHref: null,
        startedAt: Date.now(),
        phase: requestedAcknowledgeMs > 0 ? 'acknowledging' : 'pending',
      };

      setNextTransitionState(nextState);

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
    [basePath, clearAcknowledgementTimeout, currentRequestedHref, pageKey, updateTransitionState]
  );

  const markRouteTransitionReady = useCallback(
    (input: KangurRouteTransitionReadyInput = {}): void => {
      const expectedPageKey = input.pageKey?.trim() || null;
      const expectedRequestedHref = normalizeTransitionHref(input.requestedHref ?? currentRequestedHref);

      updateTransitionState((currentState) => {
        if (currentState?.phase !== 'waiting_for_ready') {
          return currentState;
        }

        if (currentState.pageKey && expectedPageKey && currentState.pageKey !== expectedPageKey) {
          return currentState;
        }

        const committedRequestedHref =
          normalizeTransitionHref(currentState.committedRequestedHref) ??
          normalizeTransitionHref(currentState.href);
        if (
          committedRequestedHref &&
          expectedRequestedHref &&
          committedRequestedHref !== expectedRequestedHref
        ) {
          return currentState;
        }

        return {
          ...currentState,
          phase: 'revealing',
        };
      });
    },
    [currentRequestedHref, updateTransitionState]
  );

  const stateValue = useMemo<KangurRouteTransitionStateContextValue>(
    () => ({
      isRouteAcknowledging: transitionState?.phase === 'acknowledging',
      isRoutePending: transitionState?.phase === 'pending',
      isRouteWaitingForReady: transitionState?.phase === 'waiting_for_ready',
      isRouteRevealing: transitionState?.phase === 'revealing',
      transitionPhase: transitionState?.phase ?? 'idle',
      activeTransitionSourceId: transitionState?.sourceId ?? null,
      activeTransitionKind: transitionState?.kind ?? null,
      activeTransitionPageKey: transitionState?.pageKey ?? null,
      activeTransitionRequestedHref:
        transitionState?.committedRequestedHref ?? transitionState?.href ?? null,
      activeTransitionSkeletonVariant: transitionState?.skeletonVariant ?? null,
      pendingPageKey: transitionState?.phase === 'pending' ? transitionState.pageKey ?? null : null,
    }),
    [transitionState]
  );
  const actionsValue = useMemo<KangurRouteTransitionActionsContextValue>(
    () => ({
      startRouteTransition,
      markRouteTransitionReady,
    }),
    [markRouteTransitionReady, startRouteTransition]
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
