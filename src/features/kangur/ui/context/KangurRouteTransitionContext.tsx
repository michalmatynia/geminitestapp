'use client';

import {
  createContext,
  useContext,
  useMemo,
} from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

import { useKangurRouting } from './KangurRoutingContext';
import {
  type KangurRouteTransitionSkeletonVariant,
} from '../routing/route-transition-skeletons';
import {
  useKangurRouteTransitionLogic,
  normalizeTransitionHref,
  type KangurRouteTransitionKind,
  type KangurRouteTransitionStartInput,
  type KangurRouteTransitionReadyInput,
  type KangurRouteTransitionStartResult,
} from './hooks/useKangurRouteTransitionLogic';

type KangurRouteTransitionContextValue = {
  isRouteAcknowledging: boolean;
  isRoutePending: boolean;
  isRouteWaitingForReady: boolean;
  isRouteRevealing: boolean;
  transitionPhase: 'idle' | 'acknowledging' | 'pending' | 'waiting_for_ready' | 'revealing';
  activeTransitionSourceId: string | null;
  activeTransitionKind: KangurRouteTransitionKind | null;
  activeTransitionPageKey: string | null;
  activeTransitionRequestedHref: string | null;
  activeTransitionSkeletonVariant: KangurRouteTransitionSkeletonVariant | null;
  pendingPageKey: string | null;
  startRouteTransition: (input?: KangurRouteTransitionStartInput) => KangurRouteTransitionStartResult;
  markRouteTransitionReady: (input?: KangurRouteTransitionReadyInput) => void;
};

export type { KangurRouteTransitionKind };

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

const KangurRouteTransitionStateContext =
  createContext<KangurRouteTransitionStateContextValue | null>(null);
const KangurRouteTransitionActionsContext =
  createContext<KangurRouteTransitionActionsContextValue | null>(null);

export function KangurRouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { basePath, pageKey, requestedHref, requestedPath } = useKangurRouting();
  const currentRequestedHref = normalizeTransitionHref(requestedHref ?? requestedPath);

  const {
    transitionState,
    startRouteTransition,
    markRouteTransitionReady,
  } = useKangurRouteTransitionLogic({
    basePath,
    pageKey: pageKey ?? null,
    currentRequestedHref,
  });

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
      activeTransitionRequestedHref: transitionState
        ? transitionState.committedRequestedHref ?? transitionState.href
        : null,
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
