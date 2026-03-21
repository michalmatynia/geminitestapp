import type {
  KangurDuelChoice,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReactionType,
  KangurDuelSpectatorStateResponse,
  KangurDuelSession,
  KangurDuelStateResponse,
} from '@kangur/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const MOBILE_DUEL_SESSION_POLL_MS = 4_000;
const MOBILE_DUEL_HEARTBEAT_MS = 15_000;

type UseKangurMobileDuelSessionOptions = {
  spectate?: boolean;
};

type UseKangurMobileDuelSessionResult = {
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

const createMobileDuelSpectatorId = (): string =>
  `mobile_spectator_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const toSessionErrorMessage = (error: unknown, fallback: string): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return 'Zaloguj sesję ucznia, aby otworzyć pojedynek.';
    }
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return 'Nie udało się połączyć z API Kangura.';
  }

  return message;
};

export const useKangurMobileDuelSession = (
  sessionId: string | null,
  options: UseKangurMobileDuelSessionOptions = {},
): UseKangurMobileDuelSessionResult => {
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [spectatorId] = useState(createMobileDuelSpectatorId);
  const learnerIdentity =
    session.user?.activeLearner?.id ??
    session.user?.email ??
    session.user?.id ??
    'guest';
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isSpectating = options.spectate === true;
  const normalizedSessionId = sessionId?.trim() ?? '';
  const hasSessionId = normalizedSessionId.length > 0;
  const playerQueryKey = [
    'kangur-mobile',
    'duels',
    'session',
    apiBaseUrl,
    learnerIdentity,
    normalizedSessionId,
  ] as const;
  const spectatorQueryKey = [
    'kangur-mobile',
    'duels',
    'spectator-session',
    apiBaseUrl,
    normalizedSessionId,
    spectatorId,
  ] as const;

  const playerQuery = useQuery({
    enabled: hasSessionId && isAuthenticated && !isSpectating,
    queryKey: playerQueryKey,
    queryFn: async () =>
      apiClient.getDuelState(normalizedSessionId, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const spectatorQuery = useQuery({
    enabled: hasSessionId && isSpectating,
    queryKey: spectatorQueryKey,
    queryFn: async () =>
      apiClient.getDuelSpectatorState(
        normalizedSessionId,
        { spectatorId },
        { cache: 'no-store' },
      ),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const sessionState = playerQuery.data ?? null;
  const spectatorState = spectatorQuery.data ?? null;
  const duelSession = isSpectating
    ? spectatorState?.session ?? null
    : sessionState?.session ?? null;
  const player = isSpectating ? null : sessionState?.player ?? null;
  const currentQuestion = useMemo(() => {
    if (!duelSession) {
      return null;
    }

    const currentQuestionIndex = isSpectating
      ? duelSession.currentQuestionIndex ?? 0
      : player?.currentQuestionIndex ?? 0;

    if (currentQuestionIndex >= duelSession.questionCount) {
      return null;
    }

    return duelSession.questions[currentQuestionIndex] ?? null;
  }, [duelSession, isSpectating, player]);

  useEffect(() => {
    if (isSpectating || !hasSessionId || !isAuthenticated || !duelSession) {
      return;
    }

    if (
      duelSession.status === 'completed' ||
      duelSession.status === 'aborted'
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void apiClient
        .heartbeatDuel(
          {
            clientTimestamp: new Date().toISOString(),
            sessionId: normalizedSessionId,
          },
          { cache: 'no-store' },
        )
        .then((response) => {
          queryClient.setQueryData(playerQueryKey, response);
        })
        .catch(() => {
          // The polling query already surfaces fetch failures.
        });
    }, MOBILE_DUEL_HEARTBEAT_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    apiClient,
    duelSession,
    hasSessionId,
    isAuthenticated,
    isSpectating,
    normalizedSessionId,
    playerQueryKey,
    queryClient,
  ]);

  const runMutation = async <TResult>(
    action: () => Promise<TResult>,
    fallbackMessage: string,
  ): Promise<TResult | null> => {
    setIsMutating(true);
    setActionError(null);

    try {
      return await action();
    } catch (error) {
      setActionError(toSessionErrorMessage(error, fallbackMessage));
      return null;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    actionError,
    currentQuestion,
    error: toSessionErrorMessage(
      isSpectating ? spectatorQuery.error : playerQuery.error,
      isSpectating
        ? 'Nie udało się pobrać podglądu pojedynku.'
        : 'Nie udało się pobrać stanu pojedynku.',
    ),
    isAuthenticated,
    isLoading: isSpectating ? spectatorQuery.isLoading : isRestoringAuth || playerQuery.isLoading,
    isMutating,
    isRestoringAuth,
    isSpectating,
    leaveSession: async () => {
      if (isSpectating) {
        return false;
      }

      const response = await runMutation(
        async () =>
          apiClient.leaveDuel(
            {
              reason: 'mobile_exit',
              sessionId: normalizedSessionId,
            },
            { cache: 'no-store' },
          ),
        'Nie udało się opuścić pojedynku.',
      );

      if (!response) {
        return false;
      }

      queryClient.setQueryData(playerQueryKey, response);
      return true;
    },
    player,
    refresh: async () => {
      if (isSpectating) {
        await spectatorQuery.refetch();
        return;
      }

      await playerQuery.refetch();
    },
    sendReaction: async (type) => {
      const response = await runMutation(
        async () =>
          apiClient.reactToDuel(
            {
              sessionId: normalizedSessionId,
              type,
            },
            { cache: 'no-store' },
          ),
        'Nie udało się wysłać reakcji.',
      );

      if (!response) {
        return;
      }

      const activeQueryKey = isSpectating ? spectatorQueryKey : playerQueryKey;
      queryClient.setQueryData<KangurDuelStateResponse | KangurDuelSpectatorStateResponse>(
        activeQueryKey,
        (current) => {
        if (!current || typeof current !== 'object' || !('session' in current)) {
          return current;
        }

        const currentState = current as {
          player?: KangurDuelPlayer;
          serverTime: string;
          session: KangurDuelSession;
        };
        const existingReactions = currentState.session.recentReactions ?? [];

        return {
          ...currentState,
          session: {
            ...currentState.session,
            recentReactions: [...existingReactions, response.reaction].slice(-8),
          },
        };
        },
      );
    },
    session: duelSession,
    spectatorCount: duelSession?.spectatorCount ?? 0,
    submitAnswer: async (choice) => {
      if (isSpectating || !currentQuestion) {
        return;
      }

      const response = await runMutation(
        async () =>
          apiClient.answerDuel(
            {
              choice,
              clientTimestamp: new Date().toISOString(),
              questionId: currentQuestion.id,
              sessionId: normalizedSessionId,
            },
            { cache: 'no-store' },
          ),
        'Nie udało się wysłać odpowiedzi.',
      );

      if (!response) {
        return;
      }

      queryClient.setQueryData(playerQueryKey, response);
    },
  };
};
