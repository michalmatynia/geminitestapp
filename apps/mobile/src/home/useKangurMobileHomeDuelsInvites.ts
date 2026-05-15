import { type UseQueryResult } from '@tanstack/react-query';
import type { KangurDuelLobbyEntry, KangurDuelLobbyResponse } from '@kangur/contracts/kangur-duels';
import { useEffect, useMemo } from 'react';
import type { KangurAuthSession, KangurUser } from '@kangur/platform';

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
  persistKangurMobileHomeDuelInvites,
  resolvePersistedKangurMobileHomeDuelInvites,
} from './persistedKangurMobileHomeDuelInvites';
import type { DuelApiClient } from '../duels/useKangurMobileDuelsLobbyQueries';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

type UseKangurMobileHomeDuelsInvitesResult = {
  error: string | null;
  invites: KangurDuelLobbyEntry[];
  isDeferred: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  outgoingChallenges: KangurDuelLobbyEntry[];
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
};

type UseKangurMobileHomeDuelsInvitesOptions = {
  enabled?: boolean;
};

function getLearnerId(user: KangurUser): string | null {
    return user.activeLearner?.id ?? null;
}
function getUserId(user: KangurUser): string {
    return user.id;
}
function getIdentity(user: KangurUser, learnerId: string | null, userId: string): string {
    return learnerId ?? user.email ?? userId;
}
function resolveLearnerContext(
  session: KangurAuthSession,
): { identity: string; activeId: string | null } {
  const user = session.user;
  if (!user) return { identity: 'guest', activeId: null };
  const learnerId = getLearnerId(user);
  const userId = getUserId(user);
  return { identity: getIdentity(user, learnerId, userId), activeId: learnerId ?? userId };
}

function useDuelsState(
  isQueryEnabled: boolean,
  invitesQuery: UseQueryResult<KangurDuelLobbyResponse, Error>,
  persisted: KangurDuelLobbyEntry[] | null
): { resolved: KangurDuelLobbyEntry[]; hasResolvedLive: boolean; privateEntries: KangurDuelLobbyEntry[] } {
  const data = invitesQuery.data;
  const privateEntries = useMemo(() => data?.entries.filter((e) => e.visibility === 'private').sort((l, r) => Date.parse(r.updatedAt) - Date.parse(l.updatedAt)).slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT) ?? [], [data]);
  const hasResolvedLive = isQueryEnabled && !invitesQuery.isLoading && invitesQuery.error === null && data !== undefined;
  const resolved: KangurDuelLobbyEntry[] = useMemo(() => hasResolvedLive ? privateEntries : (persisted ?? privateEntries), [hasResolvedLive, privateEntries, persisted]);
  return { resolved, hasResolvedLive, privateEntries };
}

function useLearnerContext(): { identity: string; activeId: string | null } {
  const { session } = useKangurMobileAuth();
  return useMemo(() => resolveLearnerContext(session), [session]);
}

function useCategorizedDuels(
  entries: KangurDuelLobbyEntry[],
  activeLearnerId: string | null,
): { invites: KangurDuelLobbyEntry[]; outgoingChallenges: KangurDuelLobbyEntry[] } {
  return useMemo(() => {
    const invites: KangurDuelLobbyEntry[] = [];
    const outgoingChallenges: KangurDuelLobbyEntry[] = [];

    entries.forEach((entry) => {
      if (entry.host.learnerId === activeLearnerId) {
        outgoingChallenges.push(entry);
      } else {
        invites.push(entry);
      }
    });

    return { invites, outgoingChallenges };
  }, [entries, activeLearnerId]);
}

function usePrivateEntriesQuery(
  enabled: boolean,
  apiBaseUrl: string,
  apiClient: DuelApiClient,
  learnerIdentity: string,
): UseQueryResult<KangurDuelLobbyResponse, Error> {
  const queryKey = buildKangurMobileHomeDuelLobbyQueryKey(apiBaseUrl, learnerIdentity, 'private');
  return useKangurMobileQueryV2<KangurDuelLobbyResponse>({
    enabled,
    queryKey,
    queryFn: async (): Promise<KangurDuelLobbyResponse> =>
      await apiClient.listDuelLobby({ limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT, visibility: 'private' }, { cache: 'no-store' }),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 10_000,
    meta: {
      source: 'kangur.mobile.home.duels.invites',
      operation: 'list',
      resource: 'kangur.mobile.home.duels.invites',
      queryKey,
      description: 'Loads Kangur mobile private duel invites.',
      tags: ['kangur-mobile', 'home', 'duels', 'invites'],
    },
  });
}

function resolveErrorMessage(
    error: Error | null,
    copy: ReturnType<typeof useKangurMobileI18n>['copy']
): string | null {
    return resolveMobileDuelErrorMessage({
        error,
        copy,
        fallback: {
            de: 'Die Duelleinladungen konnten nicht geladen werden.',
            en: 'Could not load duel invites.',
            pl: 'Nie udało się pobrać zaproszeń do pojedynków.'
        },
        unauthorized: {
            de: 'Melde dich an, um private Duelleinladungen zu laden.',
            en: 'Sign in to load private duel invites.',
            pl: 'Zaloguj się, aby pobrać prywatne zaproszenia do pojedynków.'
        },
    });
}

function useInvitesAuth(enabled: boolean, sessionStatus: string): { isAuthenticated: boolean; isQueryEnabled: boolean } {
    const isAuthenticated = sessionStatus === 'authenticated';
    const isQueryEnabled = enabled && isAuthenticated;
    return { isAuthenticated, isQueryEnabled };
}

function usePersistedInvites(
    isAuthenticated: boolean,
    learnerIdentity: string,
    storage: ReturnType<typeof useKangurMobileRuntime>['storage']
): KangurDuelLobbyEntry[] | null {
    return useMemo(
        () => isAuthenticated ? resolvePersistedKangurMobileHomeDuelInvites({ learnerIdentity, storage }) : null,
        [isAuthenticated, learnerIdentity, storage],
    );
}

function resolveInvitesLoading(
    isRestoringAuth: boolean,
    isQueryEnabled: boolean,
    invitesQueryLoading: boolean
): boolean {
    return isRestoringAuth || (isQueryEnabled && invitesQueryLoading);
}

export const useKangurMobileHomeDuelsInvites = ({
  enabled = true,
}: UseKangurMobileHomeDuelsInvitesOptions = {}): UseKangurMobileHomeDuelsInvitesResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient, storage } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { identity: learnerIdentity, activeId: activeLearnerId } = useLearnerContext();

  const { isAuthenticated, isQueryEnabled } = useInvitesAuth(enabled, session.status);
  const persisted = usePersistedInvites(isAuthenticated, learnerIdentity, storage);

  const invitesQuery = usePrivateEntriesQuery(isQueryEnabled, apiBaseUrl, apiClient, learnerIdentity);
  const { resolved, hasResolvedLive, privateEntries } = useDuelsState(isQueryEnabled, invitesQuery, persisted);

  useEffect(() => {
    if (hasResolvedLive) persistKangurMobileHomeDuelInvites({ entries: privateEntries, learnerIdentity, storage });
  }, [hasResolvedLive, learnerIdentity, privateEntries, storage]);

  const { invites, outgoingChallenges } = useCategorizedDuels(resolved, activeLearnerId);

  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const error = resolveErrorMessage(invitesQuery.error instanceof Error ? invitesQuery.error : null, copy);

  return {
    error,
    invites,
    isDeferred: isAuthenticated && !isRestoringAuth && !isQueryEnabled,
    isAuthenticated,
    isLoading: resolveInvitesLoading(isRestoringAuth, isQueryEnabled, invitesQuery.isLoading),
    outgoingChallenges,
    isRestoringAuth,
    refresh: async () => { if (isQueryEnabled) await invitesQuery.refetch(); },
  };
};
