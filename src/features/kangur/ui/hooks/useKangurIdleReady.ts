'use client';

import { useEffect, useState } from 'react';

import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';

const IDLE_READY_FALLBACK_TIMEOUT_MS = 1;
const IDLE_READY_MINIMUM_TIMEOUT_MS = 50;
type UseKangurIdleReadyOptions = {
  minimumDelayMs?: number;
};
type IdleReadyWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const resolveRemainingIdleDelay = (startAt: number, minimumDelayMs: number): number =>
  Math.max(0, minimumDelayMs - (Date.now() - startAt));

// Module-level cache: once an idle delay fires it is remembered across remounts.
// This prevents widget skeleton resets when the component tree is remounted (e.g.
// during framer-motion's div→motion.div element-type switch on first load).
const idleReadyCache = new Map<number, true>();

export const useKangurIdleReady = (options: UseKangurIdleReadyOptions = {}): boolean => {
  const minimumDelayMs =
    typeof options.minimumDelayMs === 'number' && options.minimumDelayMs > 0
      ? Math.round(options.minimumDelayMs)
      : 0;
  const [ready, setReady] = useState(() => idleReadyCache.has(minimumDelayMs));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (idleReadyCache.has(minimumDelayMs)) {
      setReady(true);
      return undefined;
    }

    const startAt = Date.now();
    const hostWindow = window as IdleReadyWindow;
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const markReady = (): void => {
      const remainingDelay = resolveRemainingIdleDelay(startAt, minimumDelayMs);
      if (remainingDelay === 0) {
        idleReadyCache.set(minimumDelayMs, true);
        setReady(true);
        return;
      }

      timeoutId = safeSetTimeout(() => {
        idleReadyCache.set(minimumDelayMs, true);
        setReady(true);
      }, remainingDelay);
    };

    if (
      typeof hostWindow.requestIdleCallback === 'function' &&
      typeof hostWindow.cancelIdleCallback === 'function'
    ) {
      // timeout bounds the maximum wait: fire when idle, but no later than minimumDelayMs.
      // Without this, a busy tab can delay the callback far beyond the expected minimum.
      const idleTimeout = Math.max(IDLE_READY_MINIMUM_TIMEOUT_MS, minimumDelayMs);
      const idleId = hostWindow.requestIdleCallback(() => {
        markReady();
      }, { timeout: idleTimeout });

      return () => {
        hostWindow.cancelIdleCallback(idleId);
        if (timeoutId !== null) {
          safeClearTimeout(timeoutId);
        }
      };
    }

    timeoutId = safeSetTimeout(markReady, Math.max(IDLE_READY_FALLBACK_TIMEOUT_MS, minimumDelayMs));
    return () => {
      if (timeoutId !== null) {
        safeClearTimeout(timeoutId);
      }
    };
  }, [minimumDelayMs]);

  return ready;
};
