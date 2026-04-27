import type {
  KangurDuelChoice,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReactionType,
  KangurDuelSpectatorStateResponse,
  KangurDuelSession,
  KangurDuelStateResponse,
} from '@kangur/contracts/kangur-duels';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  createMobileDuelSpectatorId,
  resolveCurrentQuestion,
} from './useKangurMobileDuelSession.helpers';
import { toSessionErrorMessage } from './useKangurMobileDuelSession.errors';
import type { DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

const MOBILE_DUEL_SESSION_POLL_MS = 4_000;
const MOBILE_DUEL_HEARTBEAT_MS = 15_000;

type UseKangurMobileDuelSessionOptions = {
  spectate?: boolean;
};

export type UseKangurMobileDuelSessionResult = {
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
};

function useDuelSessionData(options: {
  hasSessionId: boolean;
  isAuthenticated: boolean;
  isSpectating: boolean;
  normalizedSessionId: string;
  apiClient: DuelApiClient;
  playerQueryKey: readonly unknown[];
  spectatorQueryKey: readonly unknown[];
  spectatorId: string;
}): {
  playerQuery: UseQueryResult<KangurDuelStateResponse>;
  spectatorQuery: UseQueryResult<KangurDuelSpectatorStateResponse>;
} {
  const { hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, apiClient, playerQueryKey, spectatorQueryKey, spectatorId } = options;

  const playerQuery = useQuery<KangurDuelStateResponse>({
    enabled: hasSessionId && isAuthenticated && !isSpectating,
    queryKey: playerQueryKey,
    queryFn: async (): Promise<KangurDuelStateResponse> =>
      apiClient.getDuelState(normalizedSessionId, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const spectatorQuery = useQuery<KangurDuelSpectatorStateResponse>({
    enabled: hasSessionId && isSpectating,
    queryKey: spectatorQueryKey,
    queryFn: async (): Promise<KangurDuelSpectatorStateResponse> =>
      apiClient.getDuelSpectatorState(normalizedSessionId, { spectatorId }, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  return { playerQuery, spectatorQuery };
}

function resolveSessionError(
  playerQuery: UseQueryResult<KangurDuelStateResponse>, 
  spectatorQuery: UseQueryResult<KangurDuelSpectatorStateResponse>, 
  isSpectating: boolean, 
  copy: any
): string | null {
  return toSessionErrorMessage(
    isSpectating ? spectatorQuery.error : playerQuery.error,
    isSpectating ? copy({ de: 'Das öffentliche Duell konnte nicht geladen werden.', en: 'Could not load the public duel.', pl: 'Nie udało się pobrać publicznego pojedynku.' })
                 : copy({ de: 'Der Duellstatus konnte nicht geladen werden.', en: 'Could not load the duel state.', pl: 'Nie udało się pobrać stanu pojedynku.' }),
    copy
  );
}

function useDuelHeartbeat(options: {
  apiClient: DuelApiClient;
  duelSession: KangurDuelSession | null;
  hasSessionId: boolean;
  isAuthenticated: boolean;
  isSpectating: boolean;
  normalizedSessionId: string;
  playerQueryKey: readonly unknown[];
  queryClient: any;
}): void {
  const { apiClient, duelSession, hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, playerQueryKey, queryClient } = options;

  useEffect(() => {
    if (isSpectating || !hasSessionId || !isAuthenticated || duelSession === null || duelSession.status === 'completed' || duelSession.status === 'aborted') {
      return;
    }

    const intervalId = setInterval(() => {
      void apiClient.heartbeatDuel(
        { clientTimestamp: new Date().toISOString(), sessionId: normalizedSessionId },
        { cache: 'no-store' }
      )
      .then((resp: KangurDuelStateResponse) => {
        queryClient.setQueryData<KangurDuelStateResponse>(playerQueryKey, resp);
      })
      .catch(() => {});
    }, MOBILE_DUEL_HEARTBEAT_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [apiClient, duelSession, hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, playerQueryKey, queryClient]);
}

export const useKangurMobileDuelSession = (
  sessionId: string | null,
  options: UseKangurMobileDuelSessionOptions = {},
): UseKangurMobileDuelSessionResult => {
  const { copy } = useKangurMobileI18n();
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
  const apiClient = rawApiClient as unknown as DuelApiClient;
  const { isLoadingAuth, session: authSession } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [spectatorId] = useState(createMobileDuelSpectatorId);
  const learnerIdentity = authSession.user?.activeLearner?.id ?? authSession.user?.email ?? authSession.user?.id ?? 'guest';
  const isAuthenticated = authSession.status === 'authenticated';
  const isSpectating = options.spectate === true;
  const normalizedSessionId = sessionId?.trim() ?? '';
  const hasSessionId = normalizedSessionId.length > 0;
  
  const playerKey = ['kangur-mobile', 'duels', 'session', apiBaseUrl, learnerIdentity, normalizedSessionId] as const;
  const spectatorKey = ['kangur-mobile', 'duels', 'spectator-session', apiBaseUrl, normalizedSessionId, spectatorId] as const;
  
  const { playerQuery, spectatorQuery } = useDuelSessionData({ 
    hasSessionId, 
    isAuthenticated, 
    isSpectating, 
    normalizedSessionId, 
    apiClient, 
    playerQueryKey: playerKey, 
    spectatorQueryKey: spectatorKey, 
    spectatorId 
  });
  
  const pData = playerQuery.data;
  const sData = spectatorQuery.data;
  const duelSession = isSpectating ? sData?.session ?? null : pData?.session ?? null;
  const player = isSpectating ? null : pData?.player ?? null;
  const currentQuestion = resolveCurrentQuestion(duelSession, isSpectating, player);

  useDuelHeartbeat({ 
    apiClient, 
    duelSession, 
    hasSessionId, 
    isAuthenticated, 
    isSpectating, 
    normalizedSessionId, 
    playerQueryKey: playerKey, 
    queryClient 
  });

  const runMutation = useCallback(async <TResult>(
    action: () => Promise<TResult>, 
    fallback: string
  ): Promise<TResult | null> => {
    setIsMutating(true);
    setActionError(null);
    try { 
      return await action(); 
    } catch (err: unknown) { 
      setActionError(toSessionErrorMessage(err, fallback, copy)); 
      return null; 
    } finally { 
      setIsMutating(false); 
    }
  }, [copy]);

  const leaveSession = async (): Promise<boolean> => {
    if (isSpectating) return false;
    const resp = await runMutation<KangurDuelStateResponse>(
      () => apiClient.leaveDuel({ reason: 'mobile_exit', sessionId: normalizedSessionId }, { cache: 'no-store' }),
      copy({ de: 'Das Duell konnte nicht verlassen werden.', en: 'Could not leave the duel.', pl: 'Nie udało się opuścić pojedynku.' })
    );
    if (resp === null) return false;
    queryClient.setQueryData<KangurDuelStateResponse>(playerKey, resp);
    return true;
  };

  const sendReaction = async (type: KangurDuelReactionType): Promise<void> => {
    const resp = await runMutation<KangurDuelStateResponse>(
      () => apiClient.reactToDuel({ sessionId: normalizedSessionId, type }, { cache: 'no-store' }),
      copy({ de: 'Die Reaktion konnte nicht gesendet werden.', en: 'Could not send the reaction.', pl: 'Nie udało się wysłać reakcji.' })
    );
    if (resp === null) return;
    const activeKey = isSpectating ? spectatorKey : playerKey;
    queryClient.setQueryData<KangurDuelStateResponse | KangurDuelSpectatorStateResponse>(activeKey, (cur) => {
      if (!cur || typeof cur !== 'object' || !('session' in cur)) return cur;
      const state = cur as { session: KangurDuelSession };
      return {
        ...cur,
        session: {
          ...state.session,
          recentReactions: [...(state.session.recentReactions ?? []), (resp as any).reaction].slice(-8),
        },
      };
    });
  };

  const submitAnswer = async (choice: KangurDuelChoice): Promise<void> => {
    if (isSpectating || currentQuestion === null) return;
    const resp = await runMutation<KangurDuelStateResponse>(
      () => apiClient.answerDuel({ choice, clientTimestamp: new Date().toISOString(), questionId: currentQuestion.id, sessionId: normalizedSessionId }, { cache: 'no-store' }),
      copy({ de: 'Die Antwort konnte nicht gesendet werden.', en: 'Could not send the answer.', pl: 'Nie udało się wysłać odpowiedzi.' })
    );
    if (resp !== null) queryClient.setQueryData<KangurDuelStateResponse>(playerKey, resp);
  };

  return {
    actionError,
    currentQuestion,
    error: resolveSessionError(playerQuery, spectatorQuery, isSpectating, copy),
    isAuthenticated,
    isLoading: isSpectating ? spectatorQuery.isLoading : (isLoadingAuth && !isAuthenticated) || playerQuery.isLoading,
    isMutating,
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    isSpectating,
    leaveSession,
    player,
    refresh: async (): Promise<void> => {
      if (isSpectating) await spectatorQuery.refetch();
      else await playerQuery.refetch();
    },
    sendReaction,
    session: duelSession,
    spectatorCount: duelSession?.spectatorCount ?? 0,
    submitAnswer,
  };
};

export {};
