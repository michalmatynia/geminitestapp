import { useState, useRef, useEffect, useCallback } from 'react';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';
import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

export function useKangurDuelsRouteJoin(
  lobby: UseKangurMobileDuelsLobbyResult,
  joinSessionId: string | null,
  routeSessionId: string | null,
  isSpectatingRoute: boolean,
  copy: DuelCopy,
  openSession: (id: string) => void,
) {
  const [routeJoinError, setRouteJoinError] = useState<string | null>(null);
  const [isJoiningFromRoute, setIsJoiningFromRoute] = useState(false);
  const attemptedJoinSessionIdRef = useRef<string | null>(null);

  const joinSessionFromRoute = useCallback(async (): Promise<void> => {
    if (joinSessionId === null) return;

    setRouteJoinError(null);
    setIsJoiningFromRoute(true);

    try {
      const nextSessionId = await lobby.joinDuel(joinSessionId);
      if (nextSessionId !== null) {
        openSession(nextSessionId);
        return;
      }

      setRouteJoinError(
        lobby.actionError ??
          copy({
            de: 'Der Duell-Einladung konnte nicht beigetreten werden.',
            en: 'Could not join the duel invite.',
            pl: 'Nie udało się dołączyć do zaproszenia do pojedynku.',
          }),
      );
    } finally {
      setIsJoiningFromRoute(false);
    }
  }, [joinSessionId, lobby, openSession, copy]);

  useEffect(() => {
    if (joinSessionId === null || routeSessionId !== null || isSpectatingRoute) return;
    if (!lobby.isAuthenticated || lobby.isLoadingAuth) return;
    if (attemptedJoinSessionIdRef.current === joinSessionId) return;

    attemptedJoinSessionIdRef.current = joinSessionId;
    void joinSessionFromRoute();
  }, [isSpectatingRoute, joinSessionId, lobby.isAuthenticated, lobby.isLoadingAuth, routeSessionId, joinSessionFromRoute]);

  return {
    routeJoinError,
    isJoiningFromRoute,
    joinSessionFromRoute,
  };
}
