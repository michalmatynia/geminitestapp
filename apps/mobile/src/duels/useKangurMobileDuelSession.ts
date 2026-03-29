import type {
  KangurDuelChoice,
  KangurDuelPlayer,
  KangurDuelQuestion,
  KangurDuelReactionType,
  KangurDuelSpectatorStateResponse,
  KangurDuelSession,
  KangurDuelStateResponse,
} from '@kangur/contracts-duels';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';
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

const readSessionErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || !error || !('status' in error)) {
    return null;
  }

  return typeof (error as { status?: unknown }).status === 'number'
    ? ((error as { status: number }).status)
    : null;
};

const readSessionErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.trim();
  return message.length > 0 ? message : null;
};

const isFallbackSessionErrorMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized === 'failed to fetch' || normalized.includes('networkerror');
};

const getUnauthorizedSessionErrorMessage = (
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string =>
  copy({
    de: 'Melde dich an, um dieses Duell zu öffnen.',
    en: 'Sign in to open this duel.',
    pl: 'Zaloguj się, aby otworzyć ten pojedynek.',
  });

const resolveSessionMessageWithFallback = (
  message: string | null,
  fallback: string,
): string => {
  if (!message || isFallbackSessionErrorMessage(message)) {
    return fallback;
  }

  return message;
};

const toSessionErrorMessage = (
  error: unknown,
  fallback: string,
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string | null => {
  if (!error) {
    return null;
  }

  if (readSessionErrorStatus(error) === 401) {
    return getUnauthorizedSessionErrorMessage(copy);
  }

  return resolveSessionMessageWithFallback(readSessionErrorMessage(error), fallback);
};

const resolveCurrentQuestionIndex = (
  duelSession: KangurDuelSession | null,
  isSpectating: boolean,
  player: KangurDuelPlayer | null,
): number | null => {
  if (!duelSession) {
    return null;
  }

  const currentQuestionIndex = isSpectating
    ? duelSession.currentQuestionIndex ?? 0
    : player?.currentQuestionIndex ?? 0;

  return currentQuestionIndex >= duelSession.questionCount
    ? null
    : currentQuestionIndex;
};

const resolveCurrentQuestion = (
  duelSession: KangurDuelSession | null,
  isSpectating: boolean,
  player: KangurDuelPlayer | null,
): KangurDuelQuestion | null => {
  const currentQuestionIndex = resolveCurrentQuestionIndex(
    duelSession,
    isSpectating,
    player,
  );

  if (!duelSession || currentQuestionIndex === null) {
    return null;
  }

  return duelSession.questions[currentQuestionIndex] ?? null;
};

export const useKangurMobileDuelSession = (
  sessionId: string | null,
  options: UseKangurMobileDuelSessionOptions = {},
): UseKangurMobileDuelSessionResult => {
  const { copy } = useKangurMobileI18n();
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
  const currentQuestion = resolveCurrentQuestion(duelSession, isSpectating, player);

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
      setActionError(toSessionErrorMessage(error, fallbackMessage, copy));
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
        ? copy({
            de: 'Das öffentliche Duell konnte nicht geladen werden.',
            en: 'Could not load the public duel.',
            pl: 'Nie udało się pobrać publicznego pojedynku.',
          })
        : copy({
            de: 'Der Duellstatus konnte nicht geladen werden.',
            en: 'Could not load the duel state.',
            pl: 'Nie udało się pobrać stanu pojedynku.',
          }),
      copy,
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
        copy({
          de: 'Das Duell konnte nicht verlassen werden.',
          en: 'Could not leave the duel.',
          pl: 'Nie udało się opuścić pojedynku.',
        }),
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
        copy({
          de: 'Die Reaktion konnte nicht gesendet werden.',
          en: 'Could not send the reaction.',
          pl: 'Nie udało się wysłać reakcji.',
        }),
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
        copy({
          de: 'Die Antwort konnte nicht gesendet werden.',
          en: 'Could not send the answer.',
          pl: 'Nie udało się wysłać odpowiedzi.',
        }),
      );

      if (!response) {
        return;
      }

      queryClient.setQueryData(playerQueryKey, response);
    },
  };
};
