import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurDuelsHref } from './duelsHref';
import { resolveSessionIdParam, resolveSpectateParam } from './utils/duels-ui';
import { useKangurDuelsSearchStatus } from './useKangurDuelsSearchStatus';
import { useKangurDuelsSessionState, type UseKangurDuelsSessionStateResult } from './useKangurDuelsSessionState';
import { useKangurMobileDuelLobbyChat, type UseKangurMobileDuelLobbyChatResult } from './useKangurMobileDuelLobbyChat';
import { useKangurMobileDuelSession, type UseKangurMobileDuelSessionResult } from './useKangurMobileDuelSession';
import { useKangurMobileDuelsLobby, type UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import { useKangurDuelsLobbyActions, type UseKangurDuelsLobbyActionsResult } from './useKangurDuelsLobbyActions';
import { useKangurDuelsSessionActions, type UseKangurDuelsSessionActionsResult } from './useKangurDuelsSessionActions';
import { useKangurDuelsRouteJoin, type UseKangurDuelsRouteJoinResult } from './useKangurDuelsRouteJoin';
import type { KangurMobileTone } from '../shared/KangurMobileUi';

export type KangurDuelsScreenData = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  router: ReturnType<typeof useRouter>;
  isLoadingAuth: boolean;
  signIn: () => Promise<void>;
  supportsLearnerCredentials: boolean;
  routeSessionId: string | null;
  joinSessionId: string | null;
  sessionId: string | null;
  isSpectatingRoute: boolean;
  lobby: UseKangurMobileDuelsLobbyResult;
  chat: UseKangurMobileDuelLobbyChatResult;
  duel: UseKangurMobileDuelSessionResult;
  activeLearnerId: string | null;
  openSession: (nextSessionId: string) => void;
  openLobby: () => void;
  lobbyActions: UseKangurDuelsLobbyActionsResult;
  sessionActions: UseKangurDuelsSessionActionsResult;
  routeJoin: UseKangurDuelsRouteJoinResult;
  joinDuelAction: (id: string) => Promise<void>;
  searchStatusLabel: string;
  searchStatusTone: KangurMobileTone;
  sessionState: UseKangurDuelsSessionStateResult;
};

function resolveDuelsParams(params: { join?: string; spectate?: string; sessionId?: string }): {
  routeSessionId: string | null;
  joinSessionId: string | null;
  isSpectatingRoute: boolean;
} {
  const routeSessionId = resolveSessionIdParam(params.sessionId ?? null);
  const joinSessionId = routeSessionId !== null ? null : resolveSessionIdParam(params.join ?? null);
  const isSpectatingRoute = resolveSpectateParam(params.spectate ?? null);
  return { routeSessionId, joinSessionId, isSpectatingRoute };
}

export function useKangurDuelsScreenData(): KangurDuelsScreenData {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{ join?: string; spectate?: string; sessionId?: string }>();
  const router = useRouter();
  const auth = useKangurMobileAuth();
  
  const { routeSessionId, joinSessionId, isSpectatingRoute } = resolveDuelsParams(params);
  
  const lobby = useKangurMobileDuelsLobby();
  const chat = useKangurMobileDuelLobbyChat();
  const duel = useKangurMobileDuelSession(routeSessionId, { spectate: isSpectatingRoute });
  const sessionState = useKangurDuelsSessionState(copy, locale, duel);

  const activeLearnerId = auth.session.user?.activeLearner?.id ?? auth.session.user?.id ?? null;
  const openSession = useCallback((id: string) => router.replace(createKangurDuelsHref({ sessionId: id })), [router]);
  const openLobby = useCallback(() => router.replace(createKangurDuelsHref()), [router]);
  
  const lobbyActions = useKangurDuelsLobbyActions(chat, copy);
  const sessionActions = useKangurDuelsSessionActions({
    duel,
    lobby,
    locale,
    copy,
    activeLearnerId,
    openSession,
  });
  const routeJoin = useKangurDuelsRouteJoin({
    lobby,
    joinSessionId,
    routeSessionId,
    isSpectatingRoute,
    copy,
    openSession,
  });
  const { searchStatusLabel, searchStatusTone } = useKangurDuelsSearchStatus(copy, lobby);
  
  const joinDuelAction = useCallback(async (id: string): Promise<void> => {
    const next = await lobby.joinDuel(id);
    if (next !== null) {
      openSession(next);
    }
  }, [lobby, openSession]);

  return {
    copy, locale, router,
    isLoadingAuth: auth.isLoadingAuth,
    signIn: auth.signIn,
    supportsLearnerCredentials: auth.supportsLearnerCredentials,
    routeSessionId, joinSessionId, sessionId: routeSessionId, isSpectatingRoute,
    lobby, chat, duel, activeLearnerId, openSession, openLobby,
    lobbyActions, sessionActions, routeJoin, joinDuelAction,
    searchStatusLabel, searchStatusTone, sessionState,
  };
}
