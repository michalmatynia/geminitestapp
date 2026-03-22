import { startTransition, useLayoutEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const HOME_SCREEN_BOOT_FALLBACK_TIMEOUT_MS = 480;

const scheduleHomeScreenFrame = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const frameId = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId);
      }
    };
  }

  const timeoutId = setTimeout(callback, 16);
  return () => {
    clearTimeout(timeoutId);
  };
};

export const useHomeScreenBootState = (bootKey: string): boolean => {
  const [isPreparingHomeView, setIsPreparingHomeView] = useState(true);

  useLayoutEffect(() => {
    setIsPreparingHomeView(true);

    let isDisposed = false;
    let hasScheduledSettle = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelFrame = () => {};

    const clearFallbackTimeout = (): void => {
      if (fallbackTimeoutId === null) {
        return;
      }

      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    };

    const settlePreparingState = (): void => {
      if (isDisposed) {
        return;
      }

      clearFallbackTimeout();
      startTransition(() => {
        setIsPreparingHomeView(false);
      });
    };

    const scheduleSettle = (): void => {
      if (isDisposed || hasScheduledSettle) {
        return;
      }

      hasScheduledSettle = true;
      clearFallbackTimeout();
      cancelFrame = scheduleHomeScreenFrame(settlePreparingState);
    };

    const interactionTask = InteractionManager.runAfterInteractions(scheduleSettle);

    // Fail open when native interactions never drain so the shell cannot stay mounted forever.
    fallbackTimeoutId = setTimeout(scheduleSettle, HOME_SCREEN_BOOT_FALLBACK_TIMEOUT_MS);

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [bootKey]);

  return isPreparingHomeView;
};
