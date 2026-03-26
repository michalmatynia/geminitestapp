'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
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

export const useKangurLearnerActivityStatus = (
  options: UseKangurLearnerActivityStatusOptions = {}
): UseKangurLearnerActivityStatusResult => {
  const enabled = options.enabled ?? true;
  const deferInitialRefreshMs = Math.max(0, options.deferInitialRefreshMs ?? 0);
  const learnerId = options.learnerId ?? null;
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const streamEnabled = options.streamEnabled ?? true;
  const statusCacheMaxAgeMs = Math.max(1_000, refreshIntervalMs);
  const initialCachedStatus = readCachedKangurLearnerActivityStatus(
    learnerId,
    statusCacheMaxAgeMs
  );
  const [status, setStatus] = useState<KangurLearnerActivityStatus | null>(initialCachedStatus);
  const [isLoading, setIsLoading] = useState(enabled && initialCachedStatus === null);
  const [error, setError] = useState<string | null>(null);
  const [isDeferredReady, setIsDeferredReady] = useState(deferInitialRefreshMs === 0);
  const statusRef = useRef<KangurLearnerActivityStatus | null>(initialCachedStatus);
  const isActive = enabled && Boolean(learnerId) && isDeferredReady;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  const refresh = useCallback(async (): Promise<void> => {
    if (!isActive || !learnerId) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!kangurPlatform.learnerActivity) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (statusRef.current === null) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const nextStatus = await withKangurClientError(
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
      if (nextStatus) {
        writeCachedKangurLearnerActivityStatus(learnerId, nextStatus);
        setStatus(nextStatus);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isActive, learnerId]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const cachedStatus = readCachedKangurLearnerActivityStatus(learnerId, statusCacheMaxAgeMs);
    if (cachedStatus) {
      setStatus(cachedStatus);
      setError(null);
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [isActive, learnerId, refresh, statusCacheMaxAgeMs]);

  useEffect(() => {
    if (!enabled || !learnerId) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cachedStatus = readCachedKangurLearnerActivityStatus(learnerId, statusCacheMaxAgeMs);
    if (cachedStatus) {
      setStatus(cachedStatus);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isDeferredReady) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setStatus(null);
    setError(null);
    setIsLoading(true);
  }, [enabled, isDeferredReady, learnerId, statusCacheMaxAgeMs]);

  useInterval(
    () => {
      void refresh();
    },
    isActive && learnerId && typeof window !== 'undefined' && refreshIntervalMs > 0
      ? refreshIntervalMs
      : null
  );

  useEffect(() => {
    if (!isActive || !learnerId || typeof window === 'undefined') {
      return;
    }

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        const cachedStatus = readCachedKangurLearnerActivityStatus(learnerId, statusCacheMaxAgeMs);
        if (cachedStatus) {
          setStatus(cachedStatus);
          setError(null);
          setIsLoading(false);
          return;
        }

        void refresh();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isActive, learnerId, refresh, statusCacheMaxAgeMs]);

  useEffect(() => {
    if (
      !isActive ||
      !learnerId ||
      !streamEnabled ||
      !ENABLE_LEARNER_ACTIVITY_SSE ||
      typeof window === 'undefined' ||
      typeof EventSource === 'undefined'
    ) {
      return;
    }

    const streamUrl = `/api/kangur/learner-activity/stream?learnerId=${encodeURIComponent(
      learnerId
    )}`;

    const source = withKangurClientErrorSync(
      {
        source: 'kangur.hooks.useKangurLearnerActivityStatus',
        action: 'open-stream',
        description: 'Opens the learner activity SSE stream.',
        context: { streamUrl },
      },
      () => new EventSource(streamUrl),
      { fallback: null }
    );
    if (!source) {
      return;
    }
    const closeStream = (): void => {
      source.close();
    };

    source.onmessage = (event: MessageEvent<string>): void => {
      const payload = withKangurClientErrorSync(
        {
          source: 'kangur.hooks.useKangurLearnerActivityStatus',
          action: 'parse-stream',
          description: 'Parses learner activity SSE payloads.',
        },
        () => JSON.parse(event.data) as { type?: string; data?: unknown },
        { fallback: null }
      );
      if (!payload) {
        return;
      }
      if (payload.type === 'heartbeat' || payload.type === 'ready') {
        return;
      }
      if (payload.type === 'fallback') {
        closeStream();
        return;
      }
      if (payload.type === 'snapshot') {
        const parsed = kangurLearnerActivityStatusSchema.safeParse(payload.data);
        if (parsed.success) {
          writeCachedKangurLearnerActivityStatus(learnerId, parsed.data);
          setStatus(parsed.data);
          setError(null);
          setIsLoading(false);
        }
      }
    };

    source.onerror = () => {
      closeStream();
    };

    return () => {
      closeStream();
    };
  }, [isActive, learnerId, streamEnabled]);

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
