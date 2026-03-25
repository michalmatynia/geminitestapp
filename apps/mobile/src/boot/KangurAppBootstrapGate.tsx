import { startTransition, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { InteractionManager } from 'react-native';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { KangurAppBootScreen } from './KangurAppBootScreen';

const APP_BOOT_FAIL_OPEN_TIMEOUT_MS = 1_800;
const APP_BOOT_INTERACTION_FALLBACK_TIMEOUT_MS = 220;

export function KangurAppBootstrapGate({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { isLoadingAuth } = useKangurMobileAuth();
  const [isBootstrapping, setIsBootstrapping] = useState(() => isLoadingAuth);
  const hasDismissedRef = useRef(!isLoadingAuth);

  useEffect(() => {
    if (!isBootstrapping) {
      return;
    }

    const failOpenTimeoutId = setTimeout(() => {
      if (hasDismissedRef.current) {
        return;
      }

      hasDismissedRef.current = true;
      startTransition(() => {
        setIsBootstrapping(false);
      });
    }, APP_BOOT_FAIL_OPEN_TIMEOUT_MS);

    return () => {
      clearTimeout(failOpenTimeoutId);
    };
  }, [isBootstrapping]);

  useEffect(() => {
    if (hasDismissedRef.current || isLoadingAuth) {
      return;
    }

    let isDisposed = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearFallbackTimeout = (): void => {
      if (fallbackTimeoutId === null) {
        return;
      }

      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    };

    const dismissBootstrap = (): void => {
      if (isDisposed || hasDismissedRef.current) {
        return;
      }

      clearFallbackTimeout();
      hasDismissedRef.current = true;
      startTransition(() => {
        setIsBootstrapping(false);
      });
    };

    const interactionTask = InteractionManager.runAfterInteractions(
      dismissBootstrap,
    );
    fallbackTimeoutId = setTimeout(
      dismissBootstrap,
      APP_BOOT_INTERACTION_FALLBACK_TIMEOUT_MS,
    );

    return () => {
      isDisposed = true;
      clearFallbackTimeout();
      interactionTask.cancel?.();
    };
  }, [isLoadingAuth]);

  if (isBootstrapping) {
    return <KangurAppBootScreen />;
  }

  return <>{children}</>;
}
