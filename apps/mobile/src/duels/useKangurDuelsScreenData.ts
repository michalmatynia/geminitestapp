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
import { useKangurDuelsLobbyActions } from './useKangurDuelsLobbyActions';
import { useKangurDuelsSessionActions } from './useKangurDuelsSessionActions';
import { useKangurDuelsAutoRefresh } from './useKangurDuelsAutoRefresh';
import { useKangurDuelsRouteJoin } from './useKangurDuelsRouteJoin';
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
  lobbyActions: ReturnType<typeof useKangurDuelsLobbyActions>;
  sessionActions: ReturnType<typeof useKangurDuelsSessionActions>;
  routeJoin: ReturnType<typeof useKangurDuelsRouteJoin>;
  joinDuelAction: (id: string) => Promise<void>;
  searchStatusLabel: string;
  searchStatusTone: KangurMobileTone;
  sessionState: UseKangurDuelsSessionStateResult;
};

function createDuelsScreenData(
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
  locale: ReturnType<typeof useKangurMobileI18n>['locale'],
  router: ReturnType<typeof useRouter>,
  auth: ReturnType<typeof useKangurMobileAuth>,
  lobby: UseKangurMobileDuelsLobbyResult,
  chat: UseKangurMobileDuelLobbyChatResult,
  duel: UseKangurMobileDuelSessionResult,
  sessionState: UseKangurDuelsSessionStateResult,
  routeSessionId: string | null,
  joinSessionId: string | null,
  isSpectatingRoute: boolean,
): KangurDuelsScreenData {
  const activeLearnerId = auth.session.user?.activeLearner?.id ?? auth.session.user?.id ?? null;
  const openSession = (id: string) => router.replace(createKangurDuelsHref({ sessionId: id }));
  const openLobby = () => router.replace(createKangurDuelsHref());
  const lobbyActions = useKangurDuelsLobbyActions(chat, copy);
  const sessionActions = useKangurDuelsSessionActions(duel, lobby, locale, copy, activeLearnerId, openSession);
  const routeJoin = useKangurDuelsRouteJoin(lobby, joinSessionId, routeSessionId, isSpectatingRoute, copy, openSession);
  const { searchStatusLabel, searchStatusTone } = useKangurDuelsSearchStatus(copy, lobby);
  const joinDuelAction = async (id: string) => {
    const next = await lobby.joinDuel(id);
    if (next) openSession(next);
  };
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

export function useKangurDuelsScreenData(): KangurDuelsScreenData {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{ join?: string; spectate?: string; sessionId?: string }>();
  const router = useRouter();
  const auth = useKangurMobileAuth();
  
  const routeSessionId = resolveSessionIdParam(params.sessionId ?? null);
  const joinSessionId = routeSessionId !== null ? null : resolveSessionIdParam(params.join ?? null);
  const isSpectatingRoute = resolveSpectateParam(params.spectate ?? null);
  
  const lobby = useKangurMobileDuelsLobby();
  const chat = useKangurMobileDuelLobbyChat();
  const duel = useKangurMobileDuelSession(routeSessionId, { spectate: isSpectatingRoute });
  const sessionState = useKangurDuelsSessionState(copy, locale, duel);

  return createDuelsScreenData(
    copy, locale, router, auth, lobby, chat, duel, sessionState,
    routeSessionId, joinSessionId, isSpectatingRoute
  );
}
