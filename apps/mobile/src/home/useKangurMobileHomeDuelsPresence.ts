import type {
  KangurDuelLobbyPresenceEntry,
  KangurDuelLobbyPresenceResponse,
} from '@kangur/contracts/kangur-duels';
import {
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveMobileDuelErrorMessage } from '../duels/mobileDuelErrorMessages';
import {
  buildKangurMobileHomeDuelLobbyQueryKey,
  MOBILE_HOME_DUEL_LOBBY_POLL_MS,
  MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
} from './homeDuelLobbyQuery';
import {
  persistKangurMobileHomeDuelPresence,
  resolvePersistedKangurMobileHomeDuelPresence,
} from './persistedKangurMobileHomeDuelPresence';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

export type UseKangurMobileHomeDuelsPresenceResult = {
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

type UsePresenceActionsParams = {
  apiClient: ReturnType<typeof useKangurMobileRuntime>['apiClient'];
  queryClient: ReturnType<typeof useQueryClient>;
  presenceQueryKey: string[];
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
};

type UsePresenceActionsResult = {
  actionError: string | null;
  createPrivateChallenge: (opponentLearnerId: string) => Promise<string | null>;
  isActionPending: boolean;
  pendingLearnerId: string | null;
};

function resolvePresenceContext(
  session: ReturnType<typeof useKangurMobileAuth>['session'],
): { identity: string } {
  const user = session.user;
  return {
    identity: user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest',
  };
}

const comparePresenceEntries = (
  left: KangurDuelLobbyPresenceEntry,
  right: KangurDuelLobbyPresenceEntry,
): number => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);

function toPresenceEntries(
  response: KangurDuelLobbyPresenceResponse | undefined,
): KangurDuelLobbyPresenceEntry[] {
  return [...(response?.entries ?? [])]
    .sort(comparePresenceEntries)
    .slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT);
}

function usePresenceActions({
  apiClient,
  queryClient,
  presenceQueryKey,
  copy,
}: UsePresenceActionsParams): UsePresenceActionsResult {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingLearnerId, setPendingLearnerId] = useState<string | null>(null);

  const createPrivateChallenge = useCallback(
    async (opponentLearnerId: string): Promise<string | null> => {
      setActionError(null);
      setIsActionPending(true);
      setPendingLearnerId(opponentLearnerId);
      try {
        const response = await apiClient.createDuel(
          { opponentLearnerId, visibility: 'private' },
          { cache: 'no-store' },
        );
        await queryClient.invalidateQueries({ queryKey: presenceQueryKey });
        return response.session.id;
      } catch (error: unknown) {
        setActionError(
          resolveMobileDuelErrorMessage({
            error,
            copy,
            fallback: {
              de: 'Herausforderung fehlgeschlagen.',
              en: 'Could not send challenge.',
              pl: 'Nie udało się wysłać wyzwania.',
            },
          }),
        );
        return null;
      } finally {
        setIsActionPending(false);
        setPendingLearnerId(null);
      }
    },
    [apiClient, copy, presenceQueryKey, queryClient],
  );

  return {
    actionError,
    createPrivateChallenge,
    isActionPending,
    pendingLearnerId,
  };
}

function isPresenceQueryEnabled(
  enabled: boolean,
  isAuthenticated: boolean,
  isLoadingAuth: boolean,
): boolean {
  if (!enabled || !isAuthenticated) {
    return false;
  }
  return !isLoadingAuth;
}

function isPresenceQueryReady(
  isQueryEnabled: boolean,
  presenceQuery: Pick<UseQueryResult<KangurDuelLobbyPresenceResponse>, 'isSuccess'>,
): boolean {
  if (!isQueryEnabled) {
    return false;
  }
  return presenceQuery.isSuccess;
}

function usePresenceQuery(
  apiClient: ReturnType<typeof useKangurMobileRuntime>['apiClient'],
  apiBaseUrl: string,
  learnerIdentity: string,
  isQueryEnabled: boolean,
): UseQueryResult<KangurDuelLobbyPresenceResponse> {
  const presenceQueryKey = buildKangurMobileHomeDuelLobbyQueryKey(
    apiBaseUrl,
    learnerIdentity,
    'presence',
  );

  return useKangurMobileQueryV2<KangurDuelLobbyPresenceResponse>({
    enabled: isQueryEnabled,
    queryKey: presenceQueryKey,
    queryFn: () =>
      apiClient.pingDuelLobbyPresence(
        { limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT },
        { cache: 'no-store' },
      ),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 5000,
    meta: {
      source: 'kangur.mobile.home.duels.presence',
      operation: 'list',
      resource: 'kangur.mobile.home.duels.presence',
      queryKey: presenceQueryKey,
      description: 'Loads Kangur mobile home duel presence entries.',
      tags: ['kangur-mobile', 'home', 'duels', 'presence'],
    },
  });
}

function usePresenceEntries({
  apiClient,
  apiBaseUrl,
  learnerIdentity,
  storage,
  isAuthenticated,
  isQueryEnabled,
}: {
  apiClient: ReturnType<typeof useKangurMobileRuntime>['apiClient'];
  apiBaseUrl: string;
  learnerIdentity: string;
  storage: ReturnType<typeof useKangurMobileRuntime>['storage'];
  isAuthenticated: boolean;
  isQueryEnabled: boolean;
}): {
  entries: KangurDuelLobbyPresenceEntry[];
  presenceQuery: UseQueryResult<KangurDuelLobbyPresenceResponse>;
  presenceQueryKey: string[];
} {
  const presenceQueryKey = buildKangurMobileHomeDuelLobbyQueryKey(
    apiBaseUrl,
    learnerIdentity,
    'presence',
  );
  const presenceQuery = usePresenceQuery(
    apiClient,
    apiBaseUrl,
    learnerIdentity,
    isQueryEnabled,
  );
  const presenceEntries = useMemo(
    () => toPresenceEntries(presenceQuery.data),
    [presenceQuery.data],
  );
  const persistedPresenceEntries = useMemo(
    () =>
      isAuthenticated
        ? resolvePersistedKangurMobileHomeDuelPresence({ learnerIdentity, storage })
        : null,
    [isAuthenticated, learnerIdentity, storage],
  );
  const isPresenceResolved = isPresenceQueryReady(isQueryEnabled, presenceQuery);
  const resolvedEntries = isPresenceResolved
    ? presenceEntries
    : persistedPresenceEntries ?? presenceEntries;

  useEffect(() => {
    if (isPresenceResolved) {
      persistKangurMobileHomeDuelPresence({
        entries: presenceEntries,
        learnerIdentity,
        storage,
      });
    }
  }, [isPresenceResolved, learnerIdentity, presenceEntries, storage]);

  return {
    entries: resolvedEntries,
    presenceQuery,
    presenceQueryKey,
  };
}

export function useKangurMobileHomeDuelsPresence({
  enabled = true,
}: UseKangurMobileHomeDuelsPresenceOptions = {}): UseKangurMobileHomeDuelsPresenceResult {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient, storage } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const queryClient = useQueryClient();
  const { identity: learnerIdentity } = resolvePresenceContext(session);
  const isAuthenticated = session.status === 'authenticated';
  const isQueryEnabled = isPresenceQueryEnabled(enabled, isAuthenticated, isLoadingAuth);
  const { entries, presenceQuery, presenceQueryKey } = usePresenceEntries({
    apiClient,
    apiBaseUrl,
    learnerIdentity,
    storage,
    isAuthenticated,
    isQueryEnabled,
  });
  const actions = usePresenceActions({
    apiClient,
    queryClient,
    presenceQueryKey,
    copy,
  });

  return {
    ...actions,
    entries,
    error: resolveMobileDuelErrorMessage({
      error: presenceQuery.error,
      copy,
      fallback: {
        de: 'Lobby-Teilnehmer konnten nicht geladen werden.',
        en: 'Could not load lobby participants.',
        pl: 'Nie udało się pobrać uczestników lobby.',
      },
    }),
    isAuthenticated,
    isLoading: (isLoadingAuth && !isAuthenticated) || (isQueryEnabled && presenceQuery.isLoading),
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    refresh: async () => {
      await presenceQuery.refetch();
    },
  };
}
