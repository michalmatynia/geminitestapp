'use client';

import { useEffect, useRef } from 'react';

import {
  useOptionalKangurRouteTransitionActions,
  useOptionalKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

type UseKangurRoutePageReadyInput = {
  pageKey: string;
  ready: boolean;
};

export const useKangurRoutePageReady = ({
  pageKey,
  ready,
}: UseKangurRoutePageReadyInput): void => {
  const routing = useOptionalKangurRouting();
  const requestedHref = routing?.requestedHref;
  const requestedPath = routing?.requestedPath;
  const routeTransitionActions = useOptionalKangurRouteTransitionActions();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const reportedTransitionRef = useRef<string | null>(null);
  const shouldFastTrackLocaleSwitchReady =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionKind === 'locale-switch';

  useEffect(() => {
    if ((!ready && !shouldFastTrackLocaleSwitchReady) || !routeTransitionActions || !routeTransitionState) {
      return;
    }

    if (routeTransitionState.transitionPhase !== 'waiting_for_ready') {
      return;
    }

    if (
      routeTransitionState.activeTransitionPageKey &&
      routeTransitionState.activeTransitionPageKey !== pageKey
    ) {
      return;
    }

    const transitionKey = [
      routeTransitionState.activeTransitionRequestedHref ?? requestedHref ?? requestedPath ?? 'none',
      routeTransitionState.activeTransitionPageKey ?? pageKey,
    ].join('::');
    if (reportedTransitionRef.current === transitionKey) {
      return;
    }

    const markReady = (): void => {
      routeTransitionActions.markRouteTransitionReady({
        pageKey,
        requestedHref: requestedHref ?? requestedPath,
      });
      reportedTransitionRef.current = transitionKey;
    };

    markReady();
  }, [
    pageKey,
    ready,
    requestedHref,
    requestedPath,
    routeTransitionActions,
    routeTransitionState,
    shouldFastTrackLocaleSwitchReady,
  ]);

  useEffect(() => {
    if (routeTransitionState?.transitionPhase === 'idle') {
      reportedTransitionRef.current = null;
    }
  }, [routeTransitionState?.transitionPhase]);
};
