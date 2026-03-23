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

  const loadLobby = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canBrowseLobby) {
        resetLobbyState({ clearEntries: true });
        return;
      }

      if (!isOnline) {
        abortLobbyLoad();
        setIsLobbyLoading(false);
        setLobbyError('Brak połączenia z internetem.');
        return;
      }

      if (lobbyPollingRef.current) {
        if (!showLoading) {
          lobbyRefreshQueuedRef.current = true;
          return;
        }
        lobbyAbortRef.current?.abort();
      }

      const controller = new AbortController();
      lobbyAbortRef.current = controller;
      lobbyPollingRef.current = true;
      if (showLoading) {
        setIsLobbyLoading(true);
      }
      setLobbyError(null);
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
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setLobbyError('Nie udało się pobrać lobby. Spróbuj ponownie.');
            setLobbyFailureCount((current) => Math.min(current + 1, 4));
          },
        }
      );
      if (lobbyAbortRef.current === controller) {
        lobbyAbortRef.current = null;
        lobbyPollingRef.current = false;
        if (showLoading) {
          setIsLobbyLoading(false);
        }
      }
      if (lobbyRefreshQueuedRef.current) {
        lobbyRefreshQueuedRef.current = false;
        void loadLobby();
      }
    },
    [abortLobbyLoad, canBrowseLobby, isGuest, isOnline, resetLobbyState]
  );

  const loadLobbyPresence = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canBrowseLobby || !canPlay) {
        resetLobbyPresenceState({ clearEntries: true });
        return;
      }

      if (!isOnline) {
        abortLobbyPresenceLoad();
        setIsLobbyPresenceLoading(false);
        setLobbyPresenceError('Brak połączenia z internetem.');
        return;
      }

      if (lobbyPresencePollingRef.current) {
        if (!showLoading) {
          return;
        }
        lobbyPresenceAbortRef.current?.abort();
      }

      const controller = new AbortController();
      lobbyPresenceAbortRef.current = controller;
      lobbyPresencePollingRef.current = true;
      if (showLoading) {
        setIsLobbyPresenceLoading(true);
      }
      setLobbyPresenceError(null);
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
          const response = canPlay
            ? await kangurPlatform.duels.lobbyPresencePing({
                limit: 40,
                signal: controller.signal,
              })
            : await kangurPlatform.duels.lobbyPresence({
                limit: 40,
                signal: controller.signal,
              });
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
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) {
              return;
            }
            setLobbyPresenceError('Nie udało się pobrać listy uczniów.');
          },
        }
      );
      if (lobbyPresenceAbortRef.current === controller) {
        lobbyPresenceAbortRef.current = null;
        lobbyPresencePollingRef.current = false;
        if (showLoading) {
          setIsLobbyPresenceLoading(false);
        }
      }
    },
    [abortLobbyPresenceLoad, canBrowseLobby, canPlay, isOnline, resetLobbyPresenceState]
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
