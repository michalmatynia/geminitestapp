import { startTransition, useLayoutEffect, useState } from 'react';
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
  const [shouldBypassInitialRouteBootShell] = useState(() =>
    consumeInitialRouteBootstrapBypass(),
  );
  const [isPreparingRouteView, setIsPreparingRouteView] = useState(
    () => !shouldBypassInitialRouteBootShell,
  );

  useLayoutEffect(() => {
    if (shouldBypassInitialRouteBootShell) {
      return;
    }

    setIsPreparingRouteView(true);

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
        setIsPreparingRouteView(false);
      });
    };

    const scheduleSettle = (): void => {
      if (isDisposed || hasScheduledSettle) {
        return;
      }

      hasScheduledSettle = true;
      clearFallbackTimeout();
      cancelFrame = scheduleRouteBootFrame(settlePreparingState);
    };

    const interactionTask = InteractionManager.runAfterInteractions(
      scheduleSettle,
    );

    fallbackTimeoutId = setTimeout(scheduleSettle, fallbackTimeoutMs);

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
      cancelFrame();
    };
  }, [bootKey, fallbackTimeoutMs, shouldBypassInitialRouteBootShell]);

  return isPreparingRouteView;
};
