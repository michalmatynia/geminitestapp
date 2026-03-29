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

const resolveKangurRouteTransitionPhase = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): KangurRouteTransitionStateContextValue['transitionPhase'] =>
  transitionState?.phase ?? 'idle';

const resolveKangurRouteTransitionRequestedHref = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): string | null =>
  transitionState ? transitionState.committedRequestedHref ?? transitionState.href : null;

const resolveKangurRouteTransitionPendingPageKey = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): string | null =>
  transitionState?.phase === 'pending' ? transitionState.pageKey ?? null : null;

const resolveKangurRouteTransitionPhaseFlags = (
  transitionPhase: KangurRouteTransitionStateContextValue['transitionPhase']
): Pick<
  KangurRouteTransitionStateContextValue,
  | 'isRouteAcknowledging'
  | 'isRoutePending'
  | 'isRouteRevealing'
  | 'isRouteWaitingForReady'
> => ({
  isRouteAcknowledging: transitionPhase === 'acknowledging',
  isRoutePending: transitionPhase === 'pending',
  isRouteWaitingForReady: transitionPhase === 'waiting_for_ready',
  isRouteRevealing: transitionPhase === 'revealing',
});

const resolveKangurRouteTransitionIdentityMeta = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): Pick<
  KangurRouteTransitionStateContextValue,
  'activeTransitionKind' | 'activeTransitionSourceId'
> => ({
  activeTransitionSourceId: transitionState?.sourceId ?? null,
  activeTransitionKind: transitionState?.kind ?? null,
});

const resolveKangurRouteTransitionPageMeta = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): Pick<
  KangurRouteTransitionStateContextValue,
  'activeTransitionPageKey' | 'activeTransitionSkeletonVariant'
> => ({
  activeTransitionPageKey: transitionState?.pageKey ?? null,
  activeTransitionSkeletonVariant: transitionState?.skeletonVariant ?? null,
});

const resolveKangurRouteTransitionStateValue = (
  transitionState: ReturnType<typeof useKangurRouteTransitionLogic>['transitionState']
): KangurRouteTransitionStateContextValue => {
  const transitionPhase = resolveKangurRouteTransitionPhase(transitionState);
  const phaseFlags = resolveKangurRouteTransitionPhaseFlags(transitionPhase);
  const identityMeta = resolveKangurRouteTransitionIdentityMeta(transitionState);
  const pageMeta = resolveKangurRouteTransitionPageMeta(transitionState);

  return {
    ...phaseFlags,
    ...identityMeta,
    ...pageMeta,
    transitionPhase,
    activeTransitionRequestedHref:
      resolveKangurRouteTransitionRequestedHref(transitionState),
    pendingPageKey: resolveKangurRouteTransitionPendingPageKey(transitionState),
  };
};

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
    () => resolveKangurRouteTransitionStateValue(transitionState),
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
