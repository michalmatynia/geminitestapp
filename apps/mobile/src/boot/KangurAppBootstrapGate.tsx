import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { InteractionManager } from 'react-native';

import { KangurAppBootstrapProvider } from './KangurAppBootstrapContext';
import { KangurAppBootScreen } from './KangurAppBootScreen';
import { useKangurAppStartup } from './useKangurAppStartup';

const APP_BOOT_FAIL_OPEN_TIMEOUT_MS = 1_800;
const APP_BOOT_MIN_VISIBLE_TIMEOUT_MS = 140;
const APP_BOOT_INTERACTION_FALLBACK_TIMEOUT_MS = 220;

export function KangurAppBootstrapGate({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { isBootLoading } = useKangurAppStartup();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasMetMinimumVisibleTime, setHasMetMinimumVisibleTime] = useState(false);
  const [hasClearedInitialInteractions, setHasClearedInitialInteractions] =
    useState(false);
  const [hasForcedDismiss, setHasForcedDismiss] = useState(false);
  const hasDismissedRef = useRef(false);
  const hasConsumedInitialRouteBootstrapBypassRef = useRef(false);
  const hasExpiredInitialRouteBootstrapBypassRef = useRef(false);
  const bootstrapContextValue = useMemo(
    () => ({
      consumeInitialRouteBootstrapBypass: () => {
        if (
          hasConsumedInitialRouteBootstrapBypassRef.current ||
          hasExpiredInitialRouteBootstrapBypassRef.current
        ) {
          return false;
        }

        hasConsumedInitialRouteBootstrapBypassRef.current = true;
        return true;
      },
    }),
    [],
  );

  useEffect(() => {
    const minimumVisibleTimeoutId = setTimeout(() => {
      setHasMetMinimumVisibleTime(true);
    }, APP_BOOT_MIN_VISIBLE_TIMEOUT_MS);

    return () => {
      clearTimeout(minimumVisibleTimeoutId);
    };
  }, []);

  useEffect(() => {
    let interactionFallbackTimeoutId: ReturnType<typeof setTimeout> | null =
      null;

    const clearInteractionFallbackTimeout = (): void => {
      if (interactionFallbackTimeoutId === null) {
        return;
      }

      clearTimeout(interactionFallbackTimeoutId);
      interactionFallbackTimeoutId = null;
    };

    const markInteractionsReady = (): void => {
      clearInteractionFallbackTimeout();
      setHasClearedInitialInteractions(true);
    };

    const interactionTask = InteractionManager.runAfterInteractions(
      markInteractionsReady,
    );
    interactionFallbackTimeoutId = setTimeout(
      markInteractionsReady,
      APP_BOOT_INTERACTION_FALLBACK_TIMEOUT_MS,
    );

    return () => {
      clearInteractionFallbackTimeout();
      interactionTask.cancel?.();
    };
  }, []);

  useEffect(() => {
    const failOpenTimeoutId = setTimeout(() => {
      setHasForcedDismiss(true);
    }, APP_BOOT_FAIL_OPEN_TIMEOUT_MS);

    return () => {
      clearTimeout(failOpenTimeoutId);
    };
  }, []);

  useEffect(() => {
    if (
      hasDismissedRef.current ||
      !hasMetMinimumVisibleTime ||
      !hasClearedInitialInteractions ||
      (!hasForcedDismiss && isBootLoading)
    ) {
      return;
    }

    hasDismissedRef.current = true;
    startTransition(() => {
      setIsBootstrapping(false);
    });
  }, [
    hasClearedInitialInteractions,
    hasForcedDismiss,
    hasMetMinimumVisibleTime,
    isBootLoading,
  ]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    hasExpiredInitialRouteBootstrapBypassRef.current = true;
  }, [isBootstrapping]);

  if (isBootstrapping) {
    return (
      <KangurAppBootstrapProvider value={bootstrapContextValue}>
        <KangurAppBootScreen />
      </KangurAppBootstrapProvider>
    );
  }

  return (
    <KangurAppBootstrapProvider value={bootstrapContextValue}>
      {children}
    </KangurAppBootstrapProvider>
  );
}
