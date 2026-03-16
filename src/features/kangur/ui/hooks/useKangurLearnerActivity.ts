'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
} from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { recordKangurOpenedTask } from '@/features/kangur/ui/services/progress';
import { kangurLearnerActivityStatusSchema } from '@/features/kangur/shared/contracts/kangur';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';


const kangurPlatform = getKangurPlatform();
const DEFAULT_PING_INTERVAL_MS = 45_000;
const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const ENABLE_LEARNER_ACTIVITY_SSE =
  process.env['NEXT_PUBLIC_KANGUR_LEARNER_ACTIVITY_SSE'] !== 'false';

type UseKangurLearnerActivityStatusOptions = {
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
  const learnerId = options.learnerId ?? null;
  const refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const streamEnabled = options.streamEnabled ?? true;
  const [status, setStatus] = useState<KangurLearnerActivityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled || !learnerId) {
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

    setIsLoading(true);
    setError(null);

    try {
      const nextStatus = await kangurPlatform.learnerActivity.get();
      setStatus(nextStatus);
    } catch (loadError: unknown) {
      logClientError(loadError);
      if (isKangurAuthStatusError(loadError)) {
        setStatus(null);
        setError(null);
      } else {
        logKangurClientError(loadError, {
          source: 'useKangurLearnerActivityStatus',
          action: 'refresh',
        });
        setError('Nie udało się sprawdzić aktywności ucznia.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, learnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !learnerId) {
      setStatus(null);
      setError(null);
      setIsLoading(false);
    }
  }, [enabled, learnerId]);

  useInterval(
    () => {
      void refresh();
    },
    enabled && learnerId && typeof window !== 'undefined' && refreshIntervalMs > 0
      ? refreshIntervalMs
      : null
  );

  useEffect(() => {
    if (!enabled || !learnerId || typeof window === 'undefined') {
      return;
    }

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, learnerId, refresh]);

  useEffect(() => {
    if (
      !enabled ||
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

    let source: EventSource;
    try {
      source = new EventSource(streamUrl);
    } catch (error) {
      logClientError(error);
      return;
    }
    const closeStream = (): void => {
      source.close();
    };

    source.onmessage = (event: MessageEvent<string>): void => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; data?: unknown };
        if (payload?.type === 'heartbeat' || payload?.type === 'ready') {
          return;
        }
        if (payload?.type === 'fallback') {
          closeStream();
          return;
        }
        if (payload?.type === 'snapshot') {
          const parsed = kangurLearnerActivityStatusSchema.safeParse(payload.data);
          if (parsed.success) {
            setStatus(parsed.data);
            setError(null);
            setIsLoading(false);
          }
        }
      } catch (streamError: unknown) {
        logClientError(streamError);
        logKangurClientError(streamError, {
          source: 'useKangurLearnerActivityStatus',
          action: 'parse-stream',
        });
      }
    };

    source.onerror = () => {
      closeStream();
    };

    return () => {
      closeStream();
    };
  }, [enabled, learnerId, streamEnabled]);

  return {
    status: enabled ? status : null,
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : null,
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
    });
  }, [activityPayload, enabled]);

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

    try {
      await kangurPlatform.learnerActivity.update(payload);
    } catch (error: unknown) {
      logClientError(error);
      if (isKangurAuthStatusError(error)) {
        return;
      }
      logKangurClientError(error, {
        source: 'useKangurLearnerActivityPing',
        action: 'update',
        kind: payload.kind,
      });
    }
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
