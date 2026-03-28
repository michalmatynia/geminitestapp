import type { KangurDuelLobbyPresenceEntry } from '@kangur/contracts/kangur-duels';
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

const MOBILE_HOME_DUELS_PRESENCE_DISPLAY_LIMIT = 4;
const MOBILE_HOME_DUELS_PRESENCE_QUERY_LIMIT = 6;
const MOBILE_HOME_DUELS_PRESENCE_POLL_MS = 20_000;

type UseKangurMobileHomeDuelsPresenceResult = {
  actionError: string | null;
  createPrivateChallenge: (opponentLearnerId: string) => Promise<string | null>;
  entries: KangurDuelLobbyPresenceEntry[];
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  pendingLearnerId: string | null;
  refresh: () => Promise<void>;
};

type UseKangurMobileHomeDuelsPresenceOptions = {
  enabled?: boolean;
};

const toPresenceErrorMessage = (
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
        de: 'Melde dich an, um aktive Rivalen aus der Duell-Lobby zu laden.',
        en: 'Sign in to load active rivals in the duel lobby.',
        pl: 'Zaloguj się, aby pobrać aktywnych rywali z lobby pojedynków.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die aktive Duell-Lobby konnte nicht geladen werden.',
      en: 'Could not load the active duel lobby.',
      pl: 'Nie udało się pobrać aktywnego lobby pojedynków.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die aktive Duell-Lobby konnte nicht geladen werden.',
      en: 'Could not load the active duel lobby.',
      pl: 'Nie udało się pobrać aktywnego lobby pojedynków.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die aktive Duell-Lobby konnte nicht geladen werden.',
      en: 'Could not load the active duel lobby.',
      pl: 'Nie udało się pobrać aktywnego lobby pojedynków.',
    });
  }

  return message;
};

const toPresenceActionErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um eine private Herausforderung zu senden.',
        en: 'Sign in to send a private challenge.',
        pl: 'Zaloguj się, aby wysłać prywatne wyzwanie.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die private Herausforderung konnte nicht erstellt werden.',
      en: 'Could not create the private challenge.',
      pl: 'Nie udało się utworzyć prywatnego wyzwania.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die private Herausforderung konnte nicht erstellt werden.',
      en: 'Could not create the private challenge.',
      pl: 'Nie udało się utworzyć prywatnego wyzwania.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die private Herausforderung konnte nicht erstellt werden.',
      en: 'Could not create the private challenge.',
      pl: 'Nie udało się utworzyć prywatnego wyzwania.',
    });
  }

  return message;
};

export const useKangurMobileHomeDuelsPresence = ({
  enabled = true,
}: UseKangurMobileHomeDuelsPresenceOptions = {}): UseKangurMobileHomeDuelsPresenceResult => {
  const queryClient = useQueryClient();
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingLearnerId, setPendingLearnerId] = useState<string | null>(null);
  const learnerIdentity =
    session.user?.activeLearner?.id ??
    session.user?.email ??
    session.user?.id ??
    'guest';
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isQueryEnabled = enabled && isAuthenticated;
  const presenceQueryKey = [
    'kangur-mobile',
    'home',
    'duels-presence',
    apiBaseUrl,
    learnerIdentity,
  ] as const;
  const invitesQueryKey = [
    'kangur-mobile',
    'home',
    'duels-invites',
    apiBaseUrl,
    learnerIdentity,
  ] as const;

  const presenceQuery = useQuery({
    enabled: isQueryEnabled,
    queryKey: presenceQueryKey,
    queryFn: async () =>
      apiClient.listDuelLobbyPresence(
        { limit: MOBILE_HOME_DUELS_PRESENCE_QUERY_LIMIT },
        { cache: 'no-store' },
      ),
    refetchInterval: MOBILE_HOME_DUELS_PRESENCE_POLL_MS,
    staleTime: 10_000,
  });

  const entries = useMemo(
    () =>
      [...(presenceQuery.data?.entries ?? [])]
        .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))
        .slice(0, MOBILE_HOME_DUELS_PRESENCE_DISPLAY_LIMIT),
    [presenceQuery.data?.entries],
  );

  return {
    actionError,
    createPrivateChallenge: async (opponentLearnerId) => {
      setActionError(null);
      setIsActionPending(true);
      setPendingLearnerId(opponentLearnerId);

      try {
        const response = await apiClient.createDuel(
          {
            difficulty: MOBILE_DUEL_DEFAULT_DIFFICULTY,
            mode: 'challenge',
            operation: MOBILE_DUEL_DEFAULT_OPERATION,
            opponentLearnerId,
            questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
            timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
            visibility: 'private',
          },
          { cache: 'no-store' },
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: presenceQueryKey }),
          queryClient.invalidateQueries({ queryKey: invitesQueryKey }),
        ]);

        return response.session.id;
      } catch (error) {
        setActionError(toPresenceActionErrorMessage(error, copy));
        return null;
      } finally {
        setIsActionPending(false);
        setPendingLearnerId(null);
      }
    },
    entries,
    error: toPresenceErrorMessage(presenceQuery.error, copy),
    isActionPending,
    isAuthenticated,
    isLoading: isRestoringAuth || (isQueryEnabled && presenceQuery.isLoading),
    isRestoringAuth,
    pendingLearnerId,
    refresh: async () => {
      if (!isQueryEnabled) {
        return;
      }

      await presenceQuery.refetch();
    },
  };
};
