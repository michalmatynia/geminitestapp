import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import {
  resolveKangurRouteTransitionSkeletonVariant,
  type KangurRouteTransitionSkeletonVariant,
} from '../../routing/route-transition-skeletons';
import { resolveAccessibleManagedKangurPageKeyFromHref } from '../../routing/managed-paths';
import {
  clearKangurPendingRouteLoadingSnapshot,
  setKangurPendingRouteLoadingSnapshot,
} from '../../routing/pending-route-loading-snapshot';
import { readKangurTopBarHeightCssValue } from '../../utils/readKangurTopBarHeightCssValue';

type KangurRouteTransitionPhase =
  | 'acknowledging'
  | 'pending'
  | 'waiting_for_ready'
  | 'revealing';

export type KangurRouteTransitionKind = 'navigation' | 'locale-switch';

export type KangurRouteTransitionState = {
  href: string | null;
  pageKey: string | null;
  sourceId: string | null;
  kind: KangurRouteTransitionKind;
  performanceKey: string;
  skeletonVariant: KangurRouteTransitionSkeletonVariant;
  committedRequestedHref: string | null;
  startedAt: number;
  phase: KangurRouteTransitionPhase;
};

export type KangurRouteTransitionStartInput = {
  href?: string | null;
  pageKey?: string | null;
  sourceId?: string | null;
  acknowledgeMs?: number;
  skeletonVariant?: KangurRouteTransitionSkeletonVariant | null;
  transitionKind?: KangurRouteTransitionKind | null;
};

export type KangurRouteTransitionReadyInput = {
  pageKey?: string | null;
  requestedHref?: string | null;
};

export type KangurRouteTransitionStartResult = {
  started: boolean;
  acknowledgeMs: number;
};

const ROUTE_TRANSITION_MAX_ACKNOWLEDGE_MS = 400;
const PENDING_ROUTE_TRANSITION_TIMEOUT_MS = 10_000;
const ROUTE_TRANSITION_READY_TIMEOUT_MS = 2_000;
const LOCALE_SWITCH_ROUTE_TRANSITION_READY_TIMEOUT_MS = 1_200;
const ROUTE_TRANSITION_REVEAL_MS = 0;
const LOCALE_SWITCH_ROUTE_TRANSITION_REVEAL_MS = 0;
const ROUTE_TRANSITION_SCROLL_RESET_FRAME_COUNT = 2;
const KANGUR_ROUTE_TRANSITION_PERFORMANCE_PREFIX = 'kangur:route-transition';

const normalizeTransitionKind = (
  value: KangurRouteTransitionKind | null | undefined
): KangurRouteTransitionKind => (value === 'locale-switch' ? 'locale-switch' : 'navigation');

const buildKangurRouteTransitionPerformanceKey = (state: {
  href: string | null;
  kind: KangurRouteTransitionKind;
  pageKey: string | null;
  startedAt: number;
}): string => [state.startedAt, state.kind, state.pageKey ?? 'none', state.href ?? 'none'].join('::');

const buildKangurRouteTransitionPerformanceMarkName = (
  performanceKey: string,
  phase: 'start' | 'commit' | 'ready' | 'complete'
): string => `${KANGUR_ROUTE_TRANSITION_PERFORMANCE_PREFIX}:${phase}:${performanceKey}`;

const markKangurRouteTransitionPerformance = (
  performanceKey: string,
  phase: 'start' | 'commit' | 'ready' | 'complete',
  detail: Record<string, unknown>
): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.performance === 'undefined' ||
    typeof window.performance.mark !== 'function'
  ) {
    return;
  }

  const markName = buildKangurRouteTransitionPerformanceMarkName(performanceKey, phase);
  try {
    window.performance.mark(markName, { detail });
  } catch {
    try {
      window.performance.mark(markName);
    } catch {
      // Ignore instrumentation failures.
    }
  }
};

const measureKangurRouteTransitionPerformance = (
  performanceKey: string,
  phase: 'commit' | 'ready' | 'complete',
  detail: Record<string, unknown>
): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.performance === 'undefined' ||
    typeof window.performance.measure !== 'function'
  ) {
    return;
  }

  const startMark = buildKangurRouteTransitionPerformanceMarkName(performanceKey, 'start');
  const endMark = buildKangurRouteTransitionPerformanceMarkName(performanceKey, phase);
  const measureName = `${KANGUR_ROUTE_TRANSITION_PERFORMANCE_PREFIX}:${phase}`;

  try {
    window.performance.measure(measureName, {
      start: startMark,
      end: endMark,
      detail,
    });
  } catch {
    try {
      window.performance.measure(measureName, startMark, endMark);
    } catch {
      // Ignore instrumentation failures.
    }
  }
};

const clearKangurRouteTransitionPerformanceMarks = (performanceKey: string): void => {
  if (
    typeof window === 'undefined' ||
    typeof window.performance === 'undefined' ||
    typeof window.performance.clearMarks !== 'function'
  ) {
    return;
  }

  for (const phase of ['start', 'commit', 'ready', 'complete'] as const) {
    window.performance.clearMarks(
      buildKangurRouteTransitionPerformanceMarkName(performanceKey, phase)
    );
  }
};

const recordKangurRouteTransitionPerformancePhase = (
  state: Pick<
    KangurRouteTransitionState,
    'href' | 'kind' | 'pageKey' | 'performanceKey' | 'startedAt'
  >,
  phase: 'start' | 'commit' | 'ready' | 'complete'
): void => {
  const detail = {
    href: state.href,
    kind: state.kind,
    pageKey: state.pageKey,
    startedAt: state.startedAt,
  };

  markKangurRouteTransitionPerformance(state.performanceKey, phase, detail);
  if (phase !== 'start') {
    measureKangurRouteTransitionPerformance(state.performanceKey, phase, detail);
  }
  if (phase === 'complete') {
    clearKangurRouteTransitionPerformanceMarks(state.performanceKey);
  }
};

export const normalizeTransitionHref = (href: string | null | undefined): string | null => {
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

export function useKangurRouteTransitionLogic({
  basePath,
  pageKey,
  currentRequestedHref,
}: {
  basePath: string;
  pageKey: string | null;
  currentRequestedHref: string | null;
}) {
  const { data: session } = useOptionalNextAuthSession();
  const [transitionState, setTransitionState] = useState<KangurRouteTransitionState | null>(null);
  const transitionStateRef = useRef<KangurRouteTransitionState | null>(null);
  const previousRequestedHrefRef = useRef<string | null>(currentRequestedHref);
  const shouldResetScrollOnCommitRef = useRef(false);
  const acknowledgementTimeoutRef = useRef<number | null>(null);
  const currentAccessiblePageKey = pageKey ?? 'Game';

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
    if (!transitionState) {
      clearKangurPendingRouteLoadingSnapshot();
    }
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
      const currentTransition = transitionStateRef.current;

      const currentTransitionKind =
        currentTransition?.kind ?? transitionState?.kind ?? null;
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
      if (currentTransition) {
        recordKangurRouteTransitionPerformancePhase(currentTransition, 'commit');
      }
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
      transitionState.phase === 'pending'
        ? PENDING_ROUTE_TRANSITION_TIMEOUT_MS
        : transitionState.phase === 'waiting_for_ready' &&
            transitionState.kind === 'locale-switch'
          ? LOCALE_SWITCH_ROUTE_TRANSITION_READY_TIMEOUT_MS
          : ROUTE_TRANSITION_READY_TIMEOUT_MS;

    const timeoutId = window.setTimeout(() => {
      shouldResetScrollOnCommitRef.current = false;

      if (transitionState.phase === 'waiting_for_ready') {
        recordKangurRouteTransitionPerformancePhase(transitionState, 'ready');
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
      if (transitionState.phase === 'revealing') {
        recordKangurRouteTransitionPerformancePhase(transitionState, 'complete');
      }
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
      const nextPageKey =
        resolveAccessibleKangurPageKey(
          input.pageKey?.trim() || null,
          session,
          normalizedHref
            ? resolveAccessibleManagedKangurPageKeyFromHref({
                href: normalizedHref,
                basePath,
                session,
                fallbackPageKey: currentAccessiblePageKey,
              })
            : currentAccessiblePageKey
        ) || null;
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
        (!normalizedHref && nextPageKey !== null && nextPageKey === currentAccessiblePageKey)
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
        nextTransitionKind !== 'locale-switch' && nextPageKey !== currentAccessiblePageKey;
      clearAcknowledgementTimeout();
      const startedAt = Date.now();

      const nextState: KangurRouteTransitionState = {
        href: normalizedHref,
        pageKey: nextPageKey,
        sourceId: nextSourceId,
        kind: nextTransitionKind,
        performanceKey: '',
        skeletonVariant:
          input.skeletonVariant ??
          resolveKangurRouteTransitionSkeletonVariant({
            basePath,
            fallbackPageKey: currentAccessiblePageKey,
            href: normalizedHref,
            pageKey: nextPageKey,
            session,
          }),
        committedRequestedHref: null,
        startedAt,
        phase: requestedAcknowledgeMs > 0 ? 'acknowledging' : 'pending',
      };
      nextState.performanceKey = buildKangurRouteTransitionPerformanceKey(nextState);

      setKangurPendingRouteLoadingSnapshot({
        fromHref: currentRequestedHref,
        href: normalizedHref,
        pageKey: nextPageKey,
        skeletonVariant: nextState.skeletonVariant,
        startedAt: nextState.startedAt,
        topBarHeightCssValue: readKangurTopBarHeightCssValue(),
      });
      setNextTransitionState(nextState);
      recordKangurRouteTransitionPerformancePhase(nextState, 'start');

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
    [
      basePath,
      clearAcknowledgementTimeout,
      currentAccessiblePageKey,
      currentRequestedHref,
      session,
      updateTransitionState,
    ]
  );

  const markRouteTransitionReady = useCallback(
    (input: KangurRouteTransitionReadyInput = {}): void => {
      const expectedPageKey = input.pageKey?.trim() || null;
      const expectedRequestedHref = normalizeTransitionHref(input.requestedHref ?? currentRequestedHref);
      const activeTransition = transitionStateRef.current;
      if (activeTransition?.phase !== 'waiting_for_ready') {
        return;
      }

      if (activeTransition.pageKey && expectedPageKey && activeTransition.pageKey !== expectedPageKey) {
        return;
      }

      const committedRequestedHref =
        normalizeTransitionHref(activeTransition.committedRequestedHref) ??
        normalizeTransitionHref(activeTransition.href);
      if (
        committedRequestedHref &&
        expectedRequestedHref &&
        committedRequestedHref !== expectedRequestedHref
      ) {
        return;
      }

      recordKangurRouteTransitionPerformancePhase(activeTransition, 'ready');
      updateTransitionState((currentState) =>
        currentState?.phase === 'waiting_for_ready'
          ? {
              ...currentState,
              phase: 'revealing',
            }
          : currentState
      );
    },
    [currentRequestedHref, updateTransitionState]
  );

  return {
    transitionState,
    startRouteTransition,
    markRouteTransitionReady,
  };
}
