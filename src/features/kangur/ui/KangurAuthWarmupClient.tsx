'use client';

import { useEffect } from 'react';

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';

const shouldLimitKangurWarmup = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchesCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY).matches
      : false;

  if (matchesCoarsePointer) {
    return true;
  }

  const maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const prefersTouchOnlyInteraction =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY).matches
      : false;

  return maxTouchPoints > 0 && prefersTouchOnlyInteraction;
};

const scheduleKangurWarmupTask = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleCallbackId = window.requestIdleCallback(() => {
      callback();
    });

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, 1);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

export function KangurAuthWarmupClient(): null {
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'test') {
      return undefined;
    }

    const warmupAuth = (): void => {
      void import('@/features/kangur/services/kangur-auth-prefetch')
        .then((m) => m.prefetchKangurAuth())
        .catch(() => {});
    };

    if (shouldLimitKangurWarmup()) {
      return scheduleKangurWarmupTask(warmupAuth);
    }

    warmupAuth();
    return undefined;
  }, []);

  return null;
}
