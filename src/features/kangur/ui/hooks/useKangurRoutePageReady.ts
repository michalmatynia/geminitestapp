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

type KangurRouteReadyTransitionState = {
  transitionPhase: string;
  activeTransitionKind?: string | null;
  activeTransitionPageKey?: string | null;
  activeTransitionRequestedHref?: string | null;
};

type KangurRouteReadyTransitionActions = {
  markRouteTransitionReady: (input: { pageKey: string; requestedHref?: string }) => void;
};

type KangurRouteReadyContext = {
  routeTransitionActions: KangurRouteReadyTransitionActions;
  routeTransitionState: KangurRouteReadyTransitionState;
};

const shouldFastTrackKangurLocaleSwitchReady = (
  routeTransitionState?: KangurRouteReadyTransitionState | null
): boolean =>
  routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
  routeTransitionState.activeTransitionKind === 'locale-switch';

const resolveKangurRouteReadyContext = ({
  pageKey,
  ready,
  shouldFastTrackLocaleSwitchReady,
  routeTransitionActions,
  routeTransitionState,
}: {
  pageKey: string;
  ready: boolean;
  shouldFastTrackLocaleSwitchReady: boolean;
  routeTransitionActions?: KangurRouteReadyTransitionActions | null;
  routeTransitionState?: KangurRouteReadyTransitionState | null;
}): KangurRouteReadyContext | null => {
  if ((!ready && !shouldFastTrackLocaleSwitchReady) || !routeTransitionActions || !routeTransitionState) {
    return null;
  }
  if (routeTransitionState.transitionPhase !== 'waiting_for_ready') {
    return null;
  }
  if (
    routeTransitionState.activeTransitionPageKey &&
    routeTransitionState.activeTransitionPageKey !== pageKey
  ) {
    return null;
  }
  return {
    routeTransitionActions,
    routeTransitionState,
  };
};

const resolveKangurRouteReadyTransitionKey = ({
  pageKey,
  requestedHref,
  requestedPath,
  routeTransitionState,
}: {
  pageKey: string;
  requestedHref?: string | null;
  requestedPath?: string | null;
  routeTransitionState: KangurRouteReadyTransitionState;
}): string =>
  [
    routeTransitionState.activeTransitionRequestedHref ?? requestedHref ?? requestedPath ?? 'none',
    routeTransitionState.activeTransitionPageKey ?? pageKey,
  ].join('::');

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
  const shouldFastTrackLocaleSwitchReady = shouldFastTrackKangurLocaleSwitchReady(
    routeTransitionState
  );

  useEffect(() => {
    const readyContext = resolveKangurRouteReadyContext({
      pageKey,
      ready,
      shouldFastTrackLocaleSwitchReady,
      routeTransitionActions,
      routeTransitionState,
    });
    if (!readyContext) {
      return;
    }

    const transitionKey = resolveKangurRouteReadyTransitionKey({
      pageKey,
      requestedHref,
      requestedPath,
      routeTransitionState: readyContext.routeTransitionState,
    });
    if (reportedTransitionRef.current === transitionKey) {
      return;
    }

    readyContext.routeTransitionActions.markRouteTransitionReady({
      pageKey,
      requestedHref: requestedHref ?? requestedPath,
    });
    reportedTransitionRef.current = transitionKey;
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
