'use client';

import { useEffect, useState } from 'react';

const IDLE_READY_FALLBACK_TIMEOUT_MS = 1;
type IdleReadyWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export const useKangurIdleReady = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const hostWindow = window as IdleReadyWindow;

    if (
      typeof hostWindow.requestIdleCallback === 'function' &&
      typeof hostWindow.cancelIdleCallback === 'function'
    ) {
      const idleId = hostWindow.requestIdleCallback(() => {
        setReady(true);
      });

      return () => {
        hostWindow.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setReady(true);
    }, IDLE_READY_FALLBACK_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return ready;
};
