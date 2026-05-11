import { useEffect, useRef } from 'react';
import { AUTO_REFRESH_INTERVAL_MS } from './utils/duels-constants';
import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';
import type { UseKangurMobileDuelsLobbyResult } from './useKangurMobileDuelsLobby';

export function useKangurDuelsAutoRefresh(
  lobby: UseKangurMobileDuelsLobbyResult,
  enabled: boolean,
): void {
  const hasPolledRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      hasPolledRef.current = false;
      return undefined;
    }

    const handleLobbyRefresh = (): void => {
      void lobby.refresh();
    };

    if (!hasPolledRef.current) {
      handleLobbyRefresh();
      hasPolledRef.current = true;
    }
    const intervalId = safeSetInterval(handleLobbyRefresh, AUTO_REFRESH_INTERVAL_MS as number);

    return () => {
      safeClearInterval(intervalId);
    };
  }, [enabled, lobby.refresh]);
}
