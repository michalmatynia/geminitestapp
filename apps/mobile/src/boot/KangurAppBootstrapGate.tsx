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

const useMetMinimumVisibleTime = (): boolean => {
  const [hasMet, setHasMet] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHasMet(true);
    }, APP_BOOT_MIN_VISIBLE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  return hasMet;
};

const useClearedInitialInteractions = (): boolean => {
  const [hasCleared, setHasCleared] = useState(false);

  useEffect(() => {
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const markReady = (): void => {
      if (fallbackTimeoutId !== null) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
      setHasCleared(true);
    };

    const task = InteractionManager.runAfterInteractions(markReady);
    fallbackTimeoutId = setTimeout(markReady, APP_BOOT_INTERACTION_FALLBACK_TIMEOUT_MS);

    return () => {
      if (fallbackTimeoutId !== null) {
        clearTimeout(fallbackTimeoutId);
      }
      task.cancel();
    };
  }, []);

  return hasCleared;
};

const useForcedDismiss = (): boolean => {
  const [hasForced, setHasForced] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHasForced(true);
    }, APP_BOOT_FAIL_OPEN_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  return hasForced;
};

export function KangurAppBootstrapGate({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { isBootLoading } = useKangurAppStartup();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const hasMetMinimumVisibleTime = useMetMinimumVisibleTime();
  const hasClearedInitialInteractions = useClearedInitialInteractions();
  const hasForcedDismiss = useForcedDismiss();
  const hasDismissedRef = useRef(false);
  const hasConsumedInitialRouteBootstrapBypassRef = useRef(false);
  const hasExpiredInitialRouteBootstrapBypassRef = useRef(false);

  const bootstrapContextValue = useMemo(
    () => ({
      consumeInitialRouteBootstrapBypass: () => {
        if (hasConsumedInitialRouteBootstrapBypassRef.current || hasExpiredInitialRouteBootstrapBypassRef.current) {
          return false;
        }
        hasConsumedInitialRouteBootstrapBypassRef.current = true;
        return true;
      },
    }),
    [],
  );

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
  }, [hasClearedInitialInteractions, hasForcedDismiss, hasMetMinimumVisibleTime, isBootLoading]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    hasExpiredInitialRouteBootstrapBypassRef.current = true;
  }, [isBootstrapping]);

  return (
    <KangurAppBootstrapProvider value={bootstrapContextValue}>
      {isBootstrapping ? <KangurAppBootScreen /> : children}
    </KangurAppBootstrapProvider>
  );
}
