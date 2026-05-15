import { useState, useEffect } from 'react';
import { useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import type {
  KangurDuelChoice,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReactionType,
  KangurDuelSession,
  KangurDuelStateResponse,
  KangurDuelSpectatorStateResponse,
  KangurDuelReaction,
} from '@kangur/contracts/kangur-duels';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createMobileDuelSpectatorId, resolveCurrentQuestion } from './useKangurMobileDuelSession.helpers';
import { toSessionErrorMessage } from './useKangurMobileDuelSession.errors';
import { type DuelApiClient } from './useKangurMobileDuelsLobbyQueries';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

const MOBILE_DUEL_SESSION_POLL_MS = 4_000;
const MOBILE_DUEL_HEARTBEAT_MS = 15_000;

export interface UseKangurMobileDuelSessionResult {
  actionError: string | null;
  currentQuestion: KangurDuelQuestion | null;
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMutating: boolean;
  isRestoringAuth: boolean;
  isSpectating: boolean;
  leaveSession: () => Promise<boolean>;
  player: KangurDuelPlayer | null;
  refresh: () => Promise<void>;
  sendReaction: (type: KangurDuelReactionType) => Promise<void>;
  session: KangurDuelSession | null;
  spectatorCount: number;
  submitAnswer: (choice: KangurDuelChoice) => Promise<void>;
}

interface DuelActions {
  leaveSession: () => Promise<boolean>;
  sendReaction: (type: KangurDuelReactionType) => Promise<void>;
  submitAnswer: (choice: KangurDuelChoice) => Promise<void>;
}

interface DuelActionsDeps {
  apiClient: DuelApiClient;
  copy: (v: Record<string, string>) => string;
  queryClient: QueryClient;
  playerKey: readonly unknown[];
  spectatorKey: readonly unknown[];
  isSpectating: boolean;
  normalizedSessionId: string;
  currentQuestion: KangurDuelQuestion | null;
  setIsMutating: (val: boolean) => void;
  setActionError: (val: string | null) => void;
}

function useDuelActions(deps: DuelActionsDeps): DuelActions {
  const { apiClient, copy, queryClient, playerKey, spectatorKey, isSpectating, normalizedSessionId, currentQuestion, setIsMutating, setActionError } = deps;

  const execute = async <T,>(action: () => Promise<T>, fallback: string): Promise<T | null> => {
    setIsMutating(true); setActionError(null);
    try { return await action(); } catch (err) { setActionError(toSessionErrorMessage(err, fallback, copy)); return null; }
    finally { setIsMutating(false); }
  };

  const leaveSession = async (): Promise<boolean> => {
    if (isSpectating) return false;
    const resp = await execute(() => apiClient.leaveDuel({ reason: 'mobile_exit', sessionId: normalizedSessionId }, { cache: 'no-store' }), copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' }));
    if (resp === null) return false;
    queryClient.setQueryData<KangurDuelStateResponse>(playerKey, resp);
    return true;
  };

  const sendReaction = async (type: KangurDuelReactionType): Promise<void> => {
    const resp = await execute<{ reaction: KangurDuelReaction }>(() => apiClient.reactToDuel({ sessionId: normalizedSessionId, type }, { cache: 'no-store' }), copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' }));
    if (resp === null) return;
    const activeKey = isSpectating ? spectatorKey : playerKey;
    queryClient.setQueryData<KangurDuelStateResponse | KangurDuelSpectatorStateResponse>(activeKey, (cur) => {
      if (!cur || typeof cur !== 'object' || !('session' in cur)) return cur;
      const state = cur as { session: KangurDuelSession };
      return {
        ...cur,
        session: {
          ...state.session,
          recentReactions: [...(state.session.recentReactions ?? []), resp.reaction].slice(-8),
        },
      };
    });
  };

  const submitAnswer = async (choice: KangurDuelChoice): Promise<void> => {
    if (isSpectating || currentQuestion === null) return;
    const resp = await execute(() => apiClient.answerDuel({ choice, clientTimestamp: new Date().toISOString(), questionId: currentQuestion.id, sessionId: normalizedSessionId }, { cache: 'no-store' }), copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' }));
    if (resp !== null) queryClient.setQueryData<KangurDuelStateResponse>(playerKey, resp);
  };

  return { leaveSession, sendReaction, submitAnswer };
}

function getLearnerId(user: { activeLearner?: { id: string }; email?: string; id?: string } | null): string {
  return user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest';
}

function useDuelQueries({
  apiClient,
  hasSessionId,
  isAuthenticated,
  isSpectating,
  normalizedSessionId,
  playerKey,
  spectatorKey,
  spectatorId,
}: {
  apiClient: DuelApiClient;
  hasSessionId: boolean;
  isAuthenticated: boolean;
  isSpectating: boolean;
  normalizedSessionId: string;
  playerKey: readonly unknown[];
  spectatorKey: readonly unknown[];
  spectatorId: string;
}): {
  playerQuery: UseQueryResult<KangurDuelStateResponse, Error>;
  spectatorQuery: UseQueryResult<KangurDuelSpectatorStateResponse, Error>;
} {
  const playerQuery = useKangurMobileQueryV2<KangurDuelStateResponse>({
    enabled: hasSessionId && isAuthenticated && !isSpectating,
    queryKey: playerKey,
    queryFn: async (): Promise<KangurDuelStateResponse> =>
      apiClient.getDuelState(normalizedSessionId, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
    meta: {
      source: 'kangur.mobile.duels.session.player',
      operation: 'detail',
      resource: 'kangur.mobile.duels.session.player',
      queryKey: playerKey,
      description: 'Loads Kangur mobile duel player session state.',
      tags: ['kangur-mobile', 'duels', 'session'],
    },
  });

  const spectatorQuery = useKangurMobileQueryV2<KangurDuelSpectatorStateResponse>({
    enabled: hasSessionId && isSpectating,
    queryKey: spectatorKey,
    queryFn: async (): Promise<KangurDuelSpectatorStateResponse> =>
      apiClient.getDuelSpectatorState(normalizedSessionId, { spectatorId }, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
    meta: {
      source: 'kangur.mobile.duels.session.spectator',
      operation: 'detail',
      resource: 'kangur.mobile.duels.session.spectator',
      queryKey: spectatorKey,
      description: 'Loads Kangur mobile duel spectator session state.',
      tags: ['kangur-mobile', 'duels', 'session'],
    },
  });

  return { playerQuery, spectatorQuery };
}

function useDuelHeartbeat({
  apiClient,
  duelSession,
  hasSessionId,
  isAuthenticated,
  isSpectating,
  normalizedSessionId,
  playerKey,
  queryClient,
}: {
  apiClient: DuelApiClient;
  duelSession: KangurDuelSession | null;
  hasSessionId: boolean;
  isAuthenticated: boolean;
  isSpectating: boolean;
  normalizedSessionId: string;
  playerKey: readonly unknown[];
  queryClient: QueryClient;
}): void {
  useEffect(() => {
    const isInactive =
      !hasSessionId ||
      !isAuthenticated ||
      duelSession === null ||
      duelSession.status === 'completed' ||
      duelSession.status === 'aborted';
    if (isSpectating || isInactive) return undefined;

    const intervalId = safeSetInterval(() => {
      void apiClient
        .heartbeatDuel(
          { clientTimestamp: new Date().toISOString(), sessionId: normalizedSessionId },
          { cache: 'no-store' },
        )
        .then((resp) => {
          queryClient.setQueryData(playerKey, resp);
        })
        .catch(() => {});
    }, MOBILE_DUEL_HEARTBEAT_MS);
    return () => {
      safeClearInterval(intervalId);
    };
  }, [
    apiClient,
    duelSession,
    hasSessionId,
    isAuthenticated,
    isSpectating,
    normalizedSessionId,
    playerKey,
    queryClient,
  ]);
}

type DuelStateResolution = {
  duelSession: KangurDuelSession | null;
  player: KangurDuelPlayer | null;
  isRestoringAuth: boolean;
  isLoading: boolean;
  spectatorCount: number;
};

function resolveSpectatorState(
  spectatorQuery: UseQueryResult<KangurDuelSpectatorStateResponse, Error>,
  isRestoringAuth: boolean,
): DuelStateResolution {
  const duelSession = spectatorQuery.data?.session ?? null;
  return {
    duelSession,
    player: null,
    isRestoringAuth,
    isLoading: spectatorQuery.isLoading,
    spectatorCount: duelSession?.spectatorCount ?? 0,
  };
}

function resolvePlayerState(
  playerQuery: UseQueryResult<KangurDuelStateResponse, Error>,
  isRestoringAuth: boolean,
): DuelStateResolution {
  const duelSession = playerQuery.data?.session ?? null;
  return {
    duelSession,
    player: playerQuery.data?.player ?? null,
    isRestoringAuth,
    isLoading: isRestoringAuth || playerQuery.isLoading,
    spectatorCount: duelSession?.spectatorCount ?? 0,
  };
}

function useDuelStateResolution({
  isSpectating,
  playerQuery,
  spectatorQuery,
  isLoadingAuth,
  isAuthenticated,
}: {
  isSpectating: boolean;
  playerQuery: UseQueryResult<KangurDuelStateResponse, Error>;
  spectatorQuery: UseQueryResult<KangurDuelSpectatorStateResponse, Error>;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
}): DuelStateResolution {
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;

  if (isSpectating) {
    return resolveSpectatorState(spectatorQuery, isRestoringAuth);
  }

  return resolvePlayerState(playerQuery, isRestoringAuth);
}

export const useKangurMobileDuelSession = (
  sessionId: string | null,
  options: { spectate?: boolean } = {},
): UseKangurMobileDuelSessionResult => {
  const { copy } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
  const apiClient = rawApiClient as DuelApiClient;
  const { isLoadingAuth, session: authSession } = useKangurMobileAuth();

  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [spectatorId] = useState(createMobileDuelSpectatorId);

  const learnerId = getLearnerId(authSession.user);
  const isAuthenticated = authSession.status === 'authenticated';
  const isSpectating = options.spectate === true;
  const normalizedSessionId = sessionId?.trim() ?? '';
  const hasSessionId = normalizedSessionId.length > 0;

  const playerKey = ['kangur-mobile', 'duels', 'session', apiBaseUrl, learnerId, normalizedSessionId] as const;
  const spectatorKey = ['kangur-mobile', 'duels', 'spectator-session', apiBaseUrl, normalizedSessionId, spectatorId] as const;

  const { playerQuery, spectatorQuery } = useDuelQueries({
    apiClient, hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, playerKey, spectatorKey, spectatorId
  });

  const { duelSession, player, isRestoringAuth, isLoading, spectatorCount } = useDuelStateResolution({
    isSpectating, playerQuery, spectatorQuery, isLoadingAuth, isAuthenticated
  });

  const currentQuestion = resolveCurrentQuestion(duelSession, isSpectating, player);

  useDuelHeartbeat({
    apiClient, duelSession, hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, playerKey, queryClient
  });

  const actions = useDuelActions({
    apiClient, copy, queryClient, playerKey, spectatorKey, isSpectating, normalizedSessionId, currentQuestion, setIsMutating, setActionError
  });

  const error = toSessionErrorMessage(isSpectating ? spectatorQuery.error : playerQuery.error, copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' }), copy);

  return {
    actionError,
    currentQuestion,
    error,
    isAuthenticated,
    isLoading,
    isMutating,
    isRestoringAuth,
    isSpectating,
    leaveSession: actions.leaveSession,
    player,
    refresh: async (): Promise<void> => {
      if (isSpectating) await spectatorQuery.refetch(); else await playerQuery.refetch();
    },
    sendReaction: actions.sendReaction,
    session: duelSession,
    spectatorCount,
    submitAnswer: actions.submitAnswer,
  };
};
