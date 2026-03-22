import { startTransition, useLayoutEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const LESSONS_SCREEN_BOOT_FALLBACK_TIMEOUT_MS = 480;

const scheduleLessonsScreenFrame = (callback: () => void): (() => void) => {
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

export const useLessonsScreenBootState = (bootKey: string): boolean => {
  const [isPreparingLessonsView, setIsPreparingLessonsView] = useState(true);

  useLayoutEffect(() => {
    setIsPreparingLessonsView(true);

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
        setIsPreparingLessonsView(false);
      });
    };

    const scheduleSettle = (): void => {
      if (isDisposed || hasScheduledSettle) {
        return;
      }

      hasScheduledSettle = true;
      clearFallbackTimeout();
      cancelFrame = scheduleLessonsScreenFrame(settlePreparingState);
    };

    const interactionTask = InteractionManager.runAfterInteractions(scheduleSettle);

    // Fail open when native interactions never drain so the lesson skeleton cannot hang forever.
    fallbackTimeoutId = setTimeout(scheduleSettle, LESSONS_SCREEN_BOOT_FALLBACK_TIMEOUT_MS);

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [bootKey]);

  return isPreparingLessonsView;
};
