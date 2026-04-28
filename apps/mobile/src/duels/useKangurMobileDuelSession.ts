import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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

function getLearnerId(user: any): string {
  return user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest';
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

  const playerQuery = useQuery<KangurDuelStateResponse, Error>({
    enabled: hasSessionId && isAuthenticated && !isSpectating,
    queryKey: playerKey,
    queryFn: async (): Promise<KangurDuelStateResponse> => apiClient.getDuelState(normalizedSessionId, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const spectatorQuery = useQuery<KangurDuelSpectatorStateResponse, Error>({
    enabled: hasSessionId && isSpectating,
    queryKey: spectatorKey,
    queryFn: async (): Promise<KangurDuelSpectatorStateResponse> => apiClient.getDuelSpectatorState(normalizedSessionId, { spectatorId }, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const duelSession = isSpectating ? spectatorQuery.data?.session ?? null : playerQuery.data?.session ?? null;
  const player = isSpectating ? null : playerQuery.data?.player ?? null;
  const currentQuestion = resolveCurrentQuestion(duelSession, isSpectating, player);

  useEffect(() => {
    const isInactive = !hasSessionId || !isAuthenticated || duelSession === null || duelSession.status === 'completed' || duelSession.status === 'aborted';
    if (isSpectating || isInactive) return undefined;

    const intervalId = safeSetInterval(() => {
      void apiClient.heartbeatDuel({ clientTimestamp: new Date().toISOString(), sessionId: normalizedSessionId }, { cache: 'no-store' })
        .then((resp) => { queryClient.setQueryData(playerKey, resp); }).catch(() => {});
    }, MOBILE_DUEL_HEARTBEAT_MS);
    return () => { safeClearInterval(intervalId); };
  }, [apiClient, duelSession, hasSessionId, isAuthenticated, isSpectating, normalizedSessionId, playerKey, queryClient]);

  const actions = useDuelActions({
    apiClient, copy, queryClient, playerKey, spectatorKey, isSpectating, normalizedSessionId, currentQuestion, setIsMutating, setActionError
  });

  return {
    actionError,
    currentQuestion,
    error: toSessionErrorMessage(isSpectating ? spectatorQuery.error : playerQuery.error, copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' }), copy),
    isAuthenticated,
    isLoading: isSpectating ? spectatorQuery.isLoading : (isLoadingAuth && !isAuthenticated) || playerQuery.isLoading,
    isMutating,
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    isSpectating,
    leaveSession: actions.leaveSession,
    player,
    refresh: async (): Promise<void> => {
      if (isSpectating) await spectatorQuery.refetch(); else await playerQuery.refetch();
    },
    sendReaction: actions.sendReaction,
    session: duelSession,
    spectatorCount: duelSession?.spectatorCount ?? 0,
    submitAnswer: actions.submitAnswer,
  };
};
