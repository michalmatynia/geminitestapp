import type { KangurDuelLobbyEntry } from '@kangur/contracts/kangur-duels';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

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

const MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT = 4;

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

function resolveLearnerContext(session: ReturnType<typeof useKangurMobileAuth>['session']): { identity: string; activeId: string | null } {
  const user = session.user;
  if (!user) {
    return { identity: 'guest', activeId: null };
  }

  const activeId = user.activeLearner?.id ?? user.id ?? null;
  const identity = user.activeLearner?.id ?? user.email ?? user.id ?? 'guest';

  return { identity, activeId };
}

function resolveResolvedPrivateEntries(
    hasResolvedLive: boolean, 
    privateEntries: KangurDuelLobbyEntry[], 
    persisted: KangurDuelLobbyEntry[] | null
): KangurDuelLobbyEntry[] {
    return hasResolvedLive ? privateEntries : persisted ?? privateEntries;
}

export const useKangurMobileHomeDuelsInvites = ({
  enabled = true,
}: UseKangurMobileHomeDuelsInvitesOptions = {}): UseKangurMobileHomeDuelsInvitesResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient, storage } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { identity: learnerIdentity, activeId: activeLearnerId } = resolveLearnerContext(session);
  
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isQueryEnabled = enabled && isAuthenticated;
  const isDeferred = isAuthenticated && !isRestoringAuth && !isQueryEnabled;

  const persistedPrivateEntries = useMemo(
    () => isAuthenticated ? resolvePersistedKangurMobileHomeDuelInvites({ learnerIdentity, storage }) : null,
    [isAuthenticated, learnerIdentity, storage],
  );

  const invitesQuery = useQuery({
    enabled: isQueryEnabled,
    queryKey: buildKangurMobileHomeDuelLobbyQueryKey(apiBaseUrl, learnerIdentity, 'private'),
    queryFn: async () => apiClient.listDuelLobby({ limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT, visibility: 'private' }, { cache: 'no-store' }),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 10_000,
  });

  const privateEntries = useMemo(
    () => (invitesQuery.data?.entries ?? [])
        .filter((entry) => entry.visibility === 'private')
        .sort((l, r) => Date.parse(r.updatedAt) - Date.parse(l.updatedAt))
        .slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT),
    [invitesQuery.data?.entries],
  );
  
  const hasResolvedLive = isQueryEnabled && !invitesQuery.isLoading && !invitesQuery.error && invitesQuery.data !== undefined;
  const resolvedPrivateEntries = resolveResolvedPrivateEntries(hasResolvedLive, privateEntries, persistedPrivateEntries);

  useEffect(() => {
    if (hasResolvedLive) {
      persistKangurMobileHomeDuelInvites({ entries: privateEntries, learnerIdentity, storage });
    }
  }, [hasResolvedLive, learnerIdentity, privateEntries, storage]);

  const invites = useMemo(
    () => resolvedPrivateEntries.filter((e) => e.host.learnerId !== activeLearnerId).slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
    [activeLearnerId, resolvedPrivateEntries],
  );
  const outgoingChallenges = useMemo(
    () => resolvedPrivateEntries.filter((e) => e.host.learnerId === activeLearnerId).slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
    [activeLearnerId, resolvedPrivateEntries],
  );

  return {
    error: resolveMobileDuelErrorMessage({
      error: invitesQuery.error,
      copy,
      fallback: { de: 'Die Duelleinladungen konnten nicht geladen werden.', en: 'Could not load duel invites.', pl: 'Nie udało się pobrać zaproszeń do pojedynków.' },
      unauthorized: { de: 'Melde dich an, um private Duelleinladungen zu laden.', en: 'Sign in to load private duel invites.', pl: 'Zaloguj się, aby pobrać prywatne zaproszenia do pojedynków.' },
    }),
    invites,
    isDeferred,
    isAuthenticated,
    isLoading: isRestoringAuth || (isQueryEnabled && invitesQuery.isLoading),
    outgoingChallenges,
    isRestoringAuth,
    refresh: async () => { if (isQueryEnabled) await invitesQuery.refetch(); },
  };
};
