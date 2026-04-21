import { startTransition, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

import { useKangurAppBootstrap } from './KangurAppBootstrapContext';

const scheduleRouteBootFrame = (callback: () => void): (() => void) => {
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

export const useKangurRouteBootState = ({
  bootKey,
  fallbackTimeoutMs,
}: {
  bootKey: string;
  fallbackTimeoutMs: number;
}): boolean => {
  const { consumeInitialRouteBootstrapBypass } = useKangurAppBootstrap();
  const [shouldBypassInitialRouteBootShell] = useState<boolean>(() =>
    consumeInitialRouteBootstrapBypass(),
  );
  const [isPreparingRouteView, setIsPreparingRouteView] = useState<boolean>(
    () => !shouldBypassInitialRouteBootShell,
  );

  useEffect(() => {
    let isDisposed = false;
    let hasScheduledSettle = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelFrame: () => void = () => {};
    let interactionTask: { cancel: () => void } | null = null;

    const clearFallbackTimeout = (): void => {
      if (fallbackTimeoutId !== null) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
    };
    const settlePreparingState = (): void => {
      if (!isDisposed) {
        clearFallbackTimeout();
        startTransition(() => setIsPreparingRouteView(false));
      }
    };
    const scheduleSettle = (): void => {
      if (!isDisposed && !hasScheduledSettle) {
        hasScheduledSettle = true;
        clearFallbackTimeout();
        cancelFrame = scheduleRouteBootFrame(settlePreparingState);
      }
    };

    if (!shouldBypassInitialRouteBootShell) {
      setIsPreparingRouteView(true);
      interactionTask = InteractionManager.runAfterInteractions(scheduleSettle);
      fallbackTimeoutId = setTimeout(scheduleSettle, fallbackTimeoutMs);
    }

    return () => {
      isDisposed = true;
      if (fallbackTimeoutId !== null) clearTimeout(fallbackTimeoutId);
      if (interactionTask !== null) interactionTask.cancel();
      cancelFrame();
    };
  }, [bootKey, fallbackTimeoutMs, shouldBypassInitialRouteBootShell]);

  return isPreparingRouteView;
};
