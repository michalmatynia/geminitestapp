import type {
  KangurDuelChoice,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReactionType,
  KangurDuelSession,
} from '@kangur/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const MOBILE_DUEL_SESSION_POLL_MS = 4_000;
const MOBILE_DUEL_HEARTBEAT_MS = 15_000;

type UseKangurMobileDuelSessionResult = {
  actionError: string | null;
  currentQuestion: KangurDuelQuestion | null;
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMutating: boolean;
  isRestoringAuth: boolean;
  leaveSession: () => Promise<boolean>;
  player: KangurDuelPlayer | null;
  refresh: () => Promise<void>;
  sendReaction: (type: KangurDuelReactionType) => Promise<void>;
  session: KangurDuelSession | null;
  submitAnswer: (choice: KangurDuelChoice) => Promise<void>;
};

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
): UseKangurMobileDuelSessionResult => {
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const learnerIdentity =
    session.user?.activeLearner?.id ??
    session.user?.email ??
    session.user?.id ??
    'guest';
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const normalizedSessionId = sessionId?.trim() ?? '';
  const isEnabled = isAuthenticated && normalizedSessionId.length > 0;
  const queryKey = [
    'kangur-mobile',
    'duels',
    'session',
    apiBaseUrl,
    learnerIdentity,
    normalizedSessionId,
  ] as const;

  const sessionQuery = useQuery({
    enabled: isEnabled,
    queryKey,
    queryFn: async () =>
      apiClient.getDuelState(normalizedSessionId, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_SESSION_POLL_MS,
    staleTime: 2_000,
  });

  const sessionState = sessionQuery.data ?? null;
  const duelSession = sessionState?.session ?? null;
  const player = sessionState?.player ?? null;
  const currentQuestion = useMemo(() => {
    if (!duelSession || !player) {
      return null;
    }

    const currentQuestionIndex = player.currentQuestionIndex ?? 0;

    if (currentQuestionIndex >= duelSession.questionCount) {
      return null;
    }

    return duelSession.questions[currentQuestionIndex] ?? null;
  }, [duelSession, player]);

  useEffect(() => {
    if (!isEnabled || !duelSession) {
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
          queryClient.setQueryData(queryKey, response);
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
    isEnabled,
    normalizedSessionId,
    queryClient,
    queryKey,
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
      sessionQuery.error,
      'Nie udało się pobrać stanu pojedynku.',
    ),
    isAuthenticated,
    isLoading: isRestoringAuth || sessionQuery.isLoading,
    isMutating,
    isRestoringAuth,
    leaveSession: async () => {
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

      queryClient.setQueryData(queryKey, response);
      return true;
    },
    player,
    refresh: async () => {
      await sessionQuery.refetch();
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

      queryClient.setQueryData(queryKey, (current) => {
        if (!current || typeof current !== 'object' || !('session' in current)) {
          return current;
        }

        const currentState = current as {
          player: KangurDuelPlayer;
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
      });
    },
    session: duelSession,
    submitAnswer: async (choice) => {
      if (!currentQuestion) {
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

      queryClient.setQueryData(queryKey, response);
    },
  };
};
