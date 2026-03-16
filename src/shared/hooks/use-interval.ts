'use client';

import { useEffect, useRef } from 'react';

import { safeSetInterval, safeClearInterval } from '@/shared/lib/timers';

/**
 * A custom hook that sets up an interval and clears it on unmount.
 *
 * @param callback The function to be executed at each interval.
 * @param delay The delay in milliseconds. If null, the interval is paused.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(null);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (delay !== null) {
      const id = safeSetInterval(() => {
        if (savedCallback.current) {
          savedCallback.current();
        }
      }, delay);
      return () => safeClearInterval(id);
    }
    return undefined;
  }, [delay]);
}
