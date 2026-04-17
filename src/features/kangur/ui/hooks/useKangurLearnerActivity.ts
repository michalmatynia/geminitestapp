'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { resolveKangurClientEndpoint } from '@/features/kangur/services/resolve-kangur-client-endpoint';
import type {
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
} from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { recordKangurOpenedTask } from '@/features/kangur/ui/services/progress';
import { kangurLearnerActivityStatusSchema } from '@/features/kangur/shared/contracts/kangur';
import { useKangurOptionalSubjectKey } from '@/features/kangur/ui/hooks/useKangurOptionalSubjectKey';

const kangurPlatform = getKangurPlatform();
const DEFAULT_PING_INTERVAL_MS = 45_000;
const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const LEARNER_ACTIVITY_PING_DEDUPE_MS = 5_000;
const ENABLE_LEARNER_ACTIVITY_SSE =
  process.env['NEXT_PUBLIC_KANGUR_LEARNER_ACTIVITY_SSE'] !== 'false';

type KangurLearnerActivityStatusCacheEntry = {
  cachedAt: number;
  status: KangurLearnerActivityStatus;
};

const learnerActivityStatusCache = new Map<string, KangurLearnerActivityStatusCacheEntry>();

const cloneKangurLearnerActivityStatus = (
  status: KangurLearnerActivityStatus
): KangurLearnerActivityStatus => ({
  ...status,
  snapshot: status.snapshot ? { ...status.snapshot } : null,
});

const readCachedKangurLearnerActivityStatus = (
  learnerId: string | null,
  maxAgeMs: number
): KangurLearnerActivityStatus | null => {
  if (!learnerId) {
    return null;
  }

  const cachedEntry = learnerActivityStatusCache.get(learnerId);
  if (!cachedEntry) {
    return null;
  }

  if (Date.now() - cachedEntry.cachedAt >= maxAgeMs) {
    learnerActivityStatusCache.delete(learnerId);
    return null;
  }

  return cloneKangurLearnerActivityStatus(cachedEntry.status);
};

const writeCachedKangurLearnerActivityStatus = (
  learnerId: string,
  status: KangurLearnerActivityStatus
): void => {
  learnerActivityStatusCache.set(learnerId, {
    cachedAt: Date.now(),
    status: cloneKangurLearnerActivityStatus(status),
  });
};

export const resetKangurLearnerActivityStatusCacheForTests = (): void => {
  learnerActivityStatusCache.clear();
};

type UseKangurLearnerActivityStatusOptions = {
  deferInitialRefreshMs?: number;
  enabled?: boolean;
  learnerId?: string | null;
  refreshIntervalMs?: number;
  streamEnabled?: boolean;
};

type UseKangurLearnerActivityStatusResult = {
  status: KangurLearnerActivityStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type KangurLearnerActivityStateControllers = {
  setError: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<KangurLearnerActivityStatus | null>>;
};

const resolveKangurLearnerActivityEnabled = (
  options: UseKangurLearnerActivityStatusOptions
): boolean => options.enabled ?? true;

const resolveKangurLearnerActivityDeferInitialRefreshMs = (
  options: UseKangurLearnerActivityStatusOptions
): number => Math.max(0, options.deferInitialRefreshMs ?? 0);

const resolveKangurLearnerActivityLearnerId = (
  options: UseKangurLearnerActivityStatusOptions
): string | null => options.learnerId ?? null;

const resolveKangurLearnerActivityRefreshIntervalMs = (
  options: UseKangurLearnerActivityStatusOptions
): number => options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;

const resolveKangurLearnerActivityStreamEnabled = (
  options: UseKangurLearnerActivityStatusOptions
): boolean => options.streamEnabled ?? true;

const resolveKangurLearnerActivityStatusCacheMaxAgeMs = (
  refreshIntervalMs: number
): number => Math.max(1_000, refreshIntervalMs);

const resolveKangurLearnerActivityIsActive = ({
  enabled,
  isDeferredReady,
  learnerId,
}: {
  enabled: boolean;
  isDeferredReady: boolean;
  learnerId: string | null;
}): boolean => enabled && Boolean(learnerId) && isDeferredReady;

const resolveKangurLearnerActivityCanUseEventStream = ({
  isActive,
  learnerId,
  streamEnabled,
}: {
  isActive: boolean;
  learnerId: string | null;
  streamEnabled: boolean;
}): boolean =>
  isActive &&
  Boolean(learnerId) &&
  streamEnabled &&
  ENABLE_LEARNER_ACTIVITY_SSE &&
  typeof window !== 'undefined' &&
  typeof EventSource !== 'undefined';

const resolveKangurLearnerActivityPollInterval = ({
  isActive,
  isStreamActive,
  learnerId,
  refreshIntervalMs,
}: {
  isActive: boolean;
  isStreamActive: boolean;
  learnerId: string | null;
  refreshIntervalMs: number;
}): number | null =>
  isActive &&
  Boolean(learnerId) &&
  typeof window !== 'undefined' &&
  refreshIntervalMs > 0 &&
  !isStreamActive
    ? refreshIntervalMs
    : null;

const clearKangurLearnerActivityState = ({
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers): void => {
  setStatus(null);
  setError(null);
  setIsLoading(false);
};

const applyCachedKangurLearnerActivityState = ({
  cachedStatus,
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers & {
  cachedStatus: KangurLearnerActivityStatus;
}): void => {
  setStatus(cachedStatus);
  setError(null);
  setIsLoading(false);
};

const markPendingKangurLearnerActivityState = ({
  setError,
  setIsLoading,
  setStatus,
}: KangurLearnerActivityStateControllers): void => {
  setStatus(null);
  setError(null);
  setIsLoading(true);
};

const prepareKangurLearnerActivityRefresh = ({
  currentStatus,
  setError,
  setIsLoading,
}: Pick<KangurLearnerActivityStateControllers, 'setError' | 'setIsLoading'> & {
  currentStatus: KangurLearnerActivityStatus | null;
}): void => {
  if (currentStatus === null) {
    setIsLoading(true);
  }
  setError(null);
};

const readFreshKangurLearnerActivityStatus = (
  learnerId: string | null,
  statusCacheMaxAgeMs: number
): KangurLearnerActivityStatus | null =>
  readCachedKangurLearnerActivityStatus(learnerId, statusCacheMaxAgeMs);

const syncCachedKangurLearnerActivityState = ({
  learnerId,
  setError,
  setIsLoading,
  setStatus,
  statusCacheMaxAgeMs,
}: KangurLearnerActivityStateControllers & {
  learnerId: string | null;
  statusCacheMaxAgeMs: number;
}): boolean => {
  const cachedStatus = readFreshKangurLearnerActivityStatus(learnerId, statusCacheMaxAgeMs);
  if (!cachedStatus) {
    return false;
  }
  applyCachedKangurLearnerActivityState({
    cachedStatus,
    setError,
    setIsLoading,
    setStatus,
  });
  return true;
};

const canRefreshKangurLearnerActivityStatus = ({
  isActive,
  learnerId,
}: {
  isActive: boolean;
  learnerId: string | null;
}): boolean => isActive && Boolean(learnerId) && Boolean(kangurPlatform.learnerActivity);

const readKangurLearnerActivityStatusFromApi = async ({
  learnerId,
  setError,
  setStatus,
}: Pick<KangurLearnerActivityStateControllers, 'setError' | 'setStatus'> & {
  learnerId: string;
}): Promise<KangurLearnerActivityStatus | null> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurLearnerActivityStatus',
      action: 'refresh',
      description: 'Loads learner activity status from the Kangur API.',
      context: { learnerId },
    }),
    async () => await kangurPlatform.learnerActivity.get(),
    {
      fallback: null,
      onError: (error) => {
        if (isKangurAuthStatusError(error)) {
          setStatus(null);
          setError(null);
          return;
        }
        setError('Nie udało się sprawdzić aktywności ucznia.');
      },
    }
  );

const applyRefreshedKangurLearnerActivityStatus = ({
  learnerId,
  nextStatus,
  setStatus,
}: Pick<KangurLearnerActivityStateControllers, 'setStatus'> & {
  learnerId: string;
  nextStatus: KangurLearnerActivityStatus | null;
}): void => {
  if (!nextStatus) {
    return;
  }
  writeCachedKangurLearnerActivityStatus(learnerId, nextStatus);
  setStatus(nextStatus);
};

const resolveKangurLearnerActivityStreamUrl = (learnerId: string): string =>
  `${resolveKangurClientEndpoint('/api/kangur/learner-activity/stream')}?learnerId=${encodeURIComponent(learnerId)}`;

const openKangurLearnerActivityStream = (streamUrl: string): EventSource | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLearnerActivityStatus',
      action: 'open-stream',
      description: 'Opens the learner activity SSE stream.',
      context: { streamUrl },
    },
    () => new EventSource(streamUrl),
    { fallback: null }
  );

const parseKangurLearnerActivityStreamPayload = (
  event: MessageEvent<string>
): { type?: string; data?: unknown } | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLearnerActivityStatus',
      action: 'parse-stream',
      description: 'Parses learner activity SSE payloads.',
    },
    () => JSON.parse(event.data) as { type?: string; data?: unknown },
    { fallback: null }
  );

const useKangurLearnerActivityDeferredReady = ({
  deferInitialRefreshMs,
  enabled,
  learnerId,
}: {
  deferInitialRefreshMs: number;
  enabled: boolean;
  learnerId: string | null;
}): boolean => {
  const [isDeferredReady, setIsDeferredReady] = useState(deferInitialRefreshMs === 0);

  useEffect(() => {
    if (!enabled || !learnerId) {
      setIsDeferredReady(deferInitialRefreshMs === 0);
      return;
    }
    if (deferInitialRefreshMs === 0) {
      setIsDeferredReady(true);
      return;
    }

    setIsDeferredReady(false);
    const timeoutId = window.setTimeout(() => {
      setIsDeferredReady(true);
    }, deferInitialRefreshMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deferInitialRefreshMs, enabled, learnerId]);

  return isDeferredReady;
};

const useKangurLearnerActivityStatusRef = (
  status: KangurLearnerActivityStatus | null
): MutableRefObject<KangurLearnerActivityStatus | null> => {
  const statusRef = useRef<KangurLearnerActivityStatus | null>(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  return statusRef;
};

const useKangurLearnerActivityStatusRefresh = ({
  isActive,
  learnerId,
  setError,
  setIsLoading,
  setStatus,
  statusRef,
}: KangurLearnerActivityStateControllers & {
  isActive: boolean;
  learnerId: string | null;
  statusRef: MutableRefObject<KangurLearnerActivityStatus | null>;
}): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    if (!canRefreshKangurLearnerActivityStatus({ isActive, learnerId })) {
      clearKangurLearnerActivityState({
        setError,
        setIsLoading,
        setStatus,
      });
      return;
    }

    prepareKangurLearnerActivityRefresh({
      currentStatus: statusRef.current,
      setError,
      setIsLoading,
    });

    try {
      const nextStatus = await readKangurLearnerActivityStatusFromApi({
        learnerId: learnerId ?? '',
        setError,
        setStatus,
      });
      applyRefreshedKangurLearnerActivityStatus({
        learnerId: learnerId ?? '',
        nextStatus,
        setStatus,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isActive, learnerId, setError, setIsLoading, setStatus, statusRef]);

const useKangurLearnerActivityInitialRefresh = ({
  canUseEventStream,
  isActive,
  learnerId,
  refresh,
  setError,
  setIsLoading,
  setStatus,
  statusCacheMaxAgeMs,
}: KangurLearnerActivityStateControllers & {
  canUseEventStream: boolean;
  isActive: boolean;
  learnerId: string | null;
  refresh: () => Promise<void>;
  statusCacheMaxAgeMs: number;
}): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (
      syncCachedKangurLearnerActivityState({
        learnerId,
        setError,
        setIsLoading,
        setStatus,
        statusCacheMaxAgeMs,
      })
    ) {
      return;
    }
    if (canUseEventStream) {
      markPendingKangurLearnerActivityState({
        setError,
        setIsLoading,
        setStatus,
      });
      return;
    }
    void refresh();
  }, [
    canUseEventStream,
    isActive,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  ]);
};

const useKangurLearnerActivityAvailabilityState = ({
  canUseEventStream,
  enabled,
  isDeferredReady,
  learnerId,
  setError,
  setIsLoading,
  setStatus,
  statusCacheMaxAgeMs,
}: KangurLearnerActivityStateControllers & {
  canUseEventStream: boolean;
  enabled: boolean;
  isDeferredReady: boolean;
  learnerId: string | null;
  statusCacheMaxAgeMs: number;
}): void => {
  useEffect(() => {
    if (!enabled || !learnerId) {
      clearKangurLearnerActivityState({
        setError,
        setIsLoading,
        setStatus,
      });
      return;
    }
    if (
      syncCachedKangurLearnerActivityState({
        learnerId,
        setError,
        setIsLoading,
        setStatus,
        statusCacheMaxAgeMs,
      })
    ) {
      return;
    }
    if (!isDeferredReady) {
      clearKangurLearnerActivityState({
        setError,
        setIsLoading,
        setStatus,
      });
      return;
    }
    if (canUseEventStream) {
      markPendingKangurLearnerActivityState({
        setError,
        setIsLoading,
        setStatus,
      });
      return;
    }
    markPendingKangurLearnerActivityState({
      setError,
      setIsLoading,
      setStatus,
    });
  }, [
    canUseEventStream,
    enabled,
    isDeferredReady,
    learnerId,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  ]);
};

const useKangurLearnerActivityVisibilityRefresh = ({
  isActive,
  isStreamActive,
  learnerId,
  refresh,
  setError,
  setIsLoading,
  setStatus,
  statusCacheMaxAgeMs,
}: KangurLearnerActivityStateControllers & {
  isActive: boolean;
  isStreamActive: boolean;
  learnerId: string | null;
  refresh: () => Promise<void>;
  statusCacheMaxAgeMs: number;
}): void => {
  useEffect(() => {
    if (!isActive || !learnerId || typeof window === 'undefined' || isStreamActive) {
      return;
    }

    const handleVisibility = (): void => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (
        syncCachedKangurLearnerActivityState({
          learnerId,
          setError,
          setIsLoading,
          setStatus,
          statusCacheMaxAgeMs,
        })
      ) {
        return;
      }
      void refresh();
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    isActive,
    isStreamActive,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  ]);
};

const useKangurLearnerActivityEventStream = ({
  canUseEventStream,
  learnerId,
  refresh,
  setError,
  setIsLoading,
  setIsStreamActive,
  setStatus,
  statusRef,
}: KangurLearnerActivityStateControllers & {
  canUseEventStream: boolean;
  learnerId: string | null;
  refresh: () => Promise<void>;
  setIsStreamActive: Dispatch<SetStateAction<boolean>>;
  statusRef: MutableRefObject<KangurLearnerActivityStatus | null>;
}): void => {
  useEffect(() => {
    if (!canUseEventStream || !learnerId) {
      setIsStreamActive(false);
      return;
    }

    const source = openKangurLearnerActivityStream(
      resolveKangurLearnerActivityStreamUrl(learnerId)
    );
    if (!source) {
      setIsStreamActive(false);
      if (statusRef.current === null) {
        void refresh();
      }
      return;
    }

    setIsStreamActive(true);
    const closeStream = (): void => {
      source.close();
    };

    source.onmessage = (event: MessageEvent<string>): void => {
      const payload = parseKangurLearnerActivityStreamPayload(event);
      if (!payload || payload.type === 'heartbeat' || payload.type === 'ready') {
        return;
      }
      if (payload.type === 'fallback') {
        setIsStreamActive(false);
        closeStream();
        if (statusRef.current === null) {
          void refresh();
        }
        return;
      }
      if (payload.type !== 'snapshot') {
        return;
      }

      const parsed = kangurLearnerActivityStatusSchema.safeParse(payload.data);
      if (!parsed.success) {
        return;
      }

      writeCachedKangurLearnerActivityStatus(learnerId, parsed.data);
      setStatus(parsed.data);
      setError(null);
      setIsLoading(false);
    };

    source.onerror = (): void => {
      setIsStreamActive(false);
      closeStream();
      if (statusRef.current === null) {
        void refresh();
      }
    };

    return () => {
      closeStream();
    };
  }, [
    canUseEventStream,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setIsStreamActive,
    setStatus,
    statusRef,
  ]);
};

export const useKangurLearnerActivityStatus = (
  options: UseKangurLearnerActivityStatusOptions = {}
): UseKangurLearnerActivityStatusResult => {
  const enabled = resolveKangurLearnerActivityEnabled(options);
  const deferInitialRefreshMs = resolveKangurLearnerActivityDeferInitialRefreshMs(options);
  const learnerId = resolveKangurLearnerActivityLearnerId(options);
  const refreshIntervalMs = resolveKangurLearnerActivityRefreshIntervalMs(options);
  const streamEnabled = resolveKangurLearnerActivityStreamEnabled(options);
  const statusCacheMaxAgeMs = resolveKangurLearnerActivityStatusCacheMaxAgeMs(refreshIntervalMs);
  const initialCachedStatus = readCachedKangurLearnerActivityStatus(
    learnerId,
    statusCacheMaxAgeMs
  );
  const [status, setStatus] = useState<KangurLearnerActivityStatus | null>(initialCachedStatus);
  const [isLoading, setIsLoading] = useState(enabled && initialCachedStatus === null);
  const [error, setError] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const isDeferredReady = useKangurLearnerActivityDeferredReady({
    deferInitialRefreshMs,
    enabled,
    learnerId,
  });
  const statusRef = useKangurLearnerActivityStatusRef(status);
  const isActive = resolveKangurLearnerActivityIsActive({
    enabled,
    isDeferredReady,
    learnerId,
  });
  const canUseEventStream = resolveKangurLearnerActivityCanUseEventStream({
    isActive,
    learnerId,
    streamEnabled,
  });
  const refresh = useKangurLearnerActivityStatusRefresh({
    isActive,
    learnerId,
    setError,
    setIsLoading,
    setStatus,
    statusRef,
  });

  useKangurLearnerActivityInitialRefresh({
    canUseEventStream,
    isActive,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  });
  useKangurLearnerActivityAvailabilityState({
    canUseEventStream,
    enabled,
    isDeferredReady,
    learnerId,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  });

  useInterval(
    () => {
      void refresh();
    },
    resolveKangurLearnerActivityPollInterval({
      isActive,
      isStreamActive,
      learnerId,
      refreshIntervalMs,
    })
  );

  useKangurLearnerActivityVisibilityRefresh({
    isActive,
    isStreamActive,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setStatus,
    statusCacheMaxAgeMs,
  });
  useKangurLearnerActivityEventStream({
    canUseEventStream,
    learnerId,
    refresh,
    setError,
    setIsLoading,
    setIsStreamActive,
    setStatus,
    statusRef,
  });

  return {
    status: isActive ? status : null,
    isLoading: isActive ? isLoading : false,
    error: isActive ? error : null,
    refresh,
  };
};

type UseKangurLearnerActivityPingOptions = {
  activity: {
    kind: KangurLearnerActivityUpdateInput['kind'];
    title: string;
    href?: string | null;
  };
  enabled?: boolean;
  intervalMs?: number;
};

export const useKangurLearnerActivityPing = ({
  activity,
  enabled = true,
  intervalMs = DEFAULT_PING_INTERVAL_MS,
}: UseKangurLearnerActivityPingOptions): void => {
  const subjectKey = useKangurOptionalSubjectKey();
  const latestActivityRef = useRef<KangurLearnerActivityUpdateInput | null>(null);
  const lastRecordedKeyRef = useRef<string | null>(null);
  const lastPingKeyRef = useRef<string | null>(null);
  const lastPingAtRef = useRef<number>(0);
  const activityPayload = useMemo<KangurLearnerActivityUpdateInput | null>(() => {
    const title = activity.title?.trim();
    if (!title) {
      return null;
    }

    const href =
      activity.href?.trim() ||
      (typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '');

    if (!href) {
      return null;
    }

    return {
      kind: activity.kind,
      title,
      href,
    };
  }, [activity.href, activity.kind, activity.title]);

  useEffect(() => {
    latestActivityRef.current = activityPayload;
  }, [activityPayload]);

  useEffect(() => {
    if (!enabled || !activityPayload) {
      return;
    }

    const key = `${activityPayload.kind}::${activityPayload.href}`;
    if (lastRecordedKeyRef.current === key) {
      return;
    }

    lastRecordedKeyRef.current = key;
    recordKangurOpenedTask({
      kind: activityPayload.kind,
      title: activityPayload.title,
      href: activityPayload.href,
    }, { ownerKey: subjectKey });
  }, [activityPayload, enabled, subjectKey]);

  const ping = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (!kangurPlatform.learnerActivity) {
      return;
    }

    const payload = latestActivityRef.current;
    if (!payload) {
      return;
    }

    const now = Date.now();
    const payloadKey = `${payload.kind}::${payload.href}`;
    if (
      lastPingKeyRef.current === payloadKey &&
      now - lastPingAtRef.current < LEARNER_ACTIVITY_PING_DEDUPE_MS
    ) {
      return;
    }
    lastPingKeyRef.current = payloadKey;
    lastPingAtRef.current = now;

    await withKangurClientError(
      () => ({
        source: 'kangur.hooks.useKangurLearnerActivityPing',
        action: 'update',
        description: 'Sends learner activity heartbeat updates to the Kangur API.',
        context: { kind: payload.kind },
      }),
      async () => await kangurPlatform.learnerActivity.update(payload),
      {
        fallback: undefined,
      }
    );
  }, [enabled]);

  useEffect(() => {
    void ping();
  }, [ping]);

  useInterval(
    () => {
      void ping();
    },
    enabled && typeof window !== 'undefined' && intervalMs > 0 ? intervalMs : null
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void ping();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, ping]);
};
