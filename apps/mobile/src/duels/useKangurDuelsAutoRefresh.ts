import { useEffect } from 'react';
import { AUTO_REFRESH_INTERVAL_MS } from './utils/duels-ui';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';

export function useKangurDuelsAutoRefresh(
  lobby: UseKangurMobileDuelsLobbyResult,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleLobbyRefresh = (): void => {
      void lobby.refresh();
    };

    handleLobbyRefresh();
    const intervalId = safeSetInterval(handleLobbyRefresh, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      safeClearInterval(intervalId);
    };
  }, [enabled, lobby.refresh]);
}
