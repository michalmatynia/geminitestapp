'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
} from '@/features/kangur/shared/duels-config';
import type {
  KangurDuelLobbyEntry,
  KangurDuelLobbyPresenceEntry,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  LOBBY_POLL_INTERVAL_MS,
  LOBBY_PRESENCE_POLL_INTERVAL_MS,
} from './constants';

const kangurPlatform = getKangurPlatform();

export type DuelsLobbyOptions = {
  canBrowseLobby: boolean;
  canPlay: boolean;
  isGuest: boolean;
  isOnline: boolean;
  isPageActive: boolean;
};

const beginAbortableLobbyLoad = (input: {
  errorReset: () => void;
  loadingRef: React.MutableRefObject<AbortController | null>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  pollingRef: React.MutableRefObject<boolean>;
  showLoading: boolean;
}): AbortController => {
  if (input.loadingRef.current && input.showLoading) {
    input.loadingRef.current.abort();
  }

  const controller = new AbortController();
  input.loadingRef.current = controller;
  input.pollingRef.current = true;
  if (input.showLoading) {
    input.setIsLoading(true);
  }
  input.errorReset();
  return controller;
};

const finishAbortableLobbyLoad = (input: {
  controller: AbortController;
  loadingRef: React.MutableRefObject<AbortController | null>;
  pollingRef: React.MutableRefObject<boolean>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showLoading: boolean;
}): void => {
  if (input.loadingRef.current !== input.controller) {
    return;
  }

  input.loadingRef.current = null;
  input.pollingRef.current = false;
  if (input.showLoading) {
    input.setIsLoading(false);
  }
};

export function useDuelsLobby(options: DuelsLobbyOptions) {
  const {
    canBrowseLobby,
    canPlay,
    isGuest,
    isOnline,
    isPageActive,
  } = options;

  const [lobbyEntries, setLobbyEntries] = useState<KangurDuelLobbyEntry[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [isLobbyLoading, setIsLobbyLoading] = useState(false);
  const [lobbyPresenceEntries, setLobbyPresenceEntries] = useState<KangurDuelLobbyPresenceEntry[]>([]);
  const [lobbyPresenceError, setLobbyPresenceError] = useState<string | null>(null);
  const [isLobbyPresenceLoading, setIsLobbyPresenceLoading] = useState(false);
  const [lobbyPresenceLastUpdatedAt, setLobbyPresenceLastUpdatedAt] = useState<string | null>(null);
  const [lobbyLastUpdatedAt, setLobbyLastUpdatedAt] = useState<string | null>(null);
  const [lobbyFailureCount, setLobbyFailureCount] = useState(0);
  const [relativeNow, setRelativeNow] = useState(() => Date.now());

  const lobbyAbortRef = useRef<AbortController | null>(null);
  const lobbyPollingRef = useRef(false);
  const lobbyPresenceAbortRef = useRef<AbortController | null>(null);
  const lobbyPresencePollingRef = useRef(false);
  const lobbyRefreshQueuedRef = useRef(false);
  const lobbySeenRef = useRef<Map<string, string>>(new Map());
  const lobbyFreshRef = useRef<Map<string, number>>(new Map());
  const lastLobbyHashRef = useRef('');
  const lastLobbyPresenceHashRef = useRef('');

  const abortLobbyLoad = useCallback(() => {
    lobbyAbortRef.current?.abort();
    lobbyAbortRef.current = null;
    lobbyPollingRef.current = false;
    lobbyRefreshQueuedRef.current = false;
  }, []);

  const abortLobbyPresenceLoad = useCallback(() => {
    lobbyPresenceAbortRef.current?.abort();
    lobbyPresenceAbortRef.current = null;
    lobbyPresencePollingRef.current = false;
  }, []);

  const resetLobbyState = useCallback(
    ({ clearEntries = false }: { clearEntries?: boolean } = {}) => {
      abortLobbyLoad();
      lastLobbyHashRef.current = '';
      setLobbyError(null);
      setIsLobbyLoading(false);
      if (!clearEntries) {
        return;
      }
      lobbySeenRef.current.clear();
      lobbyFreshRef.current.clear();
      setLobbyEntries([]);
      setLobbyLastUpdatedAt(null);
      setLobbyFailureCount(0);
      setRelativeNow(Date.now());
    },
    [abortLobbyLoad]
  );

  const resetLobbyPresenceState = useCallback(
    ({ clearEntries = false }: { clearEntries?: boolean } = {}) => {
      abortLobbyPresenceLoad();
      lastLobbyPresenceHashRef.current = '';
      setLobbyPresenceError(null);
      setIsLobbyPresenceLoading(false);
      if (!clearEntries) {
        return;
      }
      setLobbyPresenceEntries([]);
      setLobbyPresenceLastUpdatedAt(null);
    },
    [abortLobbyPresenceLoad]
  );

  const handleLobbyLoadBlocker = useCallback((): boolean => {
    if (!canBrowseLobby) {
      resetLobbyState({ clearEntries: true });
      return true;
    }

    if (!isOnline) {
      abortLobbyLoad();
      setIsLobbyLoading(false);
      setLobbyError('Brak połączenia z internetem.');
      return true;
    }

    return false;
  }, [abortLobbyLoad, canBrowseLobby, isOnline, resetLobbyState]);

  const handleLobbyPresenceLoadBlocker = useCallback((): boolean => {
    if (!canBrowseLobby || !canPlay) {
      resetLobbyPresenceState({ clearEntries: true });
      return true;
    }

    if (!isOnline) {
      abortLobbyPresenceLoad();
      setIsLobbyPresenceLoading(false);
      setLobbyPresenceError('Brak połączenia z internetem.');
      return true;
    }

    return false;
  }, [abortLobbyPresenceLoad, canBrowseLobby, canPlay, isOnline, resetLobbyPresenceState]);

  const queueLobbyRefreshIfNeeded = useCallback((showLoading: boolean): boolean => {
    if (!lobbyPollingRef.current) {
      return false;
    }
    if (!showLoading) {
      lobbyRefreshQueuedRef.current = true;
      return true;
    }
    lobbyAbortRef.current?.abort();
    return false;
  }, []);

  const queueLobbyPresenceRefreshIfNeeded = useCallback((showLoading: boolean): boolean => {
    if (!lobbyPresencePollingRef.current) {
      return false;
    }
    if (!showLoading) {
      return true;
    }
    lobbyPresenceAbortRef.current?.abort();
    return false;
  }, []);

  const applyLobbyResponse = useCallback((response: { entries: KangurDuelLobbyEntry[]; serverTime?: string | null }) => {
    const nextEntries = response.entries;
    const nowMs = Date.now();
    setLobbyLastUpdatedAt(response.serverTime ?? new Date(nowMs).toISOString());
    setRelativeNow(nowMs);

    const activeIds = new Set<string>();
    nextEntries.forEach((entry) => {
      activeIds.add(entry.sessionId);
      const prevUpdatedAt = lobbySeenRef.current.get(entry.sessionId);
      if (!prevUpdatedAt || prevUpdatedAt !== entry.updatedAt) {
        lobbyFreshRef.current.set(entry.sessionId, nowMs);
      }
      lobbySeenRef.current.set(entry.sessionId, entry.updatedAt);
    });

    [...lobbySeenRef.current.keys()].forEach((sessionId) => {
      if (!activeIds.has(sessionId)) {
        lobbySeenRef.current.delete(sessionId);
        lobbyFreshRef.current.delete(sessionId);
      }
    });

    const nextHash = `${nextEntries.length}:${nextEntries
      .map((entry) => `${entry.sessionId}:${entry.updatedAt}`)
      .join('|')}`;
    if (nextHash !== lastLobbyHashRef.current) {
      lastLobbyHashRef.current = nextHash;
      setLobbyEntries(nextEntries);
    }
    setLobbyFailureCount(0);
  }, []);

  const handleLobbyLoadError = useCallback((error: unknown, controller: AbortController): void => {
    if (isAbortLikeError(error, controller.signal)) {
      return;
    }
    setLobbyError('Nie udało się pobrać lobby. Spróbuj ponownie.');
    setLobbyFailureCount((current) => Math.min(current + 1, 4));
  }, []);

  const fetchLobbyPresenceResponse = useCallback(
    async (controller: AbortController) =>
      canPlay
        ? await kangurPlatform.duels.lobbyPresencePing({
            limit: 40,
            signal: controller.signal,
          })
        : await kangurPlatform.duels.lobbyPresence({
            limit: 40,
            signal: controller.signal,
          }),
    [canPlay]
  );

  const applyLobbyPresenceResponse = useCallback(
    (response: { entries: KangurDuelLobbyPresenceEntry[]; serverTime?: string | null }) => {
      const nextEntries = response.entries;
      const nextHash = `${nextEntries.length}:${nextEntries
        .map((entry) => `${entry.learnerId}:${entry.lastSeenAt}`)
        .join('|')}`;
      if (nextHash !== lastLobbyPresenceHashRef.current) {
        lastLobbyPresenceHashRef.current = nextHash;
        setLobbyPresenceEntries(nextEntries);
      }
      setLobbyPresenceLastUpdatedAt(response.serverTime ?? new Date().toISOString());
    },
    []
  );

  const handleLobbyPresenceLoadError = useCallback(
    (error: unknown, controller: AbortController): void => {
      if (isAbortLikeError(error, controller.signal)) {
        return;
      }
      setLobbyPresenceError('Nie udało się pobrać listy uczniów.');
    },
    []
  );

  const loadLobby = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (handleLobbyLoadBlocker()) {
        return;
      }

      if (queueLobbyRefreshIfNeeded(showLoading)) {
        return;
      }

      const controller = beginAbortableLobbyLoad({
        errorReset: () => setLobbyError(null),
        loadingRef: lobbyAbortRef,
        pollingRef: lobbyPollingRef,
        setIsLoading: setIsLobbyLoading,
        showLoading,
      });
      await withKangurClientError(
        {
          source: 'kangur-duels-lobby',
          action: 'lobby-fetch',
          description: 'Fetch duels lobby entries.',
          context: {
            limit: KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
            isGuest,
          },
        },
        async () => {
          const response = await kangurPlatform.duels.lobby({
            limit: KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
            signal: controller.signal,
          });
          applyLobbyResponse(response);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => handleLobbyLoadError(err, controller),
        }
      );
      finishAbortableLobbyLoad({
        controller,
        loadingRef: lobbyAbortRef,
        pollingRef: lobbyPollingRef,
        setIsLoading: setIsLobbyLoading,
        showLoading,
      });
      if (lobbyRefreshQueuedRef.current) {
        lobbyRefreshQueuedRef.current = false;
        void loadLobby();
      }
    },
    [
      applyLobbyResponse,
      handleLobbyLoadBlocker,
      handleLobbyLoadError,
      isGuest,
      queueLobbyRefreshIfNeeded,
    ]
  );

  const loadLobbyPresence = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (handleLobbyPresenceLoadBlocker()) {
        return;
      }

      if (queueLobbyPresenceRefreshIfNeeded(showLoading)) {
        return;
      }

      const controller = beginAbortableLobbyLoad({
        errorReset: () => setLobbyPresenceError(null),
        loadingRef: lobbyPresenceAbortRef,
        pollingRef: lobbyPresencePollingRef,
        setIsLoading: setIsLobbyPresenceLoading,
        showLoading,
      });
      await withKangurClientError(
        {
          source: 'kangur-duels-lobby',
          action: 'lobby-presence',
          description: 'Fetch duels lobby presence.',
          context: {
            canPlay,
          },
        },
        async () => {
          const response = await fetchLobbyPresenceResponse(controller);
          applyLobbyPresenceResponse(response);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => handleLobbyPresenceLoadError(err, controller),
        }
      );
      finishAbortableLobbyLoad({
        controller,
        loadingRef: lobbyPresenceAbortRef,
        pollingRef: lobbyPresencePollingRef,
        setIsLoading: setIsLobbyPresenceLoading,
        showLoading,
      });
    },
    [
      applyLobbyPresenceResponse,
      canPlay,
      fetchLobbyPresenceResponse,
      handleLobbyPresenceLoadBlocker,
      handleLobbyPresenceLoadError,
      queueLobbyPresenceRefreshIfNeeded,
    ]
  );

  useEffect(() => {
    if (!canBrowseLobby) {
      resetLobbyState({ clearEntries: true });
      resetLobbyPresenceState({ clearEntries: true });
      return;
    }

    if (!isOnline || !isPageActive) {
      abortLobbyLoad();
      abortLobbyPresenceLoad();
      setIsLobbyLoading(false);
      setIsLobbyPresenceLoading(false);
      if (!isOnline) {
        setLobbyError('Brak połączenia z internetem.');
        if (canPlay) {
          setLobbyPresenceError('Brak połączenia z internetem.');
        }
      }
      return;
    }

    const intervalId = safeSetInterval(() => {
      void loadLobby();
    }, LOBBY_POLL_INTERVAL_MS);

    void loadLobby({ showLoading: true });

    const presenceIntervalId =
      canPlay
        ? safeSetInterval(() => {
            void loadLobbyPresence();
          }, LOBBY_PRESENCE_POLL_INTERVAL_MS)
        : null;

    if (canPlay) {
      void loadLobbyPresence({ showLoading: true });
    } else {
      resetLobbyPresenceState({ clearEntries: true });
    }

    return () => {
      safeClearInterval(intervalId);
      if (presenceIntervalId !== null) {
        safeClearInterval(presenceIntervalId);
      }
      abortLobbyLoad();
      abortLobbyPresenceLoad();
    };
  }, [
    abortLobbyLoad,
    abortLobbyPresenceLoad,
    canBrowseLobby,
    canPlay,
    isOnline,
    isPageActive,
    loadLobby,
    loadLobbyPresence,
    resetLobbyPresenceState,
    resetLobbyState,
  ]);

  return {
    lobbyEntries,
    lobbyError,
    isLobbyLoading,
    lobbyPresenceEntries,
    lobbyPresenceError,
    isLobbyPresenceLoading,
    lobbyPresenceLastUpdatedAt,
    lobbyLastUpdatedAt,
    lobbyFailureCount,
    relativeNow,
    loadLobby,
    loadLobbyPresence,
    lobbySeen: lobbySeenRef.current,
    lobbyFresh: lobbyFreshRef.current,
  };
}
