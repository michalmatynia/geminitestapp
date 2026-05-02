import type { KangurDuelLobbyPresenceEntry } from '@kangur/contracts/kangur-duels';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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
import type { DuelApiClient } from '../duels/useKangurMobileDuelsLobbyQueries';

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

function resolvePresenceContext(session: ReturnType<typeof useKangurMobileAuth>['session']): { identity: string } {
    const user = session.user;
    const identity = user?.activeLearner?.id ?? user?.email ?? user?.id ?? 'guest';
    return { identity };
}

export const useKangurMobileHomeDuelsPresence = ({
  enabled = true,
}: UseKangurMobileHomeDuelsPresenceOptions = {}): UseKangurMobileHomeDuelsPresenceResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient: rawApiClient, storage } = useKangurMobileRuntime();
  const apiClient = rawApiClient as unknown as DuelApiClient;
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const queryClient = useQueryClient();

  const { identity: learnerIdentity } = resolvePresenceContext(session);
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isQueryEnabled = enabled && isAuthenticated;

  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingLearnerId, setPendingLearnerId] = useState<string | null>(null);

  const presenceQueryKey = buildKangurMobileHomeDuelLobbyQueryKey(apiBaseUrl, learnerIdentity, 'presence');
  const persistedPresenceEntries = useMemo(
    () => isAuthenticated ? resolvePersistedKangurMobileHomeDuelPresence({ learnerIdentity, storage }) : null,
    [isAuthenticated, learnerIdentity, storage],
  );

  const presenceQuery = useQuery({
    enabled: isQueryEnabled,
    queryKey: presenceQueryKey,
    queryFn: async () => apiClient.listDuelPresence({ limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT }, { cache: 'no-store' }),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 5000,
  });

  const presenceEntries = useMemo(
    () => (presenceQuery.data?.entries ?? [])
        .sort((l, r) => (r.isIdle === l.isIdle ? Date.parse(r.lastActiveAt) - Date.parse(l.lastActiveAt) : l.isIdle ? 1 : -1))
        .slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT),
    [presenceQuery.data?.entries],
  );

  const hasResolvedLivePresence = isQueryEnabled && !presenceQuery.isLoading && !presenceQuery.error && presenceQuery.data !== undefined;
  const resolvedPresenceEntries = hasResolvedLivePresence ? presenceEntries : persistedPresenceEntries ?? presenceEntries;

  useEffect(() => {
    if (hasResolvedLivePresence) {
      persistKangurMobileHomeDuelPresence({ entries: presenceEntries, learnerIdentity, storage });
    }
  }, [hasResolvedLivePresence, learnerIdentity, presenceEntries, storage]);

  const createPrivateChallenge = async (opponentLearnerId: string): Promise<string | null> => {
    setActionError(null);
    setIsActionPending(true);
    setPendingLearnerId(opponentLearnerId);
    try {
      const resp = await apiClient.createDuelSession({ opponentLearnerId, visibility: 'private' });
      await queryClient.invalidateQueries({ queryKey: presenceQueryKey });
      return resp.session.id;
    } catch (err: unknown) {
      setActionError(resolveMobileDuelErrorMessage({ error: err, copy, fallback: { de: 'Herausforderung fehlgeschlagen.', en: 'Could not send challenge.', pl: 'Nie udało się wysłać wyzwania.' } }));
      return null;
    } finally {
      setIsActionPending(false);
      setPendingLearnerId(null);
    }
  };

  return {
    actionError,
    createPrivateChallenge,
    entries: resolvedPresenceEntries,
    error: resolveMobileDuelErrorMessage({
      error: presenceQuery.error,
      copy,
      fallback: { de: 'Lobby-Teilnehmer konnten nicht geladen werden.', en: 'Could not load lobby participants.', pl: 'Nie udało się pobrać uczestników lobby.' },
      unauthorized: { de: 'Melde dich an, um aktive Rivalen zu sehen.', en: 'Sign in to see active rivals.', pl: 'Zaloguj się, aby zobaczyć aktywnych rywali.' },
    }),
    isActionPending,
    isAuthenticated,
    isLoading: isRestoringAuth || (isQueryEnabled && presenceQuery.isLoading),
    isRestoringAuth,
    pendingLearnerId,
    refresh: async () => { if (isQueryEnabled) await presenceQuery.refetch(); },
  };
};
