import { startTransition, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

const HOME_SCREEN_DEFERRED_PANELS_FALLBACK_TIMEOUT_MS = 320;
const deferredHomePanelCallbacks = new Set<() => void>();

let deferredHomePanelsInteractionTask:
  | ReturnType<typeof InteractionManager.runAfterInteractions>
  | null = null;
let deferredHomePanelsFallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
let cancelDeferredHomePanelsFrame = () => {};
let isDeferredHomePanelsFrameScheduled = false;

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

const clearDeferredHomePanelsFallbackTimeout = (): void => {
  if (deferredHomePanelsFallbackTimeoutId === null) {
    return;
  }

  clearTimeout(deferredHomePanelsFallbackTimeoutId);
  deferredHomePanelsFallbackTimeoutId = null;
};

const clearDeferredHomePanelsSchedule = (): void => {
  clearDeferredHomePanelsFallbackTimeout();
  deferredHomePanelsInteractionTask?.cancel?.();
  deferredHomePanelsInteractionTask = null;
  cancelDeferredHomePanelsFrame();
  cancelDeferredHomePanelsFrame = () => {};
  isDeferredHomePanelsFrameScheduled = false;
};

const flushDeferredHomePanelCallbacks = (): void => {
  const callbacks = Array.from(deferredHomePanelCallbacks);
  deferredHomePanelCallbacks.clear();
  clearDeferredHomePanelsSchedule();

  if (callbacks.length === 0) {
    return;
  }

  startTransition(() => {
    for (const callback of callbacks) {
      callback();
    }
  });
};

const scheduleDeferredHomePanelsSettle = (): void => {
  if (isDeferredHomePanelsFrameScheduled) {
    return;
  }

  deferredHomePanelsInteractionTask = null;
  clearDeferredHomePanelsFallbackTimeout();
  isDeferredHomePanelsFrameScheduled = true;
  cancelDeferredHomePanelsFrame = scheduleDeferredHomePanelsFrame(
    flushDeferredHomePanelCallbacks,
  );
};

const ensureDeferredHomePanelsSchedule = (): void => {
  if (
    deferredHomePanelCallbacks.size === 0 ||
    deferredHomePanelsInteractionTask !== null ||
    deferredHomePanelsFallbackTimeoutId !== null ||
    isDeferredHomePanelsFrameScheduled
  ) {
    return;
  }

  deferredHomePanelsInteractionTask = InteractionManager.runAfterInteractions(
    scheduleDeferredHomePanelsSettle,
  );

  deferredHomePanelsFallbackTimeoutId = setTimeout(
    scheduleDeferredHomePanelsSettle,
    HOME_SCREEN_DEFERRED_PANELS_FALLBACK_TIMEOUT_MS,
  );
};

const scheduleDeferredHomePanelsCallback = (callback: () => void): (() => void) => {
  deferredHomePanelCallbacks.add(callback);
  ensureDeferredHomePanelsSchedule();

  return () => {
    deferredHomePanelCallbacks.delete(callback);

    if (deferredHomePanelCallbacks.size === 0) {
      clearDeferredHomePanelsSchedule();
    }
  };
};

export const useHomeScreenDeferredPanelSequence = <const TPanelKeys extends readonly string[]>(
  panelKeys: TPanelKeys,
  isBlocked: boolean,
): { [TIndex in keyof TPanelKeys]: boolean } => {
  const [readyCount, setReadyCount] = useState(0);
  const currentPanelKey = panelKeys[readyCount] ?? null;

  useEffect(() => {
    if (isBlocked) {
      setReadyCount(0);
      return;
    }

    if (currentPanelKey === null) {
      return;
    }

    let isDisposed = false;

    const cancelDeferredReadyState = scheduleDeferredHomePanelsCallback(() => {
      if (isDisposed) {
        return;
      }

      setReadyCount((currentReadyCount) => {
        if (currentReadyCount > readyCount) {
          return currentReadyCount;
        }

        return currentReadyCount + 1;
      });
    });

    return () => {
      isDisposed = true;
      cancelDeferredReadyState();
    };
  }, [currentPanelKey, isBlocked, readyCount]);

  return panelKeys.map((_, index) => index < readyCount) as {
    [TIndex in keyof TPanelKeys]: boolean;
  };
};

export const useHomeScreenDeferredPanelGroup = <const TPanelKeys extends readonly string[]>(
  panelKeys: TPanelKeys,
  isBlocked: boolean,
): { [TIndex in keyof TPanelKeys]: boolean } => {
  const [arePanelsReady, setArePanelsReady] = useState(false);
  const panelKeySignature = panelKeys.join('\u0000');

  useEffect(() => {
    if (isBlocked || panelKeys.length === 0) {
      setArePanelsReady(false);
      return;
    }

    setArePanelsReady(false);

    let isDisposed = false;

    const cancelDeferredReadyState = scheduleDeferredHomePanelsCallback(() => {
      if (isDisposed) {
        return;
      }

      setArePanelsReady(true);
    });

    return () => {
      isDisposed = true;
      cancelDeferredReadyState();
    };
  }, [isBlocked, panelKeySignature, panelKeys.length]);

  return panelKeys.map(() => arePanelsReady) as {
    [TIndex in keyof TPanelKeys]: boolean;
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

    const settleReadyState = (): void => {
      if (isDisposed) {
        return;
      }

      setArePanelsReady(true);
    };

    const cancelDeferredReadyState = scheduleDeferredHomePanelsCallback(
      settleReadyState,
    );

    return () => {
      isDisposed = true;
      cancelDeferredReadyState();
    };
  }, [isBlocked, panelKey]);

  return arePanelsReady;
};
