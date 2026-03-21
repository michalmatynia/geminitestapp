import type { KangurDuelLobbyEntry } from '@kangur/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const MOBILE_HOME_DUELS_INVITES_LIMIT = 4;
const MOBILE_HOME_DUELS_INVITES_POLL_MS = 20_000;

type UseKangurMobileHomeDuelsInvitesResult = {
  error: string | null;
  invites: KangurDuelLobbyEntry[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
};

const toInviteErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return 'Zaloguj sesję ucznia, aby pobrać prywatne zaproszenia do pojedynków.';
    }
  }

  if (!(error instanceof Error)) {
    return 'Nie udało się pobrać zaproszeń do pojedynków.';
  }

  const message = error.message.trim();
  if (!message) {
    return 'Nie udało się pobrać zaproszeń do pojedynków.';
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return 'Nie udało się połączyć z API Kangura.';
  }

  return message;
};

export const useKangurMobileHomeDuelsInvites =
  (): UseKangurMobileHomeDuelsInvitesResult => {
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const learnerIdentity =
      session.user?.activeLearner?.id ??
      session.user?.email ??
      session.user?.id ??
      'guest';
    const isAuthenticated = session.status === 'authenticated';
    const isRestoringAuth = isLoadingAuth && !isAuthenticated;

    const invitesQuery = useQuery({
      enabled: isAuthenticated,
      queryKey: [
        'kangur-mobile',
        'home',
        'duels-invites',
        apiBaseUrl,
        learnerIdentity,
      ] as const,
      queryFn: async () =>
        apiClient.listDuelLobby(
          { limit: MOBILE_HOME_DUELS_INVITES_LIMIT },
          { cache: 'no-store' },
        ),
      refetchInterval: MOBILE_HOME_DUELS_INVITES_POLL_MS,
      staleTime: 10_000,
    });

    const invites = useMemo(
      () =>
        (invitesQuery.data?.entries ?? [])
          .filter((entry) => entry.visibility === 'private')
          .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
          .slice(0, MOBILE_HOME_DUELS_INVITES_LIMIT),
      [invitesQuery.data?.entries],
    );

    return {
      error: toInviteErrorMessage(invitesQuery.error),
      invites,
      isAuthenticated,
      isLoading: isRestoringAuth || invitesQuery.isLoading,
      isRestoringAuth,
      refresh: async () => {
        await invitesQuery.refetch();
      },
    };
  };
