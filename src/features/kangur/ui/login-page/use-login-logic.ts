import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      setSuccessMessage(
        kind === 'student'
          ? translations('successStudent')
          : translations('successParent')
      );

      // Force session refresh
      clearSessionUserCache();
      
      // Update active learner state
      if (kind === 'student' && learnerId) {
        setStoredActiveLearnerId(learnerId);
      } else if (kind === 'parent') {
        clearStoredActiveLearnerId();
      }

      // Refresh auth context
      onStageChange?.('refreshing-session');
      const refreshedUser = await auth?.checkAppState?.({
        timeoutMs: LOGIN_AUTH_REFRESH_TIMEOUT_MS,
      });

      // Handle navigation
      const target = callbackOverride ?? callbackUrl ?? defaultCallbackUrl;
      const navigation = target
        ? resolveKangurLoginCallbackNavigation(target, window.location.origin)
        : null;
      const currentPath = resolveCurrentPath();
      const isSameRoute =
        Boolean(currentPath) &&
        navigation?.kind === 'router' &&
        navigation.href === currentPath;
      const shouldForceFullReload = Boolean(auth?.checkAppState) && refreshedUser === null;
      onStageChange?.('redirecting');

      await new Promise((resolve) => {
        setTimeout(resolve, LOGIN_SUCCESS_NOTICE_DELAY_MS);
      });

      if (onClose) {
        onClose();
      }
      if (navigation) {
        if (navigation.kind === 'router' && shouldForceFullReload) {
          window.location.assign(navigation.href);
        } else if (navigation.kind === 'router') {
          if (isSameRoute) {
            router.refresh();
          } else {
            router.push(navigation.href, { scroll: false });
          }
        } else {
          window.location.assign(navigation.href);
        }
        return;
      }
      if (shouldForceFullReload) {
        window.location.assign(currentPath ?? window.location.href);
        return;
      }
      router.refresh();
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
