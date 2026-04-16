'use client';

import { startTransition, useCallback, useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import {
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';
import {
  clearStoredActiveLearnerId,
  setStoredActiveLearnerId,
} from '@/features/kangur/services/kangur-active-learner';
import {
  useOptionalKangurAuth,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { clearSessionUserCache } from '@/features/kangur/services/local-kangur-platform-auth';
import {
  LOGIN_SUCCESS_NOTICE_DELAY_MS,
} from './login-constants';
import { useKangurLoginPageProps } from './login-context';

export type KangurLoginKind = 'parent' | 'student' | 'unknown';
const LOGIN_AUTH_REFRESH_TIMEOUT_MS = 12_000;
export type KangurLoginSuccessStage = 'refreshing-session' | 'redirecting';

export const resolveKangurLoginCallbackNavigation = (
  callbackUrl: string,
  currentOrigin: string
): { kind: 'router' | 'location'; href: string } | null => {
  const trimmed = callbackUrl.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return { kind: 'router', href: trimmed };
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur-login',
      action: 'resolve-callback-navigation',
      description: 'Resolve the login callback navigation target.',
      context: {
        callbackUrl,
        currentOrigin,
      },
    },
    () => {
      const parsed = new URL(trimmed, currentOrigin);
      if (parsed.origin === currentOrigin) {
        return { kind: 'router', href: `${parsed.pathname}${parsed.search}${parsed.hash}` };
      }
      return { kind: 'location', href: trimmed };
    },
    {
      fallback: null,
    }
  );
};

export type KangurLoginSuccessOptions = {
  kind: KangurLoginKind;
  learnerId?: string | null;
  callbackUrl?: string | null;
  onStageChange?: (stage: KangurLoginSuccessStage) => void;
};

const resolveCurrentPath = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const resolveKangurLoginSuccessMessage = ({
  kind,
  translations,
}: {
  kind: KangurLoginKind;
  translations: ReturnType<typeof useTranslations>;
}): string =>
  kind === 'student'
    ? translations('successStudent')
    : translations('successParent');

const syncKangurLoginSuccessLearnerState = ({
  kind,
  learnerId,
}: {
  kind: KangurLoginKind;
  learnerId?: string | null;
}): void => {
  if (kind === 'student' && learnerId) {
    setStoredActiveLearnerId(learnerId);
    return;
  }

  if (kind === 'parent') {
    clearStoredActiveLearnerId();
  }
};

const waitForKangurLoginSuccessNotice = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, LOGIN_SUCCESS_NOTICE_DELAY_MS);
  });
};

const resolveKangurLoginSuccessTarget = ({
  callbackOverride,
  callbackUrl,
  defaultCallbackUrl,
}: {
  callbackOverride?: string | null;
  callbackUrl?: string;
  defaultCallbackUrl?: string;
}): string | null => callbackOverride ?? callbackUrl ?? defaultCallbackUrl ?? null;

const resolveKangurLoginSuccessNavigationState = ({
  auth,
  currentPath,
  navigation,
  refreshedUser,
}: {
  auth: ReturnType<typeof useOptionalKangurAuth>;
  currentPath: string | null;
  navigation: ReturnType<typeof resolveKangurLoginCallbackNavigation>;
  refreshedUser: Awaited<
    ReturnType<NonNullable<NonNullable<ReturnType<typeof useOptionalKangurAuth>>['checkAppState']>>
  > | undefined;
}) => ({
  isSameRoute:
    Boolean(currentPath) &&
    navigation?.kind === 'router' &&
    navigation.href === currentPath,
  shouldForceFullReload: Boolean(auth?.checkAppState) && refreshedUser === null,
});

const performKangurLoginFallbackNavigation = ({
  currentPath,
  router,
  shouldForceFullReload,
}: {
  currentPath: string | null;
  router: ReturnType<typeof useRouter>;
  shouldForceFullReload: boolean;
}): void => {
  if (shouldForceFullReload) {
    window.location.assign(currentPath ?? window.location.href);
    return;
  }

  router.refresh();
};

const performKangurLoginRouterNavigation = ({
  currentPath,
  href,
  router,
  shouldForceFullReload,
}: {
  currentPath: string | null;
  href: string;
  router: ReturnType<typeof useRouter>;
  shouldForceFullReload: boolean;
}): void => {
  if (shouldForceFullReload) {
    window.location.assign(href);
    return;
  }

  if (currentPath && href === currentPath) {
    startTransition(() => {
      router.refresh();
    });
    return;
  }

  startTransition(() => {
    router.push(href, { scroll: false });
  });
};

const performKangurLoginSuccessNavigation = ({
  currentPath,
  navigation,
  onClose,
  router,
  shouldForceFullReload,
}: {
  currentPath: string | null;
  navigation: ReturnType<typeof resolveKangurLoginCallbackNavigation>;
  onClose?: (() => void) | null;
  router: ReturnType<typeof useRouter>;
  shouldForceFullReload: boolean;
}): void => {
  if (onClose) {
    onClose();
  }

  if (!navigation) {
    performKangurLoginFallbackNavigation({
      currentPath,
      router,
      shouldForceFullReload,
    });
    return;
  }

  if (navigation.kind === 'router') {
    performKangurLoginRouterNavigation({
      currentPath,
      href: navigation.href,
      router,
      shouldForceFullReload,
    });
    return;
  }

  window.location.assign(navigation.href);
};

export function useLoginLogic() {
  const translations = useTranslations('KangurLogin');
  const router = useRouter();
  const { defaultCallbackUrl, callbackUrl, onClose } = useKangurLoginPageProps();
  const auth = useOptionalKangurAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSuccess = useCallback(
    async ({
      kind,
      learnerId,
      callbackUrl: callbackOverride,
      onStageChange,
    }: KangurLoginSuccessOptions) => {
      setSuccessMessage(resolveKangurLoginSuccessMessage({ kind, translations }));

      clearSessionUserCache();
      syncKangurLoginSuccessLearnerState({ kind, learnerId });

      onStageChange?.('refreshing-session');
      const refreshedUser = await auth?.checkAppState?.({
        timeoutMs: LOGIN_AUTH_REFRESH_TIMEOUT_MS,
      });

      const target = resolveKangurLoginSuccessTarget({
        callbackOverride,
        callbackUrl,
        defaultCallbackUrl,
      });
      const navigation = target
        ? resolveKangurLoginCallbackNavigation(target, window.location.origin)
        : null;
      const currentPath = resolveCurrentPath();
      const { shouldForceFullReload } = resolveKangurLoginSuccessNavigationState({
        auth,
        currentPath,
        navigation,
        refreshedUser,
      });
      onStageChange?.('redirecting');

      await waitForKangurLoginSuccessNotice();
      performKangurLoginSuccessNavigation({
        currentPath,
        navigation,
        onClose,
        router,
        shouldForceFullReload,
      });
    },
    [auth, callbackUrl, defaultCallbackUrl, onClose, router, translations]
  );

  return {
    isLoading,
    setIsLoading,
    successMessage,
    handleLoginSuccess,
  };
}
