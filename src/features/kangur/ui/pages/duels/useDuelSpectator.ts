import { useEffect, useRef, useState } from 'react';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurDuelSpectatorStateResponse,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  DUEL_SPECTATOR_POLL_INTERVAL_MS,
} from './constants';

const kangurPlatform = getKangurPlatform();

export type DuelSpectatorOptions = {
  spectateSessionId: string | null;
  isOnline: boolean;
  isPageActive: boolean;
  isInSession: boolean;
  resolveSpectatorId: () => string;
};

export function useDuelSpectator(options: DuelSpectatorOptions) {
  const {
    spectateSessionId,
    isOnline,
    isPageActive,
    isInSession,
    resolveSpectatorId,
  } = options;

  const [spectatorState, setSpectatorState] = useState<KangurDuelSpectatorStateResponse | null>(
    null
  );
  const [spectatorError, setSpectatorError] = useState<string | null>(null);
  const [isSpectatorLoading, setIsSpectatorLoading] = useState(false);

  const spectatorAbortRef = useRef<AbortController | null>(null);
  const spectatorPollingRef = useRef(false);
  const spectatorIdRef = useRef<string | null>(null);

  const abortSpectatorRequest = (): void => {
    spectatorAbortRef.current?.abort();
    spectatorAbortRef.current = null;
    spectatorPollingRef.current = false;
  };

  useEffect(() => {
    if (!spectateSessionId || isInSession) {
      abortSpectatorRequest();
      setSpectatorState(null);
      setSpectatorError(null);
      setIsSpectatorLoading(false);
      return;
    }
    
    if (!isOnline || !isPageActive || typeof window === 'undefined') {
      abortSpectatorRequest();
      setIsSpectatorLoading(false);
      return;
    }

    if (!spectatorIdRef.current) {
      spectatorIdRef.current = resolveSpectatorId();
    }

    const fetchSpectatorState = async (showLoading = false): Promise<void> => {
      if (spectatorPollingRef.current) return;
      
      abortSpectatorRequest();
      const controller = new AbortController();
      spectatorAbortRef.current = controller;
      spectatorPollingRef.current = true;
      
      if (showLoading) setIsSpectatorLoading(true);
      setSpectatorError(null);

      await withKangurClientError(
        {
          source: 'kangur-duels-spectator',
          action: 'spectate',
          description: 'Fetch duel spectator state.',
          context: { sessionId: spectateSessionId },
        },
        async () => {
          const response = await kangurPlatform.duels.spectate(spectateSessionId, {
            spectatorId: spectatorIdRef.current ?? undefined,
            signal: controller.signal,
          });
          setSpectatorState(response);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) return;
            setSpectatorError('Nie udało się pobrać podglądu pojedynku.');
          },
        }
      );

      if (spectatorAbortRef.current === controller) {
        spectatorAbortRef.current = null;
        spectatorPollingRef.current = false;
        if (showLoading) setIsSpectatorLoading(false);
      }
    };

    void fetchSpectatorState(true);
    const intervalId = safeSetInterval(() => {
      void fetchSpectatorState();
    }, DUEL_SPECTATOR_POLL_INTERVAL_MS);

    return () => {
      safeClearInterval(intervalId);
      abortSpectatorRequest();
    };
  }, [isInSession, isOnline, isPageActive, resolveSpectatorId, spectateSessionId]);

  return {
    spectatorState,
    spectatorError,
    isSpectatorLoading,
  };
}
