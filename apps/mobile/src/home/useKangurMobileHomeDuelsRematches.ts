import type { KangurDuelOpponentEntry } from '@kangur/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from '../duels/mobileDuelDefaults';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const MOBILE_HOME_DUELS_REMATCH_LIMIT = 4;

type UseKangurMobileHomeDuelsRematchesResult = {
  actionError: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  opponents: KangurDuelOpponentEntry[];
  refresh: () => Promise<void>;
};

const toRematchesErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um letzte Rivalen zu laden.',
        en: 'Sign in to load recent opponents.',
        pl: 'Zaloguj się, aby pobrać ostatnich rywali.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die letzten Rivalen konnten nicht geladen werden.',
      en: 'Could not load recent opponents.',
      pl: 'Nie udało się pobrać ostatnich rywali.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die letzten Rivalen konnten nicht geladen werden.',
      en: 'Could not load recent opponents.',
      pl: 'Nie udało się pobrać ostatnich rywali.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die letzten Rivalen konnten nicht geladen werden.',
      en: 'Could not load recent opponents.',
      pl: 'Nie udało się pobrać ostatnich rywali.',
    });
  }

  return message;
};

const toRematchActionErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um ein privates Rückspiel zu senden.',
        en: 'Sign in to send a private rematch.',
        pl: 'Zaloguj się, aby wysłać prywatny rewanż.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Der private Rückkampf konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Der private Rückkampf konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Der private Rückkampf konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  return message;
};

export const useKangurMobileHomeDuelsRematches =
  (): UseKangurMobileHomeDuelsRematchesResult => {
    const queryClient = useQueryClient();
    const { copy } = useKangurMobileI18n();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const [actionError, setActionError] = useState<string | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);
    const learnerIdentity =
      session.user?.activeLearner?.id ??
      session.user?.email ??
      session.user?.id ??
      'guest';
    const isAuthenticated = session.status === 'authenticated';
    const isRestoringAuth = isLoadingAuth && !isAuthenticated;
    const rematchesQueryKey = [
      'kangur-mobile',
      'home',
      'duels-rematches',
      apiBaseUrl,
      learnerIdentity,
    ] as const;

    const rematchesQuery = useQuery({
      enabled: isAuthenticated,
      queryKey: rematchesQueryKey,
      queryFn: async () =>
        apiClient.listDuelOpponents(
          { limit: MOBILE_HOME_DUELS_REMATCH_LIMIT },
          { cache: 'no-store' },
        ),
      staleTime: 30_000,
    });

    const opponents = useMemo(
      () =>
        [...(rematchesQuery.data?.entries ?? [])]
          .sort((left, right) => Date.parse(right.lastPlayedAt) - Date.parse(left.lastPlayedAt))
          .slice(0, MOBILE_HOME_DUELS_REMATCH_LIMIT),
      [rematchesQuery.data?.entries],
    );

    return {
      actionError,
      createRematch: async (opponentLearnerId) => {
        setActionError(null);
        setIsActionPending(true);

        try {
          const response = await apiClient.createDuel(
            {
              mode: 'challenge',
              visibility: 'private',
              opponentLearnerId,
              operation: MOBILE_DUEL_DEFAULT_OPERATION,
              difficulty: MOBILE_DUEL_DEFAULT_DIFFICULTY,
              questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
              timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
            },
            { cache: 'no-store' },
          );

          await queryClient.invalidateQueries({ queryKey: rematchesQueryKey });
          return response.session.id;
        } catch (error) {
          setActionError(toRematchActionErrorMessage(error, copy));
          return null;
        } finally {
          setIsActionPending(false);
        }
      },
      error: toRematchesErrorMessage(rematchesQuery.error, copy),
      isActionPending,
      isAuthenticated,
      isLoading: isRestoringAuth || rematchesQuery.isLoading,
      isRestoringAuth,
      opponents,
      refresh: async () => {
        await rematchesQuery.refetch();
      },
    };
  };
