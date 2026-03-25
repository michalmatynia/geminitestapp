import { startTransition, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const HOME_SCREEN_DEFERRED_PANELS_FALLBACK_TIMEOUT_MS = 320;

const scheduleDeferredHomePanelsFrame = (callback: () => void): (() => void) => {
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

export const useHomeScreenDeferredPanels = (
  panelKey: string,
  isBlocked: boolean,
): boolean => {
  const [arePanelsReady, setArePanelsReady] = useState(false);

  useEffect(() => {
    if (isBlocked) {
      setArePanelsReady(false);
      return;
    }

    setArePanelsReady(false);

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

    const settleReadyState = (): void => {
      if (isDisposed) {
        return;
      }

      clearFallbackTimeout();
      startTransition(() => {
        setArePanelsReady(true);
      });
    };

    const scheduleSettle = (): void => {
      if (isDisposed || hasScheduledSettle) {
        return;
      }

      hasScheduledSettle = true;
      clearFallbackTimeout();
      cancelFrame = scheduleDeferredHomePanelsFrame(settleReadyState);
    };

    const interactionTask = InteractionManager.runAfterInteractions(scheduleSettle);

    fallbackTimeoutId = setTimeout(
      scheduleSettle,
      HOME_SCREEN_DEFERRED_PANELS_FALLBACK_TIMEOUT_MS,
    );

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [isBlocked, panelKey]);

  return arePanelsReady;
};
