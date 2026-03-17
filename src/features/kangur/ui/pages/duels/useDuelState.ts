import { useCallback, useEffect, useRef, useState } from 'react';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurDuelStateResponse,
  KangurDuelReactionType,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  DUEL_POLL_INTERVAL_MS,
  DUEL_POLL_MAX_INTERVAL_MS,
  DUEL_HEARTBEAT_INTERVAL_MS,
} from './constants';

const kangurPlatform = getKangurPlatform();

export type DuelStateOptions = {
  isGuest: boolean;
  isOnline: boolean;
  isPageActive: boolean;
};

export function useDuelState(options: DuelStateOptions) {
  const { isGuest, isOnline, isPageActive } = options;

  const [duelState, setDuelState] = useState<KangurDuelStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<
    | 'quick_match'
    | 'challenge'
    | 'private'
    | 'join'
    | 'leave'
    | 'answer'
    | 'rematch'
    | null
  >(null);
  const [isReactionSending, setIsReactionSending] = useState(false);
  const [duelFailureCount, setDuelFailureCount] = useState(0);
  const [duelRelativeNow, setDuelRelativeNow] = useState(() => Date.now());

  const duelPollingRef = useRef(false);
  const duelAbortRef = useRef<AbortController | null>(null);
  const duelHeartbeatRef = useRef(false);
  const duelHeartbeatAbortRef = useRef<AbortController | null>(null);
  const lastSessionUpdatedAtRef = useRef<string | null>(null);

  const activeSession = duelState?.session ?? null;

  const runAction = useCallback(
    async <T>(
      name: NonNullable<typeof action>,
      fn: () => Promise<T>
    ): Promise<{ response: T | null; error: unknown }> => {
      setAction(name);
      setError(null);
      try {
        const response = await fn();
        setAction(null);
        return { response, error: null };
      } catch (err) {
        void ErrorSystem.captureException(err);
        setAction(null);
        setError(
          typeof err === 'object' && err !== null && 'message' in err
            ? (err.message as string)
            : 'Wystąpił błąd. Spróbuj ponownie.'
        );
        return { response: null, error: err };
      }
    },
    []
  );

  const fetchDuelState = useCallback(async () => {
    if (!activeSession || duelPollingRef.current || !isOnline || !isPageActive) {
      return;
    }

    duelAbortRef.current?.abort();
    const controller = new AbortController();
    duelAbortRef.current = controller;
    duelPollingRef.current = true;

    await withKangurClientError(
      {
        source: 'kangur-duels-state',
        action: 'fetch-state',
        description: 'Fetch active duel state.',
        context: {
          sessionId: activeSession.id,
          isGuest,
        },
      },
      async () => {
        const response = await kangurPlatform.duels.state(activeSession.id, {
          signal: controller.signal,
        });
        
        if (response.session.updatedAt !== lastSessionUpdatedAtRef.current) {
          lastSessionUpdatedAtRef.current = response.session.updatedAt;
          setDuelState(response);
          setDuelRelativeNow(Date.now());
        }
        setDuelFailureCount(0);
      },
      {
        fallback: undefined,
        shouldReport: (err) => !isAbortLikeError(err, controller.signal),
        onError: (err) => {
          if (isAbortLikeError(err, controller.signal)) return;
          setDuelFailureCount((c) => c + 1);
        },
      }
    );

    if (duelAbortRef.current === controller) {
      duelAbortRef.current = null;
      duelPollingRef.current = false;
    }
  }, [activeSession, isGuest, isOnline, isPageActive]);

  const sendHeartbeat = useCallback(async () => {
    if (!activeSession || duelHeartbeatRef.current || !isOnline) {
      return;
    }

    duelHeartbeatAbortRef.current?.abort();
    const controller = new AbortController();
    duelHeartbeatAbortRef.current = controller;
    duelHeartbeatRef.current = true;

    try {
      await kangurPlatform.duels.heartbeat({
        sessionId: activeSession.id,
      }, {
        signal: controller.signal,
      });
    } catch (err) {
      void ErrorSystem.captureException(err);
      // Heartbeat failures are usually non-fatal, but we track them
    } finally {
      if (duelHeartbeatAbortRef.current === controller) {
        duelHeartbeatAbortRef.current = null;
        duelHeartbeatRef.current = false;
      }
    }
  }, [activeSession, isOnline]);

  const handleReaction = useCallback(
    async (type: KangurDuelReactionType) => {
      if (!activeSession || isReactionSending) return;
      
      setIsReactionSending(true);
      await withKangurClientError(
        {
          source: 'kangur-duels',
          action: 'send-reaction',
          description: 'Send a duel reaction emoji.',
          context: { sessionId: activeSession.id, type, isGuest },
        },
        async () => {
          const response = await kangurPlatform.duels.reaction({
            sessionId: activeSession.id,
            type,
          });
          setDuelState((current) => {
            if (current?.session.id !== activeSession.id) return current;
            const existing = current.session.recentReactions ?? [];
            return {
              ...current,
              session: {
                ...current.session,
                recentReactions: [...existing, response.reaction].slice(-6),
              },
            };
          });
        },
        { fallback: undefined }
      );
      setIsReactionSending(false);
    },
    [activeSession, isGuest, isReactionSending]
  );

  useEffect(() => {
    if (!activeSession || !isOnline || !isPageActive) return;

    const pollInterval = Math.min(
      DUEL_POLL_INTERVAL_MS * Math.pow(1.5, duelFailureCount),
      DUEL_POLL_MAX_INTERVAL_MS
    );

    const intervalId = safeSetInterval(() => {
      void fetchDuelState();
    }, pollInterval);

    const heartbeatId = safeSetInterval(() => {
      void sendHeartbeat();
    }, DUEL_HEARTBEAT_INTERVAL_MS);

    return () => {
      safeClearInterval(intervalId);
      safeClearInterval(heartbeatId);
    };
  }, [activeSession, duelFailureCount, fetchDuelState, isOnline, isPageActive, sendHeartbeat]);

  return {
    duelState,
    setDuelState,
    error,
    setError,
    action,
    setAction,
    isReactionSending,
    duelRelativeNow,
    runAction,
    handleReaction,
    activeSession,
  };
}
