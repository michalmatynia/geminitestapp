'use client';

import { useEffect, useState } from 'react';

const IDLE_READY_FALLBACK_TIMEOUT_MS = 1;
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

export const useKangurIdleReady = (options: UseKangurIdleReadyOptions = {}): boolean => {
  const [ready, setReady] = useState(false);
  const minimumDelayMs =
    typeof options.minimumDelayMs === 'number' && options.minimumDelayMs > 0
      ? Math.round(options.minimumDelayMs)
      : 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const startAt = Date.now();
    const hostWindow = window as IdleReadyWindow;
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const markReady = (): void => {
      const remainingDelay = resolveRemainingIdleDelay(startAt, minimumDelayMs);
      if (remainingDelay === 0) {
        setReady(true);
        return;
      }

      timeoutId = window.setTimeout(() => {
        setReady(true);
      }, remainingDelay);
    };

    if (
      typeof hostWindow.requestIdleCallback === 'function' &&
      typeof hostWindow.cancelIdleCallback === 'function'
    ) {
      const idleId = hostWindow.requestIdleCallback(() => {
        markReady();
      });

      return () => {
        hostWindow.cancelIdleCallback(idleId);
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    timeoutId = window.setTimeout(markReady, Math.max(IDLE_READY_FALLBACK_TIMEOUT_MS, minimumDelayMs));

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [minimumDelayMs]);

  return ready;
};
